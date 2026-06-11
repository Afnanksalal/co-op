import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { HealthCheckDto, ServiceStatus } from './dto/health-check.dto';
import * as schema from '@/database/schema';

interface ServiceCheckResult {
  status: ServiceStatus;
  latencyMs: number;
  error: string;
}

// Cache health check results for 3 seconds to prevent hammering during high traffic
// Reduced from 10s to 3s for more accurate health status during incidents
const HEALTH_CACHE_TTL_MS = 3000;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private cachedResult: HealthCheckDto | null = null;
  private cacheTimestamp = 0;

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly configService: ConfigService,
  ) {}

  async check(skipCache = false): Promise<HealthCheckDto> {
    // Return cached result if still valid (prevents hammering during high traffic)
    const now = Date.now();
    if (!skipCache && this.cachedResult && (now - this.cacheTimestamp) < HEALTH_CACHE_TTL_MS) {
      return this.cachedResult;
    }

    const services: Record<string, ServiceStatus> = {};
    const dbCheck = await this.checkDatabase();
    services.database = dbCheck.status;

    const supabaseCheck = await this.checkSupabase();
    services.supabase = supabaseCheck.status;

    const allHealthy = Object.values(services).every(s => s === ServiceStatus.HEALTHY);
    const anyHealthy = Object.values(services).some(s => s === ServiceStatus.HEALTHY);

    const result: HealthCheckDto = {
      status: allHealthy ? ServiceStatus.HEALTHY : anyHealthy ? ServiceStatus.DEGRADED : ServiceStatus.UNHEALTHY,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      services,
    };

    // Cache the result
    this.cachedResult = result;
    this.cacheTimestamp = now;

    return result;
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
        signal: AbortSignal.timeout(5000), // 5 second timeout
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

}
