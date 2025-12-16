import { Module } from '@nestjs/common';
import { InvestorsController } from './investors.controller';
import { InvestorsService } from './investors.service';
import { DatabaseModule } from '@/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [InvestorsController],
  providers: [InvestorsService],
  exports: [InvestorsService],
})
export class InvestorsModule {}
