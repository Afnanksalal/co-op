import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { envSchema } from './config/env.config';

// Core modules
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { LlmModule } from './common/llm/llm.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache/cache.module';

// Feature modules
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { StartupsModule } from './modules/startups/startups.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { McpModule } from './modules/mcp/mcp.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: config => envSchema.parse(config),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    ScheduleModule.forRoot(),

    // Core
    DatabaseModule,
    RedisModule,
    SupabaseModule,
    LlmModule,
    MetricsModule,
    AuditModule,
    CacheModule,

    // Features
    HealthModule,
    UsersModule,
    SessionsModule,
    StartupsModule,
    AgentsModule,
    AdminModule,
    AnalyticsModule,
    McpModule,
    ApiKeysModule,
    WebhooksModule,
  ],
})
export class AppModule {}
