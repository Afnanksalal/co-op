import { Injectable, Logger } from '@nestjs/common';

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryableErrors' | 'onRetry'>> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry Service with exponential backoff
 * Provides automatic retry logic for transient failures
 */
@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  /**
   * Execute a function with automatic retry on failure
   */
  async execute<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {},
  ): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | null = null;
    let delay = opts.initialDelayMs;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // Check if error is retryable
        if (!this.isRetryable(lastError, opts.retryableErrors)) {
          throw lastError;
        }

        // Don't retry on last attempt
        if (attempt === opts.maxAttempts) {
          break;
        }

        // Calculate delay with jitter
        const jitter = Math.random() * 0.3 * delay;
        const actualDelay = Math.min(delay + jitter, opts.maxDelayMs);

        this.logger.warn(
          `Attempt ${attempt}/${opts.maxAttempts} failed: ${lastError.message}. Retrying in ${Math.round(actualDelay)}ms`,
        );

        opts.onRetry?.(attempt, lastError, actualDelay);

        await this.sleep(actualDelay);
        delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
      }
    }

    this.logger.error(`All ${opts.maxAttempts} attempts failed`);
    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: Error, retryableErrors?: string[]): boolean {
    const message = error.message.toLowerCase();
    
    // Default retryable conditions
    const defaultRetryable = [
      'timeout',
      'econnreset',
      'econnrefused',
      'socket hang up',
      'network',
      'rate limit',
      '429',
      '503',
      '502',
      '504',
      'temporarily unavailable',
      'service unavailable',
    ];

    const patterns = retryableErrors || defaultRetryable;
    return patterns.some((pattern) => message.includes(pattern.toLowerCase()));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Decorator for automatic retry
 */
export function WithRetry(options: RetryOptions = {}) {
  return function (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const retryService = new RetryService();
      return retryService.execute(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
