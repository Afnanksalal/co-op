import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { RedisService } from '@/common/redis/redis.service';
import { HealthCheckDto, ServiceStatus } from './dto/health-check.dto';
import * as schema from '@/database/schema';

interface ServiceCheckResult {
  status: ServiceStatus;
  latencyMs: number;
  error: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly redis: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async check(): Promise<HealthCheckDto> {
    const services: Record<string, ServiceStatus> = {};
    const details: Record<string, ServiceCheckResult> = {};

    // Check database
    const dbCheck = await this.checkDatabase();
    services.database = dbCheck.status;
    details.database = dbCheck;

    // Check Redis
    const redisCheck = await this.checkRedis();
    services.redis = redisCheck.status;
    details.redis = redisCheck;

    // Check Supabase
    const supabaseCheck = await this.checkSupabase();
    services.supabase = supabaseCheck.status;
    details.supabase = supabaseCheck;

    // Check LLM providers
    const llmCheck = this.checkLlmProviders();
    services.llm = llmCheck.status;
    details.llm = llmCheck;

    const allHealthy = Object.values(services).every(s => s === ServiceStatus.HEALTHY);
    const anyHealthy = Object.values(services).some(s => s === ServiceStatus.HEALTHY);

    return {
      status: allHealthy ? ServiceStatus.HEALTHY : anyHealthy ? ServiceStatus.DEGRADED : ServiceStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services,
    };
  }

  private async checkDatabase(): Promise<ServiceCheckResult> {
    const start = Date.now();
    try {
      await this.db.execute(sql`SELECT 1`);
      return { status: ServiceStatus.HEALTHY, latencyMs: Date.now() - start, error: '' };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Database health check failed: ${error}`);
      return { status: ServiceStatus.UNHEALTHY, latencyMs: Date.now() - start, error };
    }
  }

  private async checkRedis(): Promise<ServiceCheckResult> {
    const start = Date.now();
    try {
      await this.redis.set('health:ping', 'pong', 10);
      const result = await this.redis.get<string>('health:ping');
      if (result !== 'pong') {
        return { status: ServiceStatus.DEGRADED, latencyMs: Date.now() - start, error: 'Read/write mismatch' };
      }
      return { status: ServiceStatus.HEALTHY, latencyMs: Date.now() - start, error: '' };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Redis health check failed: ${error}`);
      return { status: ServiceStatus.UNHEALTHY, latencyMs: Date.now() - start, error };
    }
  }

  private async checkSupabase(): Promise<ServiceCheckResult> {
    const start = Date.now();
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      return { status: ServiceStatus.UNHEALTHY, latencyMs: 0, error: 'SUPABASE_URL not configured' };
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: { 'apikey': this.configService.get<string>('SUPABASE_ANON_KEY') ?? '' },
      });
      if (response.ok || response.status === 400) {
        return { status: ServiceStatus.HEALTHY, latencyMs: Date.now() - start, error: '' };
      }
      return { status: ServiceStatus.DEGRADED, latencyMs: Date.now() - start, error: `HTTP ${String(response.status)}` };
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Supabase health check failed: ${error}`);
      return { status: ServiceStatus.UNHEALTHY, latencyMs: Date.now() - start, error };
    }
  }

  private checkLlmProviders(): ServiceCheckResult {
    const start = Date.now();
    const groqKey = this.configService.get<string>('GROQ_API_KEY');
    const googleKey = this.configService.get<string>('GOOGLE_AI_API_KEY');
    const hfKey = this.configService.get<string>('HUGGINGFACE_API_KEY');

    const hasAnyProvider = groqKey ?? googleKey ?? hfKey;
    if (!hasAnyProvider) {
      return { status: ServiceStatus.UNHEALTHY, latencyMs: 0, error: 'No LLM providers configured' };
    }

    return {
      status: ServiceStatus.HEALTHY,
      latencyMs: Date.now() - start,
      error: '',
    };
  }
}
