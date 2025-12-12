import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsScheduler } from './sessions.scheduler';

@Module({
  controllers: [SessionsController],
  providers: [SessionsService, SessionsScheduler],
  exports: [SessionsService],
})
export class SessionsModule {}
