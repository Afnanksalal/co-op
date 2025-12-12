import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import { RedisService } from '@/common/redis/redis.service';
import { CreateApiKeyDto, ApiKeyResponseDto, ApiKeyCreatedResponseDto } from './dto';

interface StoredApiKey {
  id: string;
  name: string;
  userId: string;
  scopes: string[];
  keyHash: string;
  keyPrefix: string;
  rawKeyForRevocation: string; // Store encrypted/hashed reference for revocation
  createdAt: string;
  lastUsedAt: string;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);
  private readonly API_KEY_PREFIX = 'apikey:';
  private readonly USER_KEYS_PREFIX = 'user:apikeys:';
  private readonly KEY_TTL = 365 * 24 * 60 * 60; // 1 year

  constructor(private readonly redis: RedisService) {}

  async create(userId: string, dto: CreateApiKeyDto): Promise<ApiKeyCreatedResponseDto> {
    const id = randomBytes(8).toString('hex');
    const rawKey = `coop_${randomBytes(32).toString('hex')}`;
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const storedKey: StoredApiKey = {
      id,
      name: dto.name,
      userId,
      scopes: dto.scopes,
      keyHash,
      keyPrefix,
      rawKeyForRevocation: rawKey, // Store for revocation lookup
      createdAt: new Date().toISOString(),
      lastUsedAt: new Date().toISOString(),
    };

    // Store by raw key for lookup during authentication
    await this.redis.set(`${this.API_KEY_PREFIX}${rawKey}`, {
      id: storedKey.id,
      name: storedKey.name,
      userId: storedKey.userId,
      scopes: storedKey.scopes,
      createdAt: storedKey.createdAt,
    }, this.KEY_TTL);

    // Store by ID for management (includes raw key for revocation)
    await this.redis.hset(`${this.USER_KEYS_PREFIX}${userId}`, id, storedKey);

    return {
      id,
      name: dto.name,
      key: rawKey,
      keyPrefix,
      scopes: dto.scopes,
      createdAt: new Date(storedKey.createdAt),
      lastUsedAt: new Date(storedKey.lastUsedAt),
    };
  }

  async findByUser(userId: string): Promise<ApiKeyResponseDto[]> {
    const keys = await this.redis.hgetall<StoredApiKey>(`${this.USER_KEYS_PREFIX}${userId}`);
    if (!keys) {
      return [];
    }

    return Object.values(keys).map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      createdAt: new Date(key.createdAt),
      lastUsedAt: new Date(key.lastUsedAt),
    }));
  }

  async revoke(userId: string, keyId: string): Promise<void> {
    const keys = await this.redis.hgetall<StoredApiKey>(`${this.USER_KEYS_PREFIX}${userId}`);
    const keyData = keys?.[keyId];

    if (!keyData) {
      throw new NotFoundException('API key not found');
    }

    // Remove from API key lookup (using stored raw key)
    if (keyData.rawKeyForRevocation) {
      await this.redis.del(`${this.API_KEY_PREFIX}${keyData.rawKeyForRevocation}`);
    }

    // Remove from user's keys
    await this.redis.hdel(`${this.USER_KEYS_PREFIX}${userId}`, keyId);

    this.logger.log(`API key ${keyId} revoked for user ${userId}`);
  }

  async updateLastUsed(rawKey: string): Promise<void> {
    const keyData = await this.redis.get<StoredApiKey>(`${this.API_KEY_PREFIX}${rawKey}`);
    if (keyData) {
      await this.redis.hset(
        `${this.USER_KEYS_PREFIX}${keyData.userId}`,
        keyData.id,
        { ...keyData, lastUsedAt: new Date().toISOString() },
      );
    }
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
