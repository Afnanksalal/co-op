import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerException } from '@nestjs/throttler';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class UserThrottleGuard extends ThrottlerGuard {
  private redis: RedisService;
  private readonly THROTTLE_PREFIX = 'throttle:';
  private readonly DEFAULT_TTL = 60; // seconds
  private readonly DEFAULT_LIMIT = 100;

  constructor(redis: RedisService) {
    super([], {} as never, {} as never);
    this.redis = redis;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user?: { id: string };
      ip: string;
      path: string;
    }>();

    // Use user ID if authenticated, otherwise use IP
    const identifier = request.user?.id ?? request.ip;
    const key = `${this.THROTTLE_PREFIX}${identifier}:${request.path}`;

    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, this.DEFAULT_TTL);
    }

    if (current > this.DEFAULT_LIMIT) {
      throw new ThrottlerException('Too many requests');
    }

    return true;
  }
}
