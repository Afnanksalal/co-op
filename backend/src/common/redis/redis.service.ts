import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    const url = this.configService.get<string>('UPSTASH_REDIS_URL');
    const token = this.configService.get<string>('UPSTASH_REDIS_TOKEN');

    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN must be configured');
    }

    this.client = new Redis({ url, token });
    this.logger.log('Upstash Redis client initialized');
  }

  onModuleDestroy(): void {
    this.logger.log('Redis connection closed');
  }

  async get<T>(key: string): Promise<T | null> {
    return this.client.get<T>(key);
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.setex(key, ttlSeconds, JSON.stringify(value));
    } else {
      await this.client.set(key, JSON.stringify(value));
    }
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  async incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  async hset(key: string, field: string, value: unknown): Promise<void> {
    await this.client.hset(key, { [field]: JSON.stringify(value) });
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    return this.client.hget<T>(key, field);
  }

  async hdel(key: string, field: string): Promise<void> {
    await this.client.hdel(key, field);
  }

  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    return this.client.hgetall<Record<string, T>>(key);
  }

  async lpush(key: string, value: string): Promise<number> {
    return this.client.lpush(key, value);
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    return this.client.lrange(key, start, stop);
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    return this.client.lrem(key, count, value);
  }

  /**
   * Check if Redis connection is healthy
   */
  async ping(): Promise<boolean> {
    try {
      await this.client.set('ping', 'pong');
      const result = await this.client.get('ping');
      return result === 'pong';
    } catch {
      return false;
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    return this.client.mget<T[]>(...keys);
  }

  /**
   * Set multiple keys at once with TTL
   */
  async mset(entries: { key: string; value: unknown; ttl?: number }[]): Promise<void> {
    const pipeline = this.client.pipeline();
    for (const entry of entries) {
      if (entry.ttl) {
        pipeline.setex(entry.key, entry.ttl, JSON.stringify(entry.value));
      } else {
        pipeline.set(entry.key, JSON.stringify(entry.value));
      }
    }
    await pipeline.exec();
  }

  /**
   * Publish message to a channel (for SSE streaming)
   * Note: Upstash Redis REST API supports publish
   */
  async publish(channel: string, message: string): Promise<number> {
    return this.client.publish(channel, message);
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
