import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { CreateStartupDto, UpdateStartupDto, StartupResponseDto } from './dto';

@Injectable()
export class StartupsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateStartupDto): Promise<StartupResponseDto> {
    const [startup] = await this.db
      .insert(schema.startups)
      .values({
        name: dto.name,
        description: dto.description,
        metadata: dto.metadata,
      })
      .returning();

    return this.toResponse(startup);
  }

  async findAll(): Promise<StartupResponseDto[]> {
    const startups = await this.db
      .select()
      .from(schema.startups)
      .where(isNull(schema.startups.deletedAt))
      .orderBy(desc(schema.startups.createdAt));

    return startups.map(s => this.toResponse(s));
  }

  async findById(id: string): Promise<StartupResponseDto> {
    const results = await this.db
      .select()
      .from(schema.startups)
      .where(and(eq(schema.startups.id, id), isNull(schema.startups.deletedAt)))
      .limit(1);

    const startup = results[0];
    if (!startup) {
      throw new NotFoundException('Startup not found');
    }

    return this.toResponse(startup);
  }

  async update(id: string, dto: UpdateStartupDto): Promise<StartupResponseDto> {
    const updateData: Partial<schema.NewStartup> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (dto.name) updateData.name = dto.name;
    if (dto.description) updateData.description = dto.description;
    if (dto.metadata) updateData.metadata = dto.metadata;

    const results = await this.db
      .update(schema.startups)
      .set(updateData)
      .where(and(eq(schema.startups.id, id), isNull(schema.startups.deletedAt)))
      .returning();

    const startup = results[0];
    if (!startup) {
      throw new NotFoundException('Startup not found');
    }

    return this.toResponse(startup);
  }

  async delete(id: string): Promise<void> {
    // Soft delete - set deletedAt timestamp
    const results = await this.db
      .update(schema.startups)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.startups.id, id), isNull(schema.startups.deletedAt)))
      .returning();

    if (results.length === 0) {
      throw new NotFoundException('Startup not found');
    }
  }

  private toResponse(startup: schema.Startup): StartupResponseDto {
    return {
      id: startup.id,
      name: startup.name,
      description: startup.description ?? '',
      metadata: startup.metadata as Record<string, unknown>,
      createdAt: startup.createdAt,
      updatedAt: startup.updatedAt,
    };
  }
}
