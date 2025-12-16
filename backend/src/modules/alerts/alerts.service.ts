import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import {
  alerts,
  alertResults,
  alertKeywords,
  alertCompetitors,
  alertResultMatchedKeywords,
} from '@/database/schema/alerts.schema';
import {
  CreateAlertDto,
  UpdateAlertDto,
  AlertResponseDto,
  AlertResultResponseDto,
} from './dto/alert.dto';

// Pilot limit: 3 alerts per user
const PILOT_ALERT_LIMIT = 3;

@Injectable()
export class AlertsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(
    userId: string,
    startupId: string | null,
    dto: CreateAlertDto,
  ): Promise<AlertResponseDto> {
    // Check pilot limit
    const existingAlerts = await this.db.select().from(alerts).where(eq(alerts.userId, userId));

    if (existingAlerts.length >= PILOT_ALERT_LIMIT) {
      throw new BadRequestException(
        `Pilot users are limited to ${PILOT_ALERT_LIMIT} alerts. Delete an existing alert to create a new one.`,
      );
    }

    // Insert alert
    const [alert] = await this.db
      .insert(alerts)
      .values({
        userId,
        startupId,
        name: dto.name,
        type: dto.type || 'competitor',
        frequency: dto.frequency || 'daily',
        emailNotify: dto.emailNotify ?? true,
      })
      .returning();

    // Insert keywords
    if (dto.keywords && dto.keywords.length > 0) {
      await this.db
        .insert(alertKeywords)
        .values(dto.keywords.map((keyword) => ({ alertId: alert.id, keyword })));
    }

    // Insert competitors
    if (dto.competitors && dto.competitors.length > 0) {
      await this.db
        .insert(alertCompetitors)
        .values(dto.competitors.map((competitor) => ({ alertId: alert.id, competitor })));
    }

    return this.buildAlertResponseDto(alert);
  }

  async findAllByUser(userId: string): Promise<AlertResponseDto[]> {
    const userAlerts = await this.db
      .select()
      .from(alerts)
      .where(eq(alerts.userId, userId))
      .orderBy(desc(alerts.createdAt));

    return this.buildAlertResponseDtosBatch(userAlerts);
  }

  async findOne(userId: string, alertId: string): Promise<AlertResponseDto> {
    const [alert] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    return this.buildAlertResponseDto(alert);
  }

  async update(userId: string, alertId: string, dto: UpdateAlertDto): Promise<AlertResponseDto> {
    const [existing] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    // Update base alert data
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.frequency !== undefined) updateData.frequency = dto.frequency;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.emailNotify !== undefined) updateData.emailNotify = dto.emailNotify;

    await this.db.update(alerts).set(updateData).where(eq(alerts.id, alertId));

    // Update keywords if provided
    if (dto.keywords !== undefined) {
      await this.db.delete(alertKeywords).where(eq(alertKeywords.alertId, alertId));
      if (dto.keywords.length > 0) {
        await this.db
          .insert(alertKeywords)
          .values(dto.keywords.map((keyword) => ({ alertId, keyword })));
      }
    }

    // Update competitors if provided
    if (dto.competitors !== undefined) {
      await this.db.delete(alertCompetitors).where(eq(alertCompetitors.alertId, alertId));
      if (dto.competitors.length > 0) {
        await this.db
          .insert(alertCompetitors)
          .values(dto.competitors.map((competitor) => ({ alertId, competitor })));
      }
    }

    return this.findOne(userId, alertId);
  }

  async delete(userId: string, alertId: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(alerts)
      .where(and(eq(alerts.id, alertId), eq(alerts.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Alert not found');
    }

    // Junction tables cascade delete automatically
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

    return Promise.all(results.map((r) => this.buildResultResponseDto(r)));
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

    await this.db.update(alertResults).set({ isRead: true }).where(eq(alertResults.id, resultId));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userAlerts = await this.db
      .select({ id: alerts.id })
      .from(alerts)
      .where(eq(alerts.userId, userId));

    if (userAlerts.length === 0) return 0;

    const alertIds = userAlerts.map((a) => a.id);

    const unreadResults = await this.db
      .select()
      .from(alertResults)
      .where(and(inArray(alertResults.alertId, alertIds), eq(alertResults.isRead, false)));

    return unreadResults.length;
  }

  /**
   * Batch fetch related data for multiple alerts to avoid N+1 queries
   */
  private async buildAlertResponseDtosBatch(
    alertList: (typeof alerts.$inferSelect)[],
  ): Promise<AlertResponseDto[]> {
    if (alertList.length === 0) return [];

    const alertIds = alertList.map((a) => a.id);

    // Batch fetch all related data in 2 queries instead of 2*N queries
    const [allKeywords, allCompetitors] = await Promise.all([
      this.db
        .select({ alertId: alertKeywords.alertId, keyword: alertKeywords.keyword })
        .from(alertKeywords)
        .where(inArray(alertKeywords.alertId, alertIds)),
      this.db
        .select({ alertId: alertCompetitors.alertId, competitor: alertCompetitors.competitor })
        .from(alertCompetitors)
        .where(inArray(alertCompetitors.alertId, alertIds)),
    ]);

    // Group by alert ID for O(1) lookup
    const keywordsMap = new Map<string, string[]>();
    const competitorsMap = new Map<string, string[]>();

    for (const k of allKeywords) {
      const arr = keywordsMap.get(k.alertId) ?? [];
      arr.push(k.keyword);
      keywordsMap.set(k.alertId, arr);
    }
    for (const c of allCompetitors) {
      const arr = competitorsMap.get(c.alertId) ?? [];
      arr.push(c.competitor);
      competitorsMap.set(c.alertId, arr);
    }

    return alertList.map((alert) => ({
      id: alert.id,
      name: alert.name,
      type: alert.type as AlertResponseDto['type'],
      keywords: keywordsMap.get(alert.id) ?? [],
      competitors: competitorsMap.get(alert.id) ?? [],
      frequency: alert.frequency as AlertResponseDto['frequency'],
      isActive: alert.isActive,
      emailNotify: alert.emailNotify,
      lastCheckedAt: alert.lastCheckedAt?.toISOString() ?? null,
      lastTriggeredAt: alert.lastTriggeredAt?.toISOString() ?? null,
      triggerCount: alert.triggerCount,
      createdAt: alert.createdAt.toISOString(),
    }));
  }

  private async buildAlertResponseDto(
    alert: typeof alerts.$inferSelect,
  ): Promise<AlertResponseDto> {
    // For single alert, use batch method with array of 1
    const [result] = await this.buildAlertResponseDtosBatch([alert]);
    return result;
  }

  private async buildResultResponseDto(
    result: typeof alertResults.$inferSelect,
  ): Promise<AlertResultResponseDto> {
    // Fetch matched keywords from junction table
    const matchedKeywords = await this.db
      .select({ keyword: alertResultMatchedKeywords.keyword })
      .from(alertResultMatchedKeywords)
      .where(eq(alertResultMatchedKeywords.alertResultId, result.id));

    return {
      id: result.id,
      alertId: result.alertId,
      title: result.title,
      summary: result.summary,
      source: result.source,
      sourceUrl: result.sourceUrl,
      relevanceScore: result.relevanceScore ? Number(result.relevanceScore) : null,
      matchedKeywords: matchedKeywords.map((k) => k.keyword),
      matchedCompetitor: result.matchedCompetitor,
      isRead: result.isRead,
      createdAt: result.createdAt.toISOString(),
    };
  }
}
