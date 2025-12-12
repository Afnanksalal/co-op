import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { AnalyticsEvent, EventType } from './types/events.types';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async trackEvent(event: Omit<AnalyticsEvent, 'timestamp'>): Promise<void> {
    try {
      await this.db.insert(schema.logEvents).values({
        type: event.type,
        userId: event.userId,
        sessionId: event.sessionId,
        metadata: event.metadata || {},
      });

      this.logger.debug(`Event tracked: ${event.type}`);
    } catch (error) {
      this.logger.error(`Failed to track event: ${event.type}`, error);
    }
  }

  async getEventsByUser(userId: string, limit = 100): Promise<AnalyticsEvent[]> {
    const events = await this.db
      .select()
      .from(schema.logEvents)
      .where(eq(schema.logEvents.userId, userId))
      .orderBy(desc(schema.logEvents.createdAt))
      .limit(limit);

    return events.map(e => ({
      type: e.type as EventType,
      userId: e.userId || undefined,
      sessionId: e.sessionId || undefined,
      metadata: e.metadata as Record<string, unknown>,
      timestamp: e.createdAt,
    }));
  }

  async getEventsBySession(sessionId: string): Promise<AnalyticsEvent[]> {
    const events = await this.db
      .select()
      .from(schema.logEvents)
      .where(eq(schema.logEvents.sessionId, sessionId))
      .orderBy(schema.logEvents.createdAt);

    return events.map(e => ({
      type: e.type as EventType,
      userId: e.userId || undefined,
      sessionId: e.sessionId || undefined,
      metadata: e.metadata as Record<string, unknown>,
      timestamp: e.createdAt,
    }));
  }
}
