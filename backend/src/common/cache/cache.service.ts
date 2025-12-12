import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

interface CacheOptions {
  ttl: number;
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultPrefix = 'cache:';

  constructor(private readonly redis: RedisService) {}

  async get(key: string, prefix?: string): Promise<unknown> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.get(fullKey);
  }

  async set(key: string, value: unknown, options: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options.prefix);
    await this.redis.set(fullKey, value, options.ttl);
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, options: CacheOptions): Promise<T> {
    const fullKey = this.buildKey(key, options.prefix);
    const cached = await this.redis.get<T>(fullKey);

    if (cached !== null) {
      this.logger.debug(`Cache hit: ${fullKey}`);
      return cached;
    }

    this.logger.debug(`Cache miss: ${fullKey}`);
    const value = await factory();
    await this.redis.set(fullKey, value, options.ttl);
    return value;
  }

  async invalidate(key: string, prefix?: string): Promise<void> {
    const fullKey = this.buildKey(key, prefix);
    await this.redis.del(fullKey);
  }

  invalidatePattern(pattern: string): void {
    // Note: Pattern invalidation requires SCAN which isn't available in Upstash REST API
    // For now, we'll log a warning. In production, use specific key invalidation.
    this.logger.warn(`Pattern invalidation not supported: ${pattern}`);
  }

  private buildKey(key: string, prefix?: string): string {
    return `${prefix ?? this.defaultPrefix}${key}`;
  }
}
