import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionsService } from './sessions.service';

@Injectable()
export class SessionsScheduler {
  private readonly logger = new Logger(SessionsScheduler.name);

  constructor(private readonly sessionsService: SessionsService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleSessionExpiration(): Promise<void> {
    this.logger.log('Running session expiration check...');
    const expiredCount = await this.sessionsService.expireInactiveSessions();
    this.logger.log(`Session expiration check complete. Expired: ${String(expiredCount)}`);
  }
}
