import { Module } from '@nestjs/common';
import { StartupsController } from './startups.controller';
import { StartupsService } from './startups.service';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [StartupsController],
  providers: [StartupsService],
  exports: [StartupsService],
})
export class StartupsModule {}
