import { Injectable, ExecutionContext, CanActivate } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { RedisService } from '@/common/redis/redis.service';

@Injectable()
export class UserThrottleGuard implements CanActivate {
  private readonly THROTTLE_PREFIX = 'throttle:';
  private readonly DEFAULT_TTL = 60; // seconds
  private readonly DEFAULT_LIMIT = 100;

  constructor(private readonly redis: RedisService) {}

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
