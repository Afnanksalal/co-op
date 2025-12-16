import { Injectable, Inject, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { alerts, alertResults, Alert, AlertResult } from '@/database/schema/alerts.schema';
import { CreateAlertDto, UpdateAlertDto, AlertResponseDto, AlertResultResponseDto } from './dto/alert.dto';

// Pilot limit: 3 alerts per user
const PILOT_ALERT_LIMIT = 3;

@Injectable()
export class AlertsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, startupId: string | null, dto: CreateAlertDto): Promise<AlertResponseDto> {
    // Check pilot limit
    const existingAlerts = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId));

    if (existingAlerts.length >= PILOT_ALERT_LIMIT) {
      throw new BadRequestException(
        `Pilot users are limited to ${PILOT_ALERT_LIMIT} alerts. Delete an existing alert to create a new one.`
      );
    }

    const [alert] = await this.db
      .insert(alerts)
      .values({
        userId,
        startupId,
        name: dto.name,
        type: dto.type || 'competitor',
        keywords: dto.keywords,
        competitors: dto.competitors || [],
        frequency: dto.frequency || 'daily',
        emailNotify: dto.emailNotify ?? true,
      })
      .returning();

    return this.toResponseDto(alert);
  }

  async findAllByUser(userId: string): Promise<AlertResponseDto[]> {
    const userAlerts = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));

    return userAlerts.map((a: Alert) => this.toResponseDto(a));
  }

  async findOne(userId: string, alertId: string): Promise<AlertResponseDto> {
    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return this.toResponseDto(alert);
  }

  async update(userId: string, alertId: string, dto: UpdateAlertDto): Promise<AlertResponseDto> {
    const [existing] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    const [updated] = await this.db
      .update(alerts)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(alerts.id, alertId))
      .returning();

    return this.toResponseDto(updated);
  }

  async delete(userId: string, alertId: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    await this.db.delete(alerts).where(eq(alerts.id, alertId));
  }

  async getResults(userId: string, alertId: string, limit = 20): Promise<AlertResultResponseDto[]> {
    // Verify ownership
    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    const results = await this.db
      .select()
      .from(alertResults)
      .where(eq(alertResults.alertId, alertId))
      .orderBy(desc(alertResults.createdAt))
      .limit(limit);

    return results.map((r: AlertResult) => this.toResultResponseDto(r));
  }

  async markResultRead(userId: string, resultId: string): Promise<void> {
    // Get result and verify ownership through alert
    const [result] = await this.db
      .select()
      .from(alertResults)
      .where(eq(alertResults.id, resultId));

    if (!result) {
      throw new NotFoundException('Alert result not found');
    }

    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, result.alertId), eq(alerts.userId, userId)));

    if (!alert) {
      throw new ForbiddenException('Not authorized to access this result');
    }

    await this.db
      .update(alertResults)
      .set({ isRead: true })
      .where(eq(alertResults.id, resultId));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userAlerts = await this.db
      .select({ id: alerts.id })
      .from(alerts)
      .where(eq(alerts.userId, userId));

    if (userAlerts.length === 0) return 0;

    const alertIds = userAlerts.map((a: { id: string }) => a.id);
    
    // Use a single query with inArray instead of N+1 queries
    const unreadResults = await this.db
      .select()
      .from(alertResults)
      .where(and(
        inArray(alertResults.alertId, alertIds),
        eq(alertResults.isRead, false)
      ));

    return unreadResults.length;
  }

  private toResponseDto(alert: Alert): AlertResponseDto {
    return {
      id: alert.id,
      name: alert.name,
      type: alert.type as AlertResponseDto['type'],
      keywords: alert.keywords ?? [],
      competitors: alert.competitors ?? [],
      frequency: alert.frequency as AlertResponseDto['frequency'],
      isActive: alert.isActive,
      emailNotify: alert.emailNotify,
      lastCheckedAt: alert.lastCheckedAt?.toISOString() ?? null,
      lastTriggeredAt: alert.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: parseInt(alert.triggerCount, 10) || 0,
      createdAt: alert.createdAt.toISOString(),
    };
  }

  private toResultResponseDto(result: AlertResult): AlertResultResponseDto {
    return {
      id: result.id,
      alertId: result.alertId,
      title: result.title,
      summary: result.summary,
      source: result.source,
      sourceUrl: result.sourceUrl,
      relevanceScore: result.relevanceScore ? parseFloat(result.relevanceScore) : null,
      matchedKeywords: result.matchedKeywords ?? [],
      matchedCompetitor: result.matchedCompetitor,
      isRead: result.isRead,
      createdAt: result.createdAt.toISOString(),
    };
  }
}
