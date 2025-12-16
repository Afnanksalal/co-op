import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { UserAnalyticsController } from './user-analytics.controller';
import { AnalyticsService } from './analytics.service';
import { UserAnalyticsService } from './user-analytics.service';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AnalyticsController, UserAnalyticsController],
  providers: [AnalyticsService, UserAnalyticsService],
  exports: [AnalyticsService, UserAnalyticsService],
})
export class AnalyticsModule {}
