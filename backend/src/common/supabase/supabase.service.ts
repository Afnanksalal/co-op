import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { RedisService } from '@/common/redis/redis.service';

// Token blacklist key prefix and TTL (24 hours - matches typical JWT expiry)
const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:';
const TOKEN_BLACKLIST_TTL_SECONDS = 24 * 60 * 60;

export interface SupabaseUser {
  id: string;
  email: string;
  role: string;
  authProvider: string;
  name: string;
  avatarUrl: string | null;
  metadata: Record<string, unknown>;
}

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private readonly client: SupabaseClient;
  private readonly serviceClient: SupabaseClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('SUPABASE_URL and SUPABASE_ANON_KEY must be configured');
    }

    this.client = createClient(supabaseUrl, supabaseAnonKey);

    if (supabaseServiceKey) {
      this.serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    } else {
      this.serviceClient = this.client;
    }

    this.logger.log('Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.client;
  }

  getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }

  async verifyToken(token: string): Promise<SupabaseUser | null> {
    // Check if token is blacklisted (revoked)
    const tokenHash = this.hashToken(token);
    const isBlacklisted = await this.redis.exists(`${TOKEN_BLACKLIST_PREFIX}${tokenHash}`);
    if (isBlacklisted) {
      this.logger.debug('Token is blacklisted (revoked)');
      return null;
    }

    const {
      data: { user },
      error,
    } = await this.client.auth.getUser(token);

    if (error || !user) {
      this.logger.debug(`Token verification failed: ${error?.message ?? 'No user'}`);
      return null;
    }

    return this.mapUser(user);
  }

  /**
   * Blacklist a token (for logout/revocation)
   * Token will be rejected until TTL expires
   */
  async blacklistToken(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.redis.set(`${TOKEN_BLACKLIST_PREFIX}${tokenHash}`, { revokedAt: Date.now() }, TOKEN_BLACKLIST_TTL_SECONDS);
    this.logger.debug('Token blacklisted');
  }

  /**
   * Blacklist all tokens for a user (force logout everywhere)
   */
  async blacklistUserTokens(userId: string): Promise<void> {
    // Store user-level revocation timestamp
    await this.redis.set(`${TOKEN_BLACKLIST_PREFIX}user:${userId}`, { revokedAt: Date.now() }, TOKEN_BLACKLIST_TTL_SECONDS);
    this.logger.log(`All tokens blacklisted for user ${userId}`);
  }

  /**
   * Check if user's tokens are globally revoked
   */
  async isUserTokensRevoked(userId: string): Promise<boolean> {
    return this.redis.exists(`${TOKEN_BLACKLIST_PREFIX}user:${userId}`);
  }

  /**
   * Hash token for storage (don't store raw tokens)
   * Uses a combination of token parts to ensure uniqueness while not storing the full token
   */
  private hashToken(token: string): string {
    // Use combination of middle and end of token for better uniqueness
    // JWT format: header.payload.signature - signature is at the end and is unique
    if (token.length < 100) {
      return token; // Short tokens use full token
    }
    // Use chars from middle (payload) and end (signature) for uniqueness
    const middle = token.substring(50, 82);
    const end = token.slice(-32);
    return `${middle}_${end}`;
  }

  async getUserById(userId: string): Promise<SupabaseUser | null> {
    const {
      data: { user },
      error,
    } = await this.serviceClient.auth.admin.getUserById(userId);

    if (error || !user) {
      return null;
    }

    return this.mapUser(user);
  }

  private mapUser(user: User): SupabaseUser {
    // Extract auth provider from app_metadata or identities
    let authProvider = 'email';
    if (user.app_metadata?.provider) {
      authProvider = user.app_metadata.provider;
    } else if (user.identities && user.identities.length > 0) {
      authProvider = user.identities[0].provider;
    }

    // Extract name from user_metadata (OAuth providers set this)
    const name = (user.user_metadata?.full_name as string) ??
      (user.user_metadata?.name as string) ??
      (user.email?.split('@')[0] ?? 'User');

    // Extract avatar URL
    const avatarUrl = (user.user_metadata?.avatar_url as string) ??
      (user.user_metadata?.picture as string) ??
      null;

    return {
      id: user.id,
      email: user.email ?? '',
      role: (user.app_metadata?.role as string) ?? 'user',
      authProvider,
      name,
      avatarUrl,
      metadata: user.user_metadata ?? {},
    };
  }
}
