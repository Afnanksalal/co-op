import { Module } from '@nestjs/common';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysService } from './api-keys.service';
import { RedisModule } from '@/common/redis/redis.module';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [RedisModule, SupabaseModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysService],
  exports: [ApiKeysService],
})
export class ApiKeysModule {}
