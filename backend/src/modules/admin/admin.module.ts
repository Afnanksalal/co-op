import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { RagModule } from '@/common/rag/rag.module';
import { SupabaseModule } from '@/common/supabase/supabase.module';

@Module({
  imports: [RagModule, SupabaseModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
