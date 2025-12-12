import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService) {
    this.client = new Redis({
      url: this.configService.get<string>('UPSTASH_REDIS_URL')!,
      token: this.configService.get<string>('UPSTASH_REDIS_TOKEN')!,
    });
    this.logger.log('Upstash Redis client initialized');
  }

  async onModuleDestroy() {
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
}
