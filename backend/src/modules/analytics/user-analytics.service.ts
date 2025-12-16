import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, sql, gte, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';

/**
 * User analytics statistics response
 */
export interface UserAnalyticsStats {
  /** Total number of sessions created by the user */
  totalSessions: number;
  /** Number of currently active sessions */
  activeSessions: number;
  /** Total messages across all sessions */
  totalMessages: number;
  /** Breakdown of agent usage by type */
  agentUsage: AgentUsageItem[];
  /** Sessions created in the current month */
  sessionsThisMonth: number;
  /** Messages sent in the current month */
  messagesThisMonth: number;
  /** Average messages per session */
  averageMessagesPerSession: number;
  /** Date of most active day (ISO string) */
  mostActiveDay: string | null;
  /** Daily activity for the last 7 days */
  recentActivity: DailyActivity[];
}

export interface AgentUsageItem {
  agent: string;
  count: number;
}

export interface DailyActivity {
  date: string;
  sessions: number;
  messages: number;
}

/**
 * Service for computing user-specific analytics and usage statistics.
 * Provides insights into user activity patterns and agent usage.
 */
@Injectable()
export class UserAnalyticsService {
  private readonly logger = new Logger(UserAnalyticsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  /**
   * Get comprehensive analytics for a specific user
   * @param userId - The user's unique identifier
   * @returns User analytics statistics
   */
  async getUserStats(userId: string): Promise<UserAnalyticsStats> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Execute queries in parallel for better performance
      const [
        totalSessions,
        activeSessions,
        totalMessages,
        sessionsThisMonth,
        messagesThisMonth,
        agentUsage,
        recentActivity,
      ] = await Promise.all([
        this.getTotalSessions(userId),
        this.getActiveSessions(userId),
        this.getTotalMessages(userId),
        this.getSessionsInPeriod(userId, startOfMonth),
        this.getMessagesInPeriod(userId, startOfMonth),
        this.getAgentUsage(userId),
        this.getRecentActivity(userId, thirtyDaysAgo),
      ]);

      // Compute derived metrics
      const averageMessagesPerSession = totalSessions > 0
        ? Math.round(totalMessages / totalSessions)
        : 0;

      const mostActiveDay = this.findMostActiveDay(recentActivity);

      return {
        totalSessions,
        activeSessions,
        totalMessages,
        agentUsage,
        sessionsThisMonth,
        messagesThisMonth,
        averageMessagesPerSession,
        mostActiveDay,
        recentActivity: recentActivity.slice(-7), // Last 7 days only
      };
    } catch (error) {
      this.logger.error(`Failed to get user stats for ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get daily activity history for a user
   * @param userId - The user's unique identifier
   * @param days - Number of days to look back (default: 30)
   * @returns Array of daily activity records
   */
  async getUserHistory(userId: string, days = 30): Promise<DailyActivity[]> {
    // Validate and cap days parameter
    const validDays = Math.min(Math.max(1, days), 365);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays);

    try {
      const result = await this.db
        .select({
          date: sql<string>`date_trunc('day', ${schema.sessions.createdAt})::date::text`,
          sessions: sql<number>`count(DISTINCT ${schema.sessions.id})::int`,
          messages: sql<number>`count(${schema.sessionMessages.id})::int`,
        })
        .from(schema.sessions)
        .leftJoin(schema.sessionMessages, eq(schema.sessionMessages.sessionId, schema.sessions.id))
        .where(and(
          eq(schema.sessions.userId, userId),
          gte(schema.sessions.createdAt, startDate),
          isNull(schema.sessions.deletedAt),
        ))
        .groupBy(sql`date_trunc('day', ${schema.sessions.createdAt})`)
        .orderBy(sql`date_trunc('day', ${schema.sessions.createdAt})`);

      return result.map(r => ({
        date: r.date,
        sessions: r.sessions,
        messages: r.messages,
      }));
    } catch (error) {
      this.logger.error(`Failed to get user history for ${userId}`, error);
      throw error;
    }
  }

  // Private helper methods for cleaner code organization

  private async getTotalSessions(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.deletedAt)));
    return result[0]?.count ?? 0;
  }

  private async getActiveSessions(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessions)
      .where(and(
        eq(schema.sessions.userId, userId),
        eq(schema.sessions.status, 'active'),
        isNull(schema.sessions.deletedAt),
      ));
    return result[0]?.count ?? 0;
  }

  private async getTotalMessages(userId: string): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessionMessages)
      .innerJoin(schema.sessions, eq(schema.sessionMessages.sessionId, schema.sessions.id))
      .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.deletedAt)));
    return result[0]?.count ?? 0;
  }

  private async getSessionsInPeriod(userId: string, startDate: Date): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessions)
      .where(and(
        eq(schema.sessions.userId, userId),
        gte(schema.sessions.createdAt, startDate),
        isNull(schema.sessions.deletedAt),
      ));
    return result[0]?.count ?? 0;
  }

  private async getMessagesInPeriod(userId: string, startDate: Date): Promise<number> {
    const result = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.sessionMessages)
      .innerJoin(schema.sessions, eq(schema.sessionMessages.sessionId, schema.sessions.id))
      .where(and(
        eq(schema.sessions.userId, userId),
        gte(schema.sessionMessages.createdAt, startDate),
        isNull(schema.sessions.deletedAt),
      ));
    return result[0]?.count ?? 0;
  }

  private async getAgentUsage(userId: string): Promise<AgentUsageItem[]> {
    const result = await this.db
      .select({
        agent: schema.sessionMessages.agent,
        count: sql<number>`count(*)::int`,
      })
      .from(schema.sessionMessages)
      .innerJoin(schema.sessions, eq(schema.sessionMessages.sessionId, schema.sessions.id))
      .where(and(
        eq(schema.sessions.userId, userId),
        isNull(schema.sessions.deletedAt),
        sql`${schema.sessionMessages.agent} IS NOT NULL`,
      ))
      .groupBy(schema.sessionMessages.agent)
      .orderBy(desc(sql`count(*)`));

    return result.map(r => ({
      agent: r.agent ?? 'unknown',
      count: r.count,
    }));
  }

  private async getRecentActivity(userId: string, startDate: Date): Promise<DailyActivity[]> {
    const result = await this.db
      .select({
        date: sql<string>`date_trunc('day', ${schema.sessions.createdAt})::date::text`,
        sessions: sql<number>`count(DISTINCT ${schema.sessions.id})::int`,
        messages: sql<number>`count(${schema.sessionMessages.id})::int`,
      })
      .from(schema.sessions)
      .leftJoin(schema.sessionMessages, eq(schema.sessionMessages.sessionId, schema.sessions.id))
      .where(and(
        eq(schema.sessions.userId, userId),
        gte(schema.sessions.createdAt, startDate),
        isNull(schema.sessions.deletedAt),
      ))
      .groupBy(sql`date_trunc('day', ${schema.sessions.createdAt})`)
      .orderBy(sql`date_trunc('day', ${schema.sessions.createdAt})`);

    return result.map(r => ({
      date: r.date,
      sessions: r.sessions,
      messages: r.messages,
    }));
  }

  private findMostActiveDay(activity: DailyActivity[]): string | null {
    if (activity.length === 0) return null;
    return activity.reduce((max, curr) => 
      curr.messages > max.messages ? curr : max
    ).date;
  }
}
