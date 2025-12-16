import { Injectable, Inject, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, isNull, lt, asc, ilike, or, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { RedisService } from '@/common/redis/redis.service';
import { UsersService } from '@/modules/users/users.service';
import { WebhooksService } from '@/modules/webhooks/webhooks.service';
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
    private readonly usersService: UsersService,
    private readonly webhooksService: WebhooksService,
  ) {}

  async create(userId: string, dto: CreateSessionDto): Promise<SessionResponseDto> {
    // Verify user owns the startup
    await this.verifyStartupOwnership(userId, dto.startupId);

    const [session] = await this.db
      .insert(schema.sessions)
      .values({
        userId,
        startupId: dto.startupId,
        metadata: dto.metadata,
      })
      .returning();

    await this.redis.set(`${this.SESSION_PREFIX}${session.id}`, session, this.SESSION_TTL);

    // Trigger webhook for session creation
    await this.webhooksService.trigger('session.created', {
      sessionId: session.id,
      userId,
      startupId: dto.startupId,
      createdAt: session.createdAt.toISOString(),
    });

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

  async findByUserId(userId: string, search?: string): Promise<SessionResponseDto[]> {
    let query = this.db
      .select()
      .from(schema.sessions)
      .where(and(eq(schema.sessions.userId, userId), isNull(schema.sessions.deletedAt)))
      .orderBy(desc(schema.sessions.createdAt));

    if (search && search.trim()) {
      const searchTerm = `%${search.trim().toLowerCase()}%`;
      query = this.db
        .select()
        .from(schema.sessions)
        .where(and(
          eq(schema.sessions.userId, userId),
          isNull(schema.sessions.deletedAt),
          ilike(schema.sessions.title, searchTerm),
        ))
        .orderBy(desc(schema.sessions.createdAt));
    }

    const sessions = await query;
    return sessions.map(s => this.toResponse(s));
  }

  async updateTitle(id: string, userId: string, title: string): Promise<SessionResponseDto> {
    // Verify ownership
    await this.findById(id, userId);

    // Validate title
    const cleanTitle = title.trim().slice(0, 255);
    if (!cleanTitle) {
      throw new ForbiddenException('Title cannot be empty');
    }

    const [updated] = await this.db
      .update(schema.sessions)
      .set({ title: cleanTitle, updatedAt: new Date() })
      .where(and(eq(schema.sessions.id, id), isNull(schema.sessions.deletedAt)))
      .returning();

    await this.redis.del(`${this.SESSION_PREFIX}${id}`);

    return this.toResponse(updated);
  }

  /**
   * Auto-generate a title from the first user message
   */
  generateTitleFromMessage(content: string): string {
    // Take first 50 chars, clean up, add ellipsis if truncated
    const cleaned = content
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (cleaned.length <= 50) {
      return cleaned;
    }
    
    // Find a good break point (word boundary)
    const truncated = cleaned.slice(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > 30) {
      return truncated.slice(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  async end(id: string, userId: string): Promise<void> {
    // Verify ownership first
    const session = await this.findById(id, userId);

    // Validate status transition - can only end active sessions
    if (session.status !== 'active') {
      throw new ForbiddenException(`Cannot end session with status '${session.status}'. Only active sessions can be ended.`);
    }

    await this.db
      .update(schema.sessions)
      .set({ status: 'ended', updatedAt: new Date() })
      .where(and(eq(schema.sessions.id, id), isNull(schema.sessions.deletedAt)));

    // Invalidate all session-related cache
    await this.invalidateSessionCache(id);

    // Trigger webhook for session ended
    await this.webhooksService.trigger('session.ended', {
      sessionId: id,
      userId,
      endedAt: new Date().toISOString(),
    });
  }

  /**
   * Invalidate all cache entries for a session
   */
  private async invalidateSessionCache(sessionId: string): Promise<void> {
    await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    await this.redis.del(`${this.ACTIVITY_PREFIX}${sessionId}`);
  }

  async trackActivity(id: string, userId: string, action: string): Promise<void> {
    // Verify ownership
    await this.findById(id, userId);

    // Validate action string
    if (!action || action.trim().length === 0) {
      throw new Error('Invalid action: must not be empty');
    }
    if (action.length > 255) {
      throw new Error('Invalid action: must be 255 characters or less');
    }

    const activityKey = `${this.ACTIVITY_PREFIX}${id}`;
    const activity = {
      action: action.trim(),
      timestamp: new Date().toISOString(),
      userId,
    };

    // Store activity in Redis
    await this.redis.set(activityKey, activity, this.SESSION_TTL);

    // Update session's updatedAt to track last activity
    await this.db
      .update(schema.sessions)
      .set({ updatedAt: new Date() })
      .where(eq(schema.sessions.id, id));

    // Invalidate session cache to ensure fresh data on next read
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
    const session = await this.findById(sessionId, userId);

    // Validate session is active
    if (session.status !== 'active') {
      throw new ForbiddenException(`Cannot add messages to session with status '${session.status}'`);
    }

    // Validate content length (prevent abuse)
    if (dto.content.length > 50000) {
      throw new ForbiddenException('Message content exceeds maximum length of 50000 characters');
    }

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

    // Auto-generate title from first user message if session has no title
    const updateData: { updatedAt: Date; title?: string } = { updatedAt: new Date() };
    
    if (!session.title && dto.role === 'user') {
      updateData.title = this.generateTitleFromMessage(dto.content);
    }

    await this.db
      .update(schema.sessions)
      .set(updateData)
      .where(eq(schema.sessions.id, sessionId));

    // Invalidate cache if title was updated
    if (updateData.title) {
      await this.redis.del(`${this.SESSION_PREFIX}${sessionId}`);
    }

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

  async togglePin(id: string, userId: string): Promise<SessionResponseDto> {
    // Verify ownership
    const session = await this.findById(id, userId);

    const [updated] = await this.db
      .update(schema.sessions)
      .set({ isPinned: !session.isPinned, updatedAt: new Date() })
      .where(and(eq(schema.sessions.id, id), isNull(schema.sessions.deletedAt)))
      .returning();

    await this.redis.del(`${this.SESSION_PREFIX}${id}`);

    return this.toResponse(updated);
  }

  private toResponse(session: schema.Session): SessionResponseDto {
    return {
      id: session.id,
      userId: session.userId,
      startupId: session.startupId,
      title: session.title ?? undefined,
      status: session.status,
      isPinned: session.isPinned,
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

  private async verifyStartupOwnership(userId: string, startupId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (user.startup?.id !== startupId) {
      throw new ForbiddenException('You do not have access to this startup');
    }
  }
}
