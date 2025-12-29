import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { CacheService, CACHE_TTL, CACHE_PREFIX } from '@/common/cache/cache.service';
import * as schema from '@/database/schema';
import { StartupResponseDto } from './dto/startup-response.dto';

@Injectable()
export class StartupsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheService,
  ) {}

  async findAll(): Promise<StartupResponseDto[]> {
    const startups = await this.db
      .select()
      .from(schema.startups)
      .where(isNull(schema.startups.deletedAt))
      .orderBy(desc(schema.startups.createdAt));

    return startups.map((s) => this.toResponse(s));
  }

  async findById(id: string): Promise<StartupResponseDto> {
    const cacheKey = `${CACHE_PREFIX.STARTUP}${id}`;

    // Try cache first
    const cached = await this.cache.get<StartupResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.db
      .select()
      .from(schema.startups)
      .where(and(eq(schema.startups.id, id), isNull(schema.startups.deletedAt)))
      .limit(1);

    const startup = results[0];
    if (!startup) {
      throw new NotFoundException('Startup not found');
    }

    const response = this.toResponse(startup);

    // Cache for 1 hour
    await this.cache.set(cacheKey, response, { ttl: CACHE_TTL.LONG });

    return response;
  }

  async findRaw(id: string): Promise<schema.Startup | null> {
    const cacheKey = `${CACHE_PREFIX.STARTUP}raw:${id}`;

    // Try cache first
    const cached = await this.cache.get<schema.Startup>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.db
      .select()
      .from(schema.startups)
      .where(and(eq(schema.startups.id, id), isNull(schema.startups.deletedAt)))
      .limit(1);

    const startup = results[0] ?? null;

    if (startup) {
      // Cache for 1 hour
      await this.cache.set(cacheKey, startup, { ttl: CACHE_TTL.LONG });
    }

    return startup;
  }

  async invalidateCache(id: string): Promise<void> {
    await this.cache.invalidate(`${CACHE_PREFIX.STARTUP}${id}`);
    await this.cache.invalidate(`${CACHE_PREFIX.STARTUP}raw:${id}`);
  }

  async delete(id: string): Promise<void> {
    const results = await this.db
      .update(schema.startups)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.startups.id, id), isNull(schema.startups.deletedAt)))
      .returning();

    if (results.length === 0) {
      throw new NotFoundException('Startup not found');
    }

    // Invalidate cache
    await this.invalidateCache(id);
  }

  private toResponse(startup: schema.Startup): StartupResponseDto {
    return {
      id: startup.id,
      // Founder
      founderName: startup.founderName,
      founderRole: startup.founderRole,
      // Company basics
      companyName: startup.companyName,
      tagline: startup.tagline,
      description: startup.description,
      website: startup.website,
      // Business classification
      industry: startup.industry,
      sector: startup.sector,
      businessModel: startup.businessModel,
      revenueModel: startup.revenueModel,
      // Stage
      stage: startup.stage,
      foundedYear: startup.foundedYear,
      launchDate: startup.launchDate,
      // Team
      teamSize: startup.teamSize,
      cofounderCount: startup.cofounderCount,
      // Location
      country: startup.country,
      city: startup.city,
      operatingRegions: startup.operatingRegions,
      // Financials
      fundingStage: startup.fundingStage,
      totalRaised: startup.totalRaised,
      monthlyRevenue: startup.monthlyRevenue,
      isRevenue: startup.isRevenue,
      // Target market
      targetCustomer: startup.targetCustomer,
      problemSolved: startup.problemSolved,
      competitiveAdvantage: startup.competitiveAdvantage,
      // Timestamps
      createdAt: startup.createdAt,
      updatedAt: startup.updatedAt,
    };
  }
}
