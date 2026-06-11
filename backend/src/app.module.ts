import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { envSchema } from './config/env.config';
import { DatabaseModule } from './database/database.module';
import { SupabaseModule } from './common/supabase/supabase.module';
import { HealthModule } from './modules/health/health.module';
import { LicensesModule } from './modules/licenses/licenses.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: config => envSchema.parse(config),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60) * 1000,
          limit: configService.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    DatabaseModule,
    SupabaseModule,
    HealthModule,
    LicensesModule,
  ],
})
export class AppModule {}
