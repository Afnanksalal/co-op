import { Injectable, Inject, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import { CacheService, CACHE_TTL, CACHE_PREFIX } from '@/common/cache/cache.service';
import * as schema from '@/database/schema';
import { CreateUserDto, UpdateUserDto, UserResponseDto, StartupSummaryDto } from './dto';
import { OnboardingDto } from './dto/onboarding.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly cache: CacheService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, dto.email.toLowerCase()), isNull(schema.users.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('Email already registered');
    }

    const [user] = await this.db
      .insert(schema.users)
      .values({
        email: dto.email.toLowerCase(),
        name: dto.name,
      })
      .returning();

    return this.toResponse(user, null);
  }

  async findById(id: string): Promise<UserResponseDto> {
    const cacheKey = `${CACHE_PREFIX.USER}${id}`;

    // Try cache first
    const cached = await this.cache.get<UserResponseDto>(cacheKey);
    if (cached) {
      return cached;
    }

    const results = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .limit(1);

    const user = results[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let startup: schema.Startup | null = null;
    if (user.startupId) {
      const startupResults = await this.db
        .select()
        .from(schema.startups)
        .where(and(eq(schema.startups.id, user.startupId), isNull(schema.startups.deletedAt)))
        .limit(1);
      startup = startupResults[0] ?? null;
    }

    const response = this.toResponse(user, startup);

    // Cache for 1 hour
    await this.cache.set(cacheKey, response, { ttl: CACHE_TTL.LONG });

    return response;
  }

  async findByEmail(email: string): Promise<schema.User | null> {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.email, email.toLowerCase()), isNull(schema.users.deletedAt)))
      .limit(1);

    return results[0] ?? null;
  }

  async findOrCreateFromSupabase(
    supabaseUserId: string,
    email: string,
    name: string,
    authProvider: string,
  ): Promise<UserResponseDto> {
    const existing = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, supabaseUserId), isNull(schema.users.deletedAt)))
      .limit(1);

    if (existing.length > 0) {
      const user = existing[0];
      let startup: schema.Startup | null = null;
      if (user.startupId) {
        const startupResults = await this.db
          .select()
          .from(schema.startups)
          .where(and(eq(schema.startups.id, user.startupId), isNull(schema.startups.deletedAt)))
          .limit(1);
        startup = startupResults[0] ?? null;
      }
      return this.toResponse(user, startup);
    }

    const [user] = await this.db
      .insert(schema.users)
      .values({
        id: supabaseUserId,
        email: email.toLowerCase(),
        name,
        authProvider,
        onboardingCompleted: false,
      })
      .returning();

    return this.toResponse(user, null);
  }

  async completeOnboarding(userId: string, dto: OnboardingDto): Promise<UserResponseDto> {
    const userResults = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    const user = userResults[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.onboardingCompleted) {
      throw new BadRequestException('Onboarding already completed');
    }

    // Create the startup with new schema
    const [startup] = await this.db
      .insert(schema.startups)
      .values({
        // Founder
        founderName: dto.founderName,
        founderRole: dto.founderRole,
        // Company basics
        companyName: dto.companyName,
        tagline: dto.tagline ?? null,
        description: dto.description,
        website: dto.website ?? null,
        // Business classification
        industry: dto.industry,
        sector: dto.sector, // RAG sector for document filtering
        businessModel: dto.businessModel,
        revenueModel: dto.revenueModel ?? null,
        // Stage
        stage: dto.stage,
        foundedYear: dto.foundedYear,
        launchDate: dto.launchDate ? new Date(dto.launchDate) : null,
        // Team
        teamSize: dto.teamSize,
        cofounderCount: dto.cofounderCount,
        // Location
        country: dto.country,
        city: dto.city ?? null,
        operatingRegions: dto.operatingRegions ?? null,
        // Financials
        fundingStage: dto.fundingStage ?? null,
        totalRaised: dto.totalRaised ? String(dto.totalRaised) : null,
        monthlyRevenue: dto.monthlyRevenue ? String(dto.monthlyRevenue) : null,
        isRevenue: dto.isRevenue,
        // Target market
        targetCustomer: dto.targetCustomer ?? null,
        problemSolved: dto.problemSolved ?? null,
        competitiveAdvantage: dto.competitiveAdvantage ?? null,
      })
      .returning();

    // Update user with startup link
    const [updatedUser] = await this.db
      .update(schema.users)
      .set({
        name: dto.founderName,
        startupId: startup.id,
        onboardingCompleted: true,
        updatedAt: new Date(),
      })
      .where(eq(schema.users.id, userId))
      .returning();

    return this.toResponse(updatedUser, startup);
  }

  async updateStartup(userId: string, dto: Partial<OnboardingDto>): Promise<UserResponseDto> {
    const userResults = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    const user = userResults[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.startupId) {
      throw new BadRequestException('No startup linked to user');
    }

    const updateData: Partial<schema.NewStartup> & { updatedAt: Date } = {
      updatedAt: new Date(),
    };

    // Founder
    if (dto.founderName) updateData.founderName = dto.founderName;
    if (dto.founderRole) updateData.founderRole = dto.founderRole;
    // Company basics
    if (dto.companyName) updateData.companyName = dto.companyName;
    if (dto.tagline !== undefined) updateData.tagline = dto.tagline ?? null;
    if (dto.description) updateData.description = dto.description;
    if (dto.website !== undefined) updateData.website = dto.website ?? null;
    // Business classification
    if (dto.industry) updateData.industry = dto.industry;
    if (dto.sector) updateData.sector = dto.sector;
    if (dto.businessModel) updateData.businessModel = dto.businessModel;
    if (dto.revenueModel !== undefined) updateData.revenueModel = dto.revenueModel ?? null;
    // Stage
    if (dto.stage) updateData.stage = dto.stage;
    if (dto.foundedYear) updateData.foundedYear = dto.foundedYear;
    if (dto.launchDate !== undefined) updateData.launchDate = dto.launchDate ? new Date(dto.launchDate) : null;
    // Team
    if (dto.teamSize) updateData.teamSize = dto.teamSize;
    if (dto.cofounderCount) updateData.cofounderCount = dto.cofounderCount;
    // Location
    if (dto.country) updateData.country = dto.country;
    if (dto.city !== undefined) updateData.city = dto.city ?? null;
    if (dto.operatingRegions !== undefined) updateData.operatingRegions = dto.operatingRegions ?? null;
    // Financials
    if (dto.fundingStage !== undefined) updateData.fundingStage = dto.fundingStage ?? null;
    if (dto.totalRaised !== undefined) updateData.totalRaised = dto.totalRaised ? String(dto.totalRaised) : null;
    if (dto.monthlyRevenue !== undefined) updateData.monthlyRevenue = dto.monthlyRevenue ? String(dto.monthlyRevenue) : null;
    if (dto.isRevenue) updateData.isRevenue = dto.isRevenue;
    // Target market
    if (dto.targetCustomer !== undefined) updateData.targetCustomer = dto.targetCustomer ?? null;
    if (dto.problemSolved !== undefined) updateData.problemSolved = dto.problemSolved ?? null;
    if (dto.competitiveAdvantage !== undefined) updateData.competitiveAdvantage = dto.competitiveAdvantage ?? null;

    const [startup] = await this.db
      .update(schema.startups)
      .set(updateData)
      .where(eq(schema.startups.id, user.startupId))
      .returning();

    if (dto.founderName) {
      await this.db
        .update(schema.users)
        .set({ name: dto.founderName, updatedAt: new Date() })
        .where(eq(schema.users.id, userId));
    }

    return this.toResponse(user, startup);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (dto.email) {
      throw new BadRequestException('Email cannot be changed');
    }

    const updateData: Partial<{ name: string; updatedAt: Date }> = {
      updatedAt: new Date(),
    };

    if (dto.name) {
      updateData.name = dto.name;
    }

    const results = await this.db
      .update(schema.users)
      .set(updateData)
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .returning();

    const user = results[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let startup: schema.Startup | null = null;
    if (user.startupId) {
      const startupResults = await this.db
        .select()
        .from(schema.startups)
        .where(and(eq(schema.startups.id, user.startupId), isNull(schema.startups.deletedAt)))
        .limit(1);
      startup = startupResults[0] ?? null;
    }

    // Invalidate cache
    await this.cache.invalidate(`${CACHE_PREFIX.USER}${id}`);

    return this.toResponse(user, startup);
  }

  async delete(id: string): Promise<void> {
    const results = await this.db
      .update(schema.users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(schema.users.id, id), isNull(schema.users.deletedAt)))
      .returning();

    if (results.length === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async getOnboardingStatus(userId: string): Promise<{ completed: boolean; hasStartup: boolean }> {
    const results = await this.db
      .select()
      .from(schema.users)
      .where(and(eq(schema.users.id, userId), isNull(schema.users.deletedAt)))
      .limit(1);

    const user = results[0];
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      completed: user.onboardingCompleted,
      hasStartup: user.startupId !== null,
    };
  }

  private toResponse(user: schema.User, startup: schema.Startup | null): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      authProvider: user.authProvider,
      onboardingCompleted: user.onboardingCompleted,
      startup: startup ? this.toStartupSummary(startup) : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private toStartupSummary(startup: schema.Startup): StartupSummaryDto {
    return {
      id: startup.id,
      companyName: startup.companyName,
      industry: startup.industry,
      sector: startup.sector,
      stage: startup.stage,
      fundingStage: startup.fundingStage,
    };
  }
}
