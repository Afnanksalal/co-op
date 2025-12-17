import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

/**
 * Cache TTL constants (in seconds)
 */
export const CACHE_TTL = {
  SHORT: 60, // 1 minute - for rapidly changing data
  MEDIUM: 300, // 5 minutes - for user sessions, API responses
  LONG: 3600, // 1 hour - for user profiles, startup data
  DAY: 86400, // 24 hours - for static data
} as const;

/**
 * Cache key prefixes
 */
export const CACHE_PREFIX = {
  USER: 'user:',
  STARTUP: 'startup:',
  SESSION: 'session:',
  AGENT: 'agent:',
  MCP: 'mcp:',
  RATE_LIMIT: 'rate:',
  API_KEY: 'apikey:',
} as const;

interface CacheOptions {
  ttl: number;
  prefix?: string;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly defaultPrefix = 'cache:';

  constructor(private readonly redis: RedisService) {}

  /**
   * Get cached value
   */
  async get<T>(key: string, prefix?: string): Promise<T | null> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.get<T>(fullKey);
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: unknown, options: CacheOptions): Promise<void> {
    const fullKey = this.buildKey(key, options.prefix);
    await this.redis.set(fullKey, value, options.ttl);
    this.logger.debug(`Cache set: ${fullKey} (TTL: ${String(options.ttl)}s)`);
  }

  /**
   * Get or set - returns cached value or fetches and caches
   */
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

  /**
   * Invalidate single key
   */
  async invalidate(key: string, prefix?: string): Promise<void> {
    const fullKey = this.buildKey(key, prefix);
    await this.redis.del(fullKey);
    this.logger.debug(`Cache invalidated: ${fullKey}`);
  }

  /**
   * Check if key exists
   */
  async exists(key: string, prefix?: string): Promise<boolean> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.exists(fullKey);
  }

  /**
   * Extend TTL on existing key
   */
  async touch(key: string, ttl: number, prefix?: string): Promise<void> {
    const fullKey = this.buildKey(key, prefix);
    await this.redis.expire(fullKey, ttl);
  }

  /**
   * Increment counter (for rate limiting)
   */
  async increment(key: string, prefix?: string): Promise<number> {
    const fullKey = this.buildKey(key, prefix);
    return this.redis.incr(fullKey);
  }

  /**
   * Get user cache key
   */
  userKey(userId: string): string {
    return `${CACHE_PREFIX.USER}${userId}`;
  }

  /**
   * Get startup cache key
   */
  startupKey(startupId: string): string {
    return `${CACHE_PREFIX.STARTUP}${startupId}`;
  }

  /**
   * Get session cache key
   */
  sessionKey(sessionId: string): string {
    return `${CACHE_PREFIX.SESSION}${sessionId}`;
  }

  /**
   * Get API key cache key
   */
  apiKeyKey(keyHash: string): string {
    return `${CACHE_PREFIX.API_KEY}${keyHash}`;
  }

  /**
   * Build full cache key
   */
  private buildKey(key: string, prefix?: string): string {
    return `${prefix ?? this.defaultPrefix}${key}`;
  }

  /**
   * Get multiple cached values at once (batch operation)
   */
  async mget<T>(keys: string[], prefix?: string): Promise<(T | null)[]> {
    if (keys.length === 0) return [];
    const fullKeys = keys.map(k => this.buildKey(k, prefix));
    return this.redis.mget<T>(fullKeys);
  }

  /**
   * Set multiple cached values at once (batch operation)
   */
  async mset(entries: { key: string; value: unknown; ttl: number }[], prefix?: string): Promise<void> {
    if (entries.length === 0) return;
    const redisEntries = entries.map(e => ({
      key: this.buildKey(e.key, prefix),
      value: e.value,
      ttl: e.ttl,
    }));
    await this.redis.mset(redisEntries);
    this.logger.debug(`Cache batch set: ${entries.length} keys`);
  }

  /**
   * Invalidate multiple keys at once
   */
  async invalidateMany(keys: string[], prefix?: string): Promise<void> {
    if (keys.length === 0) return;
    await Promise.all(keys.map(k => this.invalidate(k, prefix)));
    this.logger.debug(`Cache batch invalidated: ${keys.length} keys`);
  }

  /**
   * Get or set multiple values (batch operation)
   * Returns results in same order as keys
   */
  async mgetOrSet<T>(
    keys: string[],
    factory: (missingKeys: string[]) => Promise<Map<string, T>>,
    options: CacheOptions,
  ): Promise<(T | null)[]> {
    if (keys.length === 0) return [];

    // Get all from cache
    const cached = await this.mget<T>(keys, options.prefix);
    
    // Find missing keys
    const missingKeys: string[] = [];
    const missingIndices: number[] = [];
    cached.forEach((value, index) => {
      if (value === null) {
        missingKeys.push(keys[index]);
        missingIndices.push(index);
      }
    });

    // If all cached, return immediately
    if (missingKeys.length === 0) {
      this.logger.debug(`Cache batch hit: all ${keys.length} keys`);
      return cached;
    }

    this.logger.debug(`Cache batch: ${keys.length - missingKeys.length} hits, ${missingKeys.length} misses`);

    // Fetch missing values
    const fetched = await factory(missingKeys);

    // Cache the fetched values
    const toCache: { key: string; value: unknown; ttl: number }[] = [];
    for (const [key, value] of fetched) {
      toCache.push({ key, value, ttl: options.ttl });
    }
    if (toCache.length > 0) {
      await this.mset(toCache, options.prefix);
    }

    // Merge results
    const results = [...cached];
    for (let i = 0; i < missingKeys.length; i++) {
      const key = missingKeys[i];
      const index = missingIndices[i];
      results[index] = fetched.get(key) ?? null;
    }

    return results;
  }
}
