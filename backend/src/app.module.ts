import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Config
import { envSchema } from './config/env.config';

// Core modules
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './common/redis/redis.module';

// Feature modules
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AdminModule } from './modules/admin/admin.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      validate: config => envSchema.parse(config),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Core
    DatabaseModule,
    RedisModule,

    // Features
    HealthModule,
    UsersModule,
    SessionsModule,
    AgentsModule,
    AdminModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
