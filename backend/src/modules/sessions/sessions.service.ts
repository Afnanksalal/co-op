import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { RedisService } from '@/common/redis/redis.service';
import * as schema from '@/database/schema';
import { CreateSessionDto, SessionResponseDto } from './dto';

@Injectable()
export class SessionsService {
  private readonly SESSION_PREFIX = 'session:';
  private readonly SESSION_TTL = 3600; // 1 hour

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
        metadata: dto.metadata || {},
      })
      .returning();

    // Cache in Redis
    await this.redis.set(`${this.SESSION_PREFIX}${session.id}`, session, this.SESSION_TTL);

    return this.toResponse(session);
  }

  async findById(id: string): Promise<SessionResponseDto> {
    // Try cache first
    const cached = await this.redis.get<schema.Session>(`${this.SESSION_PREFIX}${id}`);
    if (cached) {
      return this.toResponse(cached);
    }

    const [session] = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.id, id))
      .limit(1);

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return this.toResponse(session);
  }

  async findByUserId(userId: string): Promise<SessionResponseDto[]> {
    const sessions = await this.db
      .select()
      .from(schema.sessions)
      .where(eq(schema.sessions.userId, userId))
      .orderBy(desc(schema.sessions.createdAt));

    return sessions.map(s => this.toResponse(s));
  }

  async end(id: string): Promise<void> {
    await this.db
      .update(schema.sessions)
      .set({ status: 'ended', updatedAt: new Date() })
      .where(eq(schema.sessions.id, id));

    await this.redis.del(`${this.SESSION_PREFIX}${id}`);
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
}
