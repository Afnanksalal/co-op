import { Module } from '@nestjs/common';
import { CapTableController } from './cap-table.controller';
import { CapTableService } from './cap-table.service';
import { DatabaseModule } from '@/database/database.module';
import { InsightsModule } from '@/common/insights/insights.module';

@Module({
  imports: [DatabaseModule, InsightsModule],
  controllers: [CapTableController],
  providers: [CapTableService],
  exports: [CapTableService],
})
export class CapTableModule {}
