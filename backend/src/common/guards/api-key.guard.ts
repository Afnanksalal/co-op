import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/common/redis/redis.service';
import { timingSafeEqual } from 'crypto';

interface ApiKeyRequest {
  headers: { 'x-api-key'?: string };
}

interface ApiKeyData {
  id: string;
  name: string;
  userId: string;
  scopes: string[];
  createdAt: string;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly API_KEY_PREFIX = 'apikey:';

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyRequest>();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Check master API key (for internal services) - use timing-safe comparison
    const masterKey = this.configService.get<string>('MASTER_API_KEY');
    if (masterKey && this.timingSafeEqual(apiKey, masterKey)) {
      return true;
    }

    // Check user-generated API keys from Redis
    const keyData = await this.redis.get<ApiKeyData>(`${this.API_KEY_PREFIX}${apiKey}`);
    if (!keyData) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Attach key data to request for downstream use
    (request as ApiKeyRequest & { apiKeyData: ApiKeyData }).apiKeyData = keyData;
    return true;
  }

  /**
   * Timing-safe string comparison to prevent timing attacks
   */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      // Still do a comparison to maintain constant time
      timingSafeEqual(Buffer.from(a), Buffer.from(a));
      return false;
    }
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  }
}
