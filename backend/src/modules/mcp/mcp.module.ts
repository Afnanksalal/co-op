import { Module } from '@nestjs/common';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { RedisModule } from '@/common/redis/redis.module';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [RedisModule, SupabaseModule],
  controllers: [McpController],
  providers: [McpService],
  exports: [McpService],
})
export class McpModule {}
