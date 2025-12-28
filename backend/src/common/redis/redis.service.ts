import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';
import { MetricsService } from '@/common/metrics/metrics.service';

// Redis operation metrics (in-memory counters for Prometheus)
interface RedisMetrics {
  operations: number;
  errors: number;
  cacheHits: number;
  cacheMisses: number;
}

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly metrics: RedisMetrics = {
    operations: 0,
    errors: 0,
    cacheHits: 0,
    cacheMisses: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly metricsService: MetricsService,
  ) {
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

  /**
   * Get Redis operation metrics for monitoring
   */
  getMetrics(): RedisMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for testing)
   */
  resetMetrics(): void {
    this.metrics.operations = 0;
    this.metrics.errors = 0;
    this.metrics.cacheHits = 0;
    this.metrics.cacheMisses = 0;
  }

  async get<T>(key: string): Promise<T | null> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('get');
    try {
      const result = await this.client.get<T>(key);
      if (result !== null) {
        this.metrics.cacheHits++;
        this.metricsService.recordRedisCacheHit();
      } else {
        this.metrics.cacheMisses++;
        this.metricsService.recordRedisCacheMiss();
      }
      return result;
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('set');
    try {
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, JSON.stringify(value));
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('del');
    try {
      await this.client.del(key);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('exists');
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<void> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('expire');
    try {
      await this.client.expire(key, ttlSeconds);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async incr(key: string): Promise<number> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('incr');
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async hset(key: string, field: string, value: unknown): Promise<void> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('hset');
    try {
      await this.client.hset(key, { [field]: JSON.stringify(value) });
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async hget<T>(key: string, field: string): Promise<T | null> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('hget');
    try {
      return await this.client.hget<T>(key, field);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async hdel(key: string, field: string): Promise<void> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('hdel');
    try {
      await this.client.hdel(key, field);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async hgetall<T>(key: string): Promise<Record<string, T> | null> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('hgetall');
    try {
      return await this.client.hgetall<Record<string, T>>(key);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async lpush(key: string, value: string): Promise<number> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('lpush');
    try {
      return await this.client.lpush(key, value);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('lrange');
    try {
      return await this.client.lrange(key, start, stop);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  async lrem(key: string, count: number, value: string): Promise<number> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('lrem');
    try {
      return await this.client.lrem(key, count, value);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
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
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('mget');
    try {
      return await this.client.mget<T[]>(...keys);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  /**
   * Set multiple keys at once with TTL
   */
  async mset(entries: { key: string; value: unknown; ttl?: number }[]): Promise<void> {
    if (entries.length === 0) return; // Guard against empty array
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('mset');
    try {
      const pipeline = this.client.pipeline();
      for (const entry of entries) {
        if (entry.ttl) {
          pipeline.setex(entry.key, entry.ttl, JSON.stringify(entry.value));
        } else {
          pipeline.set(entry.key, JSON.stringify(entry.value));
        }
      }
      await pipeline.exec();
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  /**
   * Publish message to a channel (for SSE streaming)
   * Note: Upstash Redis REST API supports publish
   */
  async publish(channel: string, message: string): Promise<number> {
    this.metrics.operations++;
    this.metricsService.recordRedisOperation('publish');
    try {
      return await this.client.publish(channel, message);
    } catch (error) {
      this.metrics.errors++;
      this.metricsService.recordRedisError();
      throw error;
    }
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): Redis {
    return this.client;
  }
}
