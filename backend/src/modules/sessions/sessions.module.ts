import { Module, forwardRef } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { SessionsExportService } from './sessions-export.service';
import { SessionsScheduler } from './sessions.scheduler';
import { WebhooksModule } from '@/modules/webhooks/webhooks.module';

@Module({
  imports: [forwardRef(() => WebhooksModule)],
  controllers: [SessionsController],
  providers: [SessionsService, SessionsExportService, SessionsScheduler],
  exports: [SessionsService, SessionsExportService],
})
export class SessionsModule {}
