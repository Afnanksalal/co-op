import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { envSchema } from './config/env.config';

// Core modules
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { LlmModule } from './common/llm/llm.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { AuditModule } from './common/audit/audit.module';
import { CacheModule } from './common/cache/cache.module';
import { EncryptionModule } from './common/encryption/encryption.module';
import { CircuitBreakerModule } from './common/circuit-breaker/circuit-breaker.module';
import { RagModule } from './common/rag/rag.module';
import { ResearchModule } from './common/research/research.module';
import { RetryModule } from './common/retry/retry.module';
import { StreamingModule } from './common/streaming/streaming.module';
import { EmailModule } from './common/email/email.module';
import { InsightsModule } from './common/insights/insights.module';

// Interceptors
import { HttpMetricsInterceptor } from './common/interceptors/http-metrics.interceptor';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';

// Feature modules
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { StartupsModule } from './modules/startups/startups.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { McpModule } from './modules/mcp/mcp.module';
import { McpServerModule } from './modules/mcp-server/mcp-server.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { NotionModule } from './modules/notion/notion.module';
import { BookmarksModule } from './modules/bookmarks/bookmarks.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { InvestorsModule } from './modules/investors/investors.module';
import { SecureDocumentsModule } from './modules/secure-documents/secure-documents.module';
import { OutreachModule } from './modules/outreach/outreach.module';
import { PitchDeckModule } from './modules/pitch-deck/pitch-deck.module';
import { CapTableModule } from './modules/cap-table/cap-table.module';

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
    EncryptionModule,
    CircuitBreakerModule,
    RagModule,
    ResearchModule,
    RetryModule,
    StreamingModule,
    EmailModule,
    InsightsModule,

    // Features
    HealthModule,
    UsersModule,
    SessionsModule,
    StartupsModule,
    AgentsModule,
    AdminModule,
    AnalyticsModule,
    McpModule,
    McpServerModule,
    ApiKeysModule,
    WebhooksModule,
    NotionModule,
    BookmarksModule,
    DocumentsModule,
    AlertsModule,
    InvestorsModule,
    SecureDocumentsModule,
    OutreachModule,
    PitchDeckModule,
    CapTableModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpMetricsInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
