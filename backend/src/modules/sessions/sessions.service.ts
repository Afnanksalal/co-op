import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, isNull, lt, asc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { RedisService } from '@/common/redis/redis.service';
import * as schema from '@/database/schema';
import { CreateSessionDto, SessionResponseDto, CreateMessageDto, MessageResponseDto } from './dto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly SESSION_PREFIX = 'session:';
  private readonly ACTIVITY_PREFIX = 'session:activity:';
  private readonly SESSION_TTL = 3600; // 1 hour
  private readonly SESSION_EXPIRY_HOURS = 24; // Sessions expire after 24 hours of inactivity

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly redis: RedisService,
  ) {}

  async create(userId: string, dto: CreateSessionDto): Promise<SessionResponseDto> {
    const [session] = await this.db
      .insert(schema.sessions)
      .values({
        userId,
        startupId: dto.startupId,
        metadata: dto.metadata,
      })
      .returning();

    await this.redis.set(`${this.SESSION_PREFIX}${session.id}`, session, this.SESSION_TTL);

    return this.toResponse(session);
  }

  async findById(id: string, userId: string): Promise<SessionResponseDto> {
    const cached = await this.redis.get<schema.Session>(`${this.SESSION_PREFIX}${id}`);
    if (cached && !cached.deletedAt) {
      if (cached.userId !== userId) {
        throw new NotFoundException('Session not found');
      }
      return this.toResponse(cached);
    }

    const results = await this.db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.id, id), isNull(schema.sessions.deletedAt)))
      .limit(1);

    const session = results[0];

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    return this.toResponse(session);
  }

  async findByUserId(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.deletedAt)))
      .orderBy(desc(schema.sessions.createdAt));

    return sessions.map(s => this.toResponse(s));
  }

  async end(id: string, userId: string): Promise<void> {
    // Verify ownership first
    await this.findById(id, userId);

    await this.db
      .update(schema.sessions)
      .set({ status: 'ended', updatedAt: new Date() })
      .where(and(eq(schema.sessions.id, id), isNull(schema.sessions.deletedAt)));

    await this.redis.del(`${this.SESSION_PREFIX}${id}`);
    await this.redis.del(`${this.ACTIVITY_PREFIX}${id}`);
  }

  async trackActivity(id: string, userId: string, action: string): Promise<void> {
    // Verify ownership
    await this.findById(id, userId);

    // Validate action string
    if (!action || action.length > 255) {
      throw new Error('Invalid action: must be 1-255 characters');
    }

    const activityKey = `${this.ACTIVITY_PREFIX}${id}`;
    const activity = {
      action: action.trim(),
      timestamp: new Date().toISOString(),
      userId,
    };

    // Store activity in Redis
    await this.redis.set(activityKey, activity, this.SESSION_TTL);

    // Update session's updatedAt to track last activity and invalidate cache
    await this.db
      .update(schema.sessions)
      .set({ updatedAt: new Date() })
      .where(eq(schema.sessions.id, id));

    // Invalidate session cache to ensure fresh data
    await this.redis.del(`${this.SESSION_PREFIX}${id}`);
  }

  async getActivity(id: string, userId: string): Promise<{ action: string; timestamp: string; userId: string } | null> {
    await this.findById(id, userId);
    return this.redis.get<{ action: string; timestamp: string; userId: string }>(`${this.ACTIVITY_PREFIX}${id}`);
  }

  async expireInactiveSessions(): Promise<number> {
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() - this.SESSION_EXPIRY_HOURS);

    const results = await this.db
      .update(schema.sessions)
      .set({ status: 'expired', updatedAt: new Date() })
      .where(
        and(
          eq(schema.sessions.status, 'active'),
          lt(schema.sessions.updatedAt, expiryDate),
          isNull(schema.sessions.deletedAt),
        ),
      )
      .returning();

    this.logger.log(`Expired ${String(results.length)} inactive sessions`);
    return results.length;
  }

  async addMessage(sessionId: string, userId: string, dto: CreateMessageDto): Promise<MessageResponseDto> {
    // Verify ownership
    await this.findById(sessionId, userId);

    const [message] = await this.db
      .insert(schema.sessionMessages)
      .values({
        sessionId,
        role: dto.role,
        content: dto.content,
        agent: dto.agent ?? null,
        metadata: dto.metadata ?? {},
      })
      .returning();

    // Update session activity
    await this.db
      .update(schema.sessions)
      .set({ updatedAt: new Date() })
      .where(eq(schema.sessions.id, sessionId));

    return this.toMessageResponse(message);
  }

  async getMessages(sessionId: string, userId: string, limit = 100): Promise<MessageResponseDto[]> {
    // Verify ownership
    await this.findById(sessionId, userId);

    const messages = await this.db
      .select()
      .from(schema.sessionMessages)
      .where(eq(schema.sessionMessages.sessionId, sessionId))
      .orderBy(asc(schema.sessionMessages.createdAt))
      .limit(limit);

    return messages.map(m => this.toMessageResponse(m));
  }

  async getSessionHistory(sessionId: string, userId: string): Promise<{
    session: SessionResponseDto;
    messages: MessageResponseDto[];
  }> {
    const session = await this.findById(sessionId, userId);
    const messages = await this.getMessages(sessionId, userId);

    return { session, messages };
  }

  private toResponse(session: schema.Session): SessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      startupId: session.startupId,
      status: session.status,
      metadata: session.metadata as Record<string, unknown>,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }

  private toMessageResponse(message: schema.SessionMessage): MessageResponseDto {
    return {
      id: message.id,
      sessionId: message.sessionId,
      role: message.role,
      content: message.content,
      agent: message.agent,
      metadata: message.metadata as Record<string, unknown>,
      createdAt: message.createdAt,
    };
  }
}
