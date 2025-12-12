import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, sql, gte, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { AnalyticsEvent, EventType } from './types/events.types';

type TrackEventInput = Omit<AnalyticsEvent, 'timestamp'>;

interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalStartups: number;
  activeSessions: number;
  eventsToday: number;
  eventsByType: { type: string; count: number }[];
}

interface EventAggregation {
  date: string;
  count: number;
  type: string;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async trackEvent(event: TrackEventInput): Promise<void> {
    try {
      await this.db.insert(schema.logEvents).values({
        type: event.type,
        userId: event.userId ?? null,
        sessionId: event.sessionId ?? null,
        metadata: event.metadata ?? {},
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
      userId: e.userId ?? undefined,
      sessionId: e.sessionId ?? undefined,
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
      userId: e.userId ?? undefined,
      sessionId: e.sessionId ?? undefined,
      metadata: e.metadata as Record<string, unknown>,
      timestamp: e.createdAt,
    }));
  }

  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total users (not deleted)
    const usersResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.users)
      .where(isNull(schema.users.deletedAt));
    const totalUsers = usersResult[0]?.count ?? 0;

    // Get total sessions (not deleted)
    const sessionsResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessions)
      .where(isNull(schema.sessions.deletedAt));
    const totalSessions = sessionsResult[0]?.count ?? 0;

    // Get active sessions
    const activeSessionsResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessions)
      .where(and(eq(schema.sessions.status, 'active'), isNull(schema.sessions.deletedAt)));
    const activeSessions = activeSessionsResult[0]?.count ?? 0;

    // Get total startups (not deleted)
    const startupsResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.startups)
      .where(isNull(schema.startups.deletedAt));
    const totalStartups = startupsResult[0]?.count ?? 0;

    // Get events today
    const eventsTodayResult = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.logEvents)
      .where(gte(schema.logEvents.createdAt, today));
    const eventsToday = eventsTodayResult[0]?.count ?? 0;

    // Get events by type (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const eventsByTypeResult = await this.db
      .select({
        type: schema.logEvents.type,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.logEvents)
      .where(gte(schema.logEvents.createdAt, sevenDaysAgo))
      .groupBy(schema.logEvents.type)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    return {
      totalUsers,
      totalSessions,
      totalStartups,
      activeSessions,
      eventsToday,
      eventsByType: eventsByTypeResult,
    };
  }

  async getEventAggregation(days = 7): Promise<EventAggregation[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const result = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${schema.logEvents.createdAt})::date::text`,
        type: schema.logEvents.type,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.logEvents)
      .where(gte(schema.logEvents.createdAt, startDate))
      .groupBy(sql`date_trunc('day', ${schema.logEvents.createdAt})`, schema.logEvents.type)
      .orderBy(sql`date_trunc('day', ${schema.logEvents.createdAt})`);

    return result;
  }
}
