import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { RedisService } from '@/common/redis/redis.service';
import { HealthCheckDto, ServiceStatus } from './dto/health-check.dto';
import * as schema from '@/database/schema';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly redis: RedisService,
  ) {}

  async check(): Promise<HealthCheckDto> {
    const services: Record<string, ServiceStatus> = {};

    // Check database
    try {
      await this.db.execute(sql`SELECT 1`);
      services.database = ServiceStatus.HEALTHY;
    } catch {
      services.database = ServiceStatus.UNHEALTHY;
    }

    // Check Redis
    try {
      await this.redis.set('health:ping', 'pong', 10);
      services.redis = ServiceStatus.HEALTHY;
    } catch {
      services.redis = ServiceStatus.UNHEALTHY;
    }

    const allHealthy = Object.values(services).every(s => s === ServiceStatus.HEALTHY);
    const anyHealthy = Object.values(services).some(s => s === ServiceStatus.HEALTHY);

    return {
      status: allHealthy ? ServiceStatus.HEALTHY : anyHealthy ? ServiceStatus.DEGRADED : ServiceStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services,
    };
  }
}
