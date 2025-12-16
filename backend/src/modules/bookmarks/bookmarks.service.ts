import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, ilike, or } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { CreateBookmarkDto, UpdateBookmarkDto, BookmarkResponseDto } from './dto/bookmark.dto';

@Injectable()
export class BookmarksService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(userId: string, dto: CreateBookmarkDto): Promise<BookmarkResponseDto> {
    const [bookmark] = await this.db
      .insert(schema.bookmarks)
      .values({
        userId,
        sessionId: dto.sessionId,
        messageId: dto.messageId,
        title: dto.title,
        content: dto.content,
        agent: dto.agent,
        tags: dto.tags || [],
      })
      .returning();

    return this.toResponse(bookmark);
  }

  async findAll(userId: string, search?: string): Promise<BookmarkResponseDto[]> {
    let query = this.db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, userId))
      .orderBy(desc(schema.bookmarks.createdAt));

    if (search?.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      query = this.db
        .select()
        .from(schema.bookmarks)
        .where(
          and(
            eq(schema.bookmarks.userId, userId),
            or(
              ilike(schema.bookmarks.title, term),
              ilike(schema.bookmarks.content, term),
            ),
          ),
        )
        .orderBy(desc(schema.bookmarks.createdAt));
    }

    const bookmarks = await query;
    return bookmarks.map((b) => this.toResponse(b));
  }

  async findById(id: string, userId: string): Promise<BookmarkResponseDto> {
    const [bookmark] = await this.db
      .select()
      .from(schema.bookmarks)
      .where(and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, userId)))
      .limit(1);

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    return this.toResponse(bookmark);
  }

  async update(id: string, userId: string, dto: UpdateBookmarkDto): Promise<BookmarkResponseDto> {
    await this.findById(id, userId);

    const [updated] = await this.db
      .update(schema.bookmarks)
      .set({
        ...(dto.title && { title: dto.title }),
        ...(dto.tags && { tags: dto.tags }),
      })
      .where(and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, userId)))
      .returning();

    return this.toResponse(updated);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.findById(id, userId);

    await this.db
      .delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.id, id), eq(schema.bookmarks.userId, userId)));
  }

  private toResponse(bookmark: schema.Bookmark): BookmarkResponseDto {
    return {
      id: bookmark.id,
      userId: bookmark.userId,
      sessionId: bookmark.sessionId ?? undefined,
      messageId: bookmark.messageId ?? undefined,
      title: bookmark.title,
      content: bookmark.content,
      agent: bookmark.agent ?? undefined,
      tags: bookmark.tags ?? [],
      createdAt: bookmark.createdAt,
    };
  }
}
