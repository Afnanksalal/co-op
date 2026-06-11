import { Module } from '@nestjs/common';
import { SupabaseModule } from '@/common/supabase/supabase.module';
import { LicensesController } from './licenses.controller';
import { LicensesService } from './licenses.service';

@Module({
  imports: [SupabaseModule],
  controllers: [LicensesController],
  providers: [LicensesService],
  exports: [LicensesService],
})
export class LicensesModule {}
