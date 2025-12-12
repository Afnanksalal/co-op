import { Injectable, Inject, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';

interface AuditLogInput {
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
}

interface AuditLogResponse {
  id: string;
  userId: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface AuditLogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.db.insert(schema.auditLogs).values({
        userId: input.userId,
        action: input.action,
        resource: input.resource,
        resourceId: input.resourceId,
        oldValue: input.oldValue,
        newValue: input.newValue,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${String(error)}`);
    }
  }

  async query(query: AuditLogQuery): Promise<AuditLogResponse[]> {
    const conditions = [];

    if (query.userId) {
      conditions.push(eq(schema.auditLogs.userId, query.userId));
    }
    if (query.action) {
      conditions.push(eq(schema.auditLogs.action, query.action));
    }
    if (query.resource) {
      conditions.push(eq(schema.auditLogs.resource, query.resource));
    }
    if (query.resourceId) {
      conditions.push(eq(schema.auditLogs.resourceId, query.resourceId));
    }
    if (query.startDate) {
      conditions.push(gte(schema.auditLogs.createdAt, query.startDate));
    }
    if (query.endDate) {
      conditions.push(lte(schema.auditLogs.createdAt, query.endDate));
    }

    const logs = await this.db
      .select()
      .from(schema.auditLogs)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(query.limit ?? 100)
      .offset(query.offset ?? 0);

    return logs.map(log => this.toResponse(log));
  }

  async getByResourceId(resource: string, resourceId: string): Promise<AuditLogResponse[]> {
    const logs = await this.db
      .select()
      .from(schema.auditLogs)
      .where(and(eq(schema.auditLogs.resource, resource), eq(schema.auditLogs.resourceId, resourceId)))
      .orderBy(desc(schema.auditLogs.createdAt));

    return logs.map(log => this.toResponse(log));
  }

  private toResponse(log: schema.AuditLog): AuditLogResponse {
    return {
      id: log.id,
      userId: log.userId,
      action: log.action,
      resource: log.resource,
      resourceId: log.resourceId,
      oldValue: log.oldValue as Record<string, unknown> | null,
      newValue: log.newValue as Record<string, unknown> | null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      metadata: log.metadata as Record<string, unknown>,
      createdAt: log.createdAt,
    };
  }
}
