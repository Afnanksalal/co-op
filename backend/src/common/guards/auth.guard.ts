import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject, forwardRef, Logger, OnModuleDestroy } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { SupabaseService, SupabaseUser } from '@/common/supabase/supabase.service';
import { UsersService } from '@/modules/users/users.service';

export interface AuthenticatedUser extends SupabaseUser {
  onboardingCompleted: boolean;
  startupId: string | null;
}

interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: AuthenticatedUser;
}

/**
 * Decorator to skip auth rate limiting for high-frequency endpoints (SSE, polling)
 * Use sparingly - only for endpoints that are already rate-limited at the application level
 */
export const SKIP_AUTH_RATE_LIMIT = 'skipAuthRateLimit';
export const SkipAuthRateLimit = () => 
  (target: object, _propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(SKIP_AUTH_RATE_LIMIT, true, descriptor.value);
    } else {
      Reflect.defineMetadata(SKIP_AUTH_RATE_LIMIT, true, target);
    }
    return descriptor ?? target;
  };

// Rate limiting for token verification (prevents brute force attacks)
// These limits are for FAILED auth attempts, not successful ones
const TOKEN_VERIFY_WINDOW_MS = 60000; // 1 minute window
const TOKEN_VERIFY_MAX_FAILED_ATTEMPTS = 10; // Max 10 FAILED attempts per IP per minute
const ipFailedAttempts = new Map<string, { count: number; resetAt: number }>();

// Successful auth cache to avoid re-verifying same token repeatedly
// Key: token hash (first 16 chars), Value: { userId, expiresAt }
const TOKEN_CACHE_TTL_MS = 30000; // Cache valid tokens for 30 seconds
const tokenCache = new Map<string, { userId: string; user: AuthenticatedUser; expiresAt: number }>();

// Cleanup interval reference for proper cleanup on module destroy
let cleanupIntervalId: NodeJS.Timeout | null = null;

// Start cleanup interval (only once)
function startCleanupInterval(): void {
  if (cleanupIntervalId) return;
  cleanupIntervalId = setInterval(() => {
    const now = Date.now();
    for (const [key, value] of tokenCache) {
      if (now > value.expiresAt) {
        tokenCache.delete(key);
      }
    }
    for (const [key, value] of ipFailedAttempts) {
      if (now > value.resetAt) {
        ipFailedAttempts.delete(key);
      }
    }
  }, 60000); // Cleanup every minute
}

// Stop cleanup interval
function stopCleanupInterval(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Start cleanup on module load
startCleanupInterval();

@Injectable()
export class AuthGuard implements CanActivate, OnModuleDestroy {
  private readonly logger = new Logger(AuthGuard.name);
  private readonly isProduction: boolean;
  private readonly trustProxy: boolean;

  constructor(
    private readonly supabase: SupabaseService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly configService: ConfigService,
    private readonly reflector: Reflector,
  ) {
    this.isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    // Trust proxy headers in production (behind Render/Vercel/Cloudflare)
    this.trustProxy = this.isProduction;
  }

  /**
   * Cleanup interval on module destroy to prevent memory leaks
   */
  onModuleDestroy(): void {
    stopCleanupInterval();
    // Clear caches
    tokenCache.clear();
    ipFailedAttempts.clear();
  }

  /**
   * Get a cache key for the token
   * CRITICAL: Must use enough of the token to prevent collisions between different users
   * JWT tokens have format: header.payload.signature - the signature is unique per token
   */
  private getTokenCacheKey(token: string): string {
    // Use first 64 chars + last 32 chars to ensure uniqueness
    // This covers part of the payload and the unique signature
    if (token.length < 100) {
      return token; // Short tokens use full token as key
    }
    return `${token.substring(0, 64)}_${token.slice(-32)}`;
  }

  /**
   * Check if we have a cached valid auth for this token
   * Also validates that the cached user ID matches the token's user
   */
  private getCachedAuth(token: string): AuthenticatedUser | null {
    const key = this.getTokenCacheKey(token);
    const cached = tokenCache.get(key);
    
    if (cached && Date.now() < cached.expiresAt) {
      return cached.user;
    }
    
    // Expired or not found
    if (cached) {
      tokenCache.delete(key);
    }
    return null;
  }

  /**
   * Cache a successful auth result
   */
  private cacheAuth(token: string, user: AuthenticatedUser): void {
    const key = this.getTokenCacheKey(token);
    tokenCache.set(key, {
      userId: user.id,
      user,
      expiresAt: Date.now() + TOKEN_CACHE_TTL_MS,
    });
  }

  /**
   * Check rate limit for FAILED token verification attempts only
   * Successful auths don't count against the limit
   */
  private checkFailedAuthRateLimit(ip: string): void {
    const now = Date.now();
    const record = ipFailedAttempts.get(ip);
    
    if (!record || now > record.resetAt) {
      // New window or expired - no failures yet, allow
      return;
    }
    
    if (record.count >= TOKEN_VERIFY_MAX_FAILED_ATTEMPTS) {
      this.logger.warn(`Auth rate limit exceeded for IP: ${ip.slice(0, 20)}... (${record.count} failed attempts)`);
      throw new UnauthorizedException('Too many failed authentication attempts. Please try again later.');
    }
  }

  /**
   * Record a failed auth attempt
   */
  private recordFailedAuth(ip: string): void {
    const now = Date.now();
    const record = ipFailedAttempts.get(ip);
    
    if (!record || now > record.resetAt) {
      ipFailedAttempts.set(ip, { count: 1, resetAt: now + TOKEN_VERIFY_WINDOW_MS });
    } else {
      record.count++;
    }
  }

  /**
   * Extract client IP from request with proxy validation
   * Only trusts x-forwarded-for in production behind known proxies
   */
  private getClientIp(request: AuthenticatedRequest & { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
    // Only trust forwarded headers if we're behind a trusted proxy
    if (this.trustProxy) {
      const forwarded = request.headers['x-forwarded-for'];
      if (forwarded) {
        // Take the first IP (client IP) from the chain
        const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
        const trimmedIp = ip?.trim();
        if (trimmedIp && this.isValidIp(trimmedIp)) {
          return trimmedIp;
        }
      }
    }
    return request.ip ?? 'unknown';
  }

  /**
   * Basic IP validation to prevent header injection
   */
  private isValidIp(ip: string): boolean {
    // IPv4 pattern
    const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
    // IPv6 pattern (simplified)
    const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    return ipv4Pattern.test(ip) || ipv6Pattern.test(ip);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & { 
      ip?: string; 
      headers: Record<string, string | string[] | undefined>;
      query?: { token?: string };
    }>();
    
    // Try to get token from Authorization header first
    let token: string | undefined;
    const authHeader = request.headers.authorization;
    
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      // Fallback to query parameter for SSE endpoints (EventSource can't send headers)
      // Only allow this for endpoints that explicitly skip auth rate limiting (SSE/streaming)
      const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_RATE_LIMIT, [
        context.getHandler(),
        context.getClass(),
      ]);
      
      if (skipRateLimit && request.query?.token) {
        token = request.query.token;
        this.logger.debug('Using query parameter token for SSE endpoint');
      }
    }

    if (!token) {
      this.logger.warn('Missing or invalid authorization header');
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const clientIp = this.getClientIp(request);

    // Check if this endpoint skips auth rate limiting (for SSE/polling endpoints)
    const skipRateLimit = this.reflector.getAllAndOverride<boolean>(SKIP_AUTH_RATE_LIMIT, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Check for cached auth first (avoids Supabase call for repeated requests)
    const cachedUser = this.getCachedAuth(token);
    if (cachedUser) {
      request.user = cachedUser;
      return true;
    }

    // Check rate limit for failed attempts (only if not skipped)
    if (!skipRateLimit) {
      this.checkFailedAuthRateLimit(clientIp);
    }

    const supabaseUser = await this.supabase.verifyToken(token);

    if (!supabaseUser) {
      // Record failed attempt for rate limiting
      this.recordFailedAuth(clientIp);
      this.logger.warn('Token verification failed - invalid or expired token');
      throw new UnauthorizedException('Invalid or expired token');
    }

    this.logger.debug(`Authenticated user: ${supabaseUser.id} (${supabaseUser.email})`);

    // Sync user to our database (creates if not exists)
    const dbUser = await this.usersService.findOrCreateFromSupabase(
      supabaseUser.id,
      supabaseUser.email,
      supabaseUser.name,
      supabaseUser.authProvider,
    );

    // Merge Supabase user info with our database info
    const authenticatedUser: AuthenticatedUser = {
      ...supabaseUser,
      onboardingCompleted: dbUser.onboardingCompleted,
      startupId: dbUser.startup?.id ?? null,
    };

    // Cache the successful auth
    this.cacheAuth(token, authenticatedUser);

    request.user = authenticatedUser;
    return true;
  }
}
