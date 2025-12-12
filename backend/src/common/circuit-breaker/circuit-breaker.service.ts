import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
}

interface CircuitBreakerStats {
  state: string;
  failures: number;
  successes: number;
  fallbacks: number;
  timeouts: number;
  cacheHits: number;
  cacheMisses: number;
  percentile95: number;
  percentile99: number;
}

type AsyncFunction<T> = (...args: unknown[]) => Promise<T>;

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private readonly breakers = new Map<string, CircuitBreaker>();

  private readonly defaultOptions: CircuitBreakerOptions = {
    timeout: 10000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
    volumeThreshold: 5,
  };

  create<T>(
    name: string,
    fn: AsyncFunction<T>,
    options?: Partial<CircuitBreakerOptions>,
  ): CircuitBreaker<unknown[], T> {
    const existingBreaker = this.breakers.get(name);
    if (existingBreaker) {
      return existingBreaker as CircuitBreaker<unknown[], T>;
    }

    const mergedOptions = { ...this.defaultOptions, ...options };

    const breaker = new CircuitBreaker(fn, {
      timeout: mergedOptions.timeout,
      errorThresholdPercentage: mergedOptions.errorThresholdPercentage,
      resetTimeout: mergedOptions.resetTimeout,
      volumeThreshold: mergedOptions.volumeThreshold,
    });

    breaker.on('open', () => {
      this.logger.warn(`Circuit breaker "${name}" opened`);
    });

    breaker.on('halfOpen', () => {
      this.logger.log(`Circuit breaker "${name}" half-open`);
    });

    breaker.on('close', () => {
      this.logger.log(`Circuit breaker "${name}" closed`);
    });

    breaker.on('fallback', () => {
      this.logger.debug(`Circuit breaker "${name}" fallback triggered`);
    });

    breaker.on('timeout', () => {
      this.logger.warn(`Circuit breaker "${name}" timeout`);
    });

    this.breakers.set(name, breaker as CircuitBreaker);
    return breaker;
  }

  async execute<T>(name: string, fn: AsyncFunction<T>, fallback?: () => T): Promise<T> {
    const existingBreaker = this.breakers.get(name) as CircuitBreaker<unknown[], T> | undefined;
    const breaker = existingBreaker ?? this.create(name, fn);

    if (fallback) {
      breaker.fallback(fallback);
    }

    return breaker.fire();
  }

  getStats(name: string): CircuitBreakerStats | null {
    const breaker = this.breakers.get(name);
    if (!breaker) {
      return null;
    }

    const stats = breaker.stats;
    const statusName = breaker.opened ? 'open' : breaker.halfOpen ? 'half-open' : 'closed';
    return {
      state: statusName,
      failures: stats.failures,
      successes: stats.successes,
      fallbacks: stats.fallbacks,
      timeouts: stats.timeouts,
      cacheHits: stats.cacheHits,
      cacheMisses: stats.cacheMisses,
      percentile95: stats.latencyMean,
      percentile99: stats.latencyMean,
    };
  }

  getAllStats(): Record<string, CircuitBreakerStats> {
    const allStats: Record<string, CircuitBreakerStats> = {};
    for (const [name] of this.breakers) {
      const stats = this.getStats(name);
      if (stats) {
        allStats[name] = stats;
      }
    }
    return allStats;
  }

  isOpen(name: string): boolean {
    const breaker = this.breakers.get(name);
    return breaker ? breaker.opened : false;
  }
}
