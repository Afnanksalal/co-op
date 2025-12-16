import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, or, ilike, desc, asc, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import {
  investors,
  investorSectors,
  investorRegions,
  investorPortfolioCompanies,
  investorNotableExits,
} from '@/database/schema/investors.schema';
import {
  CreateInvestorDto,
  UpdateInvestorDto,
  InvestorResponseDto,
  InvestorQueryDto,
} from './dto/investor.dto';

@Injectable()
export class InvestorsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async create(dto: CreateInvestorDto): Promise<InvestorResponseDto> {
    // Insert investor
    const [investor] = await this.db
      .insert(investors)
      .values({
        name: dto.name,
        description: dto.description,
        website: dto.website,
        stage: dto.stage,
        checkSizeMin: dto.checkSizeMin,
        checkSizeMax: dto.checkSizeMax,
        location: dto.location,
        contactEmail: dto.contactEmail,
        linkedinUrl: dto.linkedinUrl,
        twitterUrl: dto.twitterUrl,
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
      })
      .returning();

    // Insert related data
    await this.insertRelatedData(investor.id, dto);

    return this.findOne(investor.id);
  }

  async findAll(query: InvestorQueryDto): Promise<InvestorResponseDto[]> {
    // Build conditions array
    const conditions = [eq(investors.isActive, true)];

    if (query.stage) {
      conditions.push(eq(investors.stage, query.stage));
    }

    if (query.featuredOnly) {
      conditions.push(eq(investors.isFeatured, true));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(investors.name, `%${query.search}%`),
          ilike(investors.description, `%${query.search}%`),
          ilike(investors.location, `%${query.search}%`),
        )!,
      );
    }

    const baseInvestors = await this.db
      .select()
      .from(investors)
      .where(and(...conditions))
      .orderBy(desc(investors.isFeatured), asc(investors.name));

    // Filter by sector if specified
    let filteredIds = baseInvestors.map((i) => i.id);
    if (query.sector && filteredIds.length > 0) {
      const sectorMatches = await this.db
        .select({ investorId: investorSectors.investorId })
        .from(investorSectors)
        .where(
          and(
            inArray(investorSectors.investorId, filteredIds),
            eq(investorSectors.sector, query.sector),
          ),
        );
      filteredIds = sectorMatches.map((s) => s.investorId);
    }

    // Filter by region if specified
    if (query.region && filteredIds.length > 0) {
      const regionMatches = await this.db
        .select({ investorId: investorRegions.investorId })
        .from(investorRegions)
        .where(
          and(
            inArray(investorRegions.investorId, filteredIds),
            eq(investorRegions.region, query.region),
          ),
        );
      filteredIds = regionMatches.map((r) => r.investorId);
    }

    // Get full data for filtered investors - use batch fetch to avoid N+1
    const finalInvestors = baseInvestors.filter((i) => filteredIds.includes(i.id));
    return this.buildResponseDtosBatch(finalInvestors);
  }

  async findAllAdmin(): Promise<InvestorResponseDto[]> {
    const results = await this.db
      .select()
      .from(investors)
      .orderBy(desc(investors.createdAt));

    return this.buildResponseDtosBatch(results);
  }

  async findOne(id: string): Promise<InvestorResponseDto> {
    const [investor] = await this.db.select().from(investors).where(eq(investors.id, id));

    if (!investor) {
      throw new NotFoundException('Investor not found');
    }

    return this.buildResponseDto(investor);
  }

  async update(id: string, dto: UpdateInvestorDto): Promise<InvestorResponseDto> {
    const [existing] = await this.db.select().from(investors).where(eq(investors.id, id));

    if (!existing) {
      throw new NotFoundException('Investor not found');
    }

    // Update base investor data
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.website !== undefined) updateData.website = dto.website;
    if (dto.stage !== undefined) updateData.stage = dto.stage;
    if (dto.checkSizeMin !== undefined) updateData.checkSizeMin = dto.checkSizeMin;
    if (dto.checkSizeMax !== undefined) updateData.checkSizeMax = dto.checkSizeMax;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.contactEmail !== undefined) updateData.contactEmail = dto.contactEmail;
    if (dto.linkedinUrl !== undefined) updateData.linkedinUrl = dto.linkedinUrl;
    if (dto.twitterUrl !== undefined) updateData.twitterUrl = dto.twitterUrl;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.isFeatured !== undefined) updateData.isFeatured = dto.isFeatured;

    await this.db.update(investors).set(updateData).where(eq(investors.id, id));

    // Update related data if provided
    if (dto.sectors !== undefined) {
      await this.db.delete(investorSectors).where(eq(investorSectors.investorId, id));
      if (dto.sectors.length > 0) {
        await this.db
          .insert(investorSectors)
          .values(dto.sectors.map((sector) => ({ investorId: id, sector })));
      }
    }

    if (dto.regions !== undefined) {
      await this.db.delete(investorRegions).where(eq(investorRegions.investorId, id));
      if (dto.regions.length > 0) {
        await this.db
          .insert(investorRegions)
          .values(dto.regions.map((region) => ({ investorId: id, region })));
      }
    }

    if (dto.portfolioCompanies !== undefined) {
      await this.db
        .delete(investorPortfolioCompanies)
        .where(eq(investorPortfolioCompanies.investorId, id));
      if (dto.portfolioCompanies.length > 0) {
        await this.db
          .insert(investorPortfolioCompanies)
          .values(dto.portfolioCompanies.map((companyName) => ({ investorId: id, companyName })));
      }
    }

    if (dto.notableExits !== undefined) {
      await this.db.delete(investorNotableExits).where(eq(investorNotableExits.investorId, id));
      if (dto.notableExits.length > 0) {
        await this.db
          .insert(investorNotableExits)
          .values(dto.notableExits.map((companyName) => ({ investorId: id, companyName })));
      }
    }

    return this.findOne(id);
  }

  async delete(id: string): Promise<void> {
    const [existing] = await this.db.select().from(investors).where(eq(investors.id, id));

    if (!existing) {
      throw new NotFoundException('Investor not found');
    }

    // Junction tables cascade delete automatically
    await this.db.delete(investors).where(eq(investors.id, id));
  }

  async bulkCreate(dtos: CreateInvestorDto[]): Promise<{ created: number }> {
    let created = 0;
    for (const dto of dtos) {
      try {
        await this.create(dto);
        created++;
      } catch (error) {
        console.error(`Failed to create investor ${dto.name}:`, error);
      }
    }
    return { created };
  }

  async getStats(): Promise<{
    total: number;
    byStage: { stage: string; count: number }[];
    bySector: { sector: string; count: number }[];
  }> {
    const all = await this.db.select().from(investors).where(eq(investors.isActive, true));

    const byStage = new Map<string, number>();
    for (const inv of all) {
      byStage.set(inv.stage, (byStage.get(inv.stage) ?? 0) + 1);
    }

    // Get sector counts from junction table
    const sectorCounts = await this.db
      .select({ sector: investorSectors.sector })
      .from(investorSectors)
      .innerJoin(investors, eq(investorSectors.investorId, investors.id))
      .where(eq(investors.isActive, true));

    const bySector = new Map<string, number>();
    for (const row of sectorCounts) {
      bySector.set(row.sector, (bySector.get(row.sector) ?? 0) + 1);
    }

    return {
      total: all.length,
      byStage: Array.from(byStage.entries()).map(([stage, count]) => ({ stage, count })),
      bySector: Array.from(bySector.entries())
        .map(([sector, count]) => ({ sector, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
    };
  }

  private async insertRelatedData(investorId: string, dto: CreateInvestorDto): Promise<void> {
    // Insert sectors
    if (dto.sectors && dto.sectors.length > 0) {
      await this.db
        .insert(investorSectors)
        .values(dto.sectors.map((sector) => ({ investorId, sector })));
    }

    // Insert regions
    if (dto.regions && dto.regions.length > 0) {
      await this.db
        .insert(investorRegions)
        .values(dto.regions.map((region) => ({ investorId, region })));
    }

    // Insert portfolio companies
    if (dto.portfolioCompanies && dto.portfolioCompanies.length > 0) {
      await this.db
        .insert(investorPortfolioCompanies)
        .values(dto.portfolioCompanies.map((companyName) => ({ investorId, companyName })));
    }

    // Insert notable exits
    if (dto.notableExits && dto.notableExits.length > 0) {
      await this.db
        .insert(investorNotableExits)
        .values(dto.notableExits.map((companyName) => ({ investorId, companyName })));
    }
  }

  /**
   * Batch fetch related data for multiple investors to avoid N+1 queries
   */
  private async buildResponseDtosBatch(
    investorList: (typeof investors.$inferSelect)[],
  ): Promise<InvestorResponseDto[]> {
    if (investorList.length === 0) return [];

    const investorIds = investorList.map((i) => i.id);

    // Batch fetch all related data in 4 queries instead of 4*N queries
    const [allSectors, allRegions, allPortfolio, allExits] = await Promise.all([
      this.db
        .select({ investorId: investorSectors.investorId, sector: investorSectors.sector })
        .from(investorSectors)
        .where(inArray(investorSectors.investorId, investorIds)),
      this.db
        .select({ investorId: investorRegions.investorId, region: investorRegions.region })
        .from(investorRegions)
        .where(inArray(investorRegions.investorId, investorIds)),
      this.db
        .select({ investorId: investorPortfolioCompanies.investorId, companyName: investorPortfolioCompanies.companyName })
        .from(investorPortfolioCompanies)
        .where(inArray(investorPortfolioCompanies.investorId, investorIds)),
      this.db
        .select({ investorId: investorNotableExits.investorId, companyName: investorNotableExits.companyName })
        .from(investorNotableExits)
        .where(inArray(investorNotableExits.investorId, investorIds)),
    ]);

    // Group by investor ID for O(1) lookup
    const sectorsMap = new Map<string, string[]>();
    const regionsMap = new Map<string, string[]>();
    const portfolioMap = new Map<string, string[]>();
    const exitsMap = new Map<string, string[]>();

    for (const s of allSectors) {
      const arr = sectorsMap.get(s.investorId) ?? [];
      arr.push(s.sector);
      sectorsMap.set(s.investorId, arr);
    }
    for (const r of allRegions) {
      const arr = regionsMap.get(r.investorId) ?? [];
      arr.push(r.region);
      regionsMap.set(r.investorId, arr);
    }
    for (const p of allPortfolio) {
      const arr = portfolioMap.get(p.investorId) ?? [];
      arr.push(p.companyName);
      portfolioMap.set(p.investorId, arr);
    }
    for (const e of allExits) {
      const arr = exitsMap.get(e.investorId) ?? [];
      arr.push(e.companyName);
      exitsMap.set(e.investorId, arr);
    }

    return investorList.map((investor) => ({
      id: investor.id,
      name: investor.name,
      description: investor.description,
      website: investor.website,
      logoUrl: investor.logoUrl,
      stage: investor.stage as InvestorResponseDto['stage'],
      sectors: sectorsMap.get(investor.id) ?? [],
      checkSizeMin: investor.checkSizeMin,
      checkSizeMax: investor.checkSizeMax,
      location: investor.location,
      regions: regionsMap.get(investor.id) ?? [],
      contactEmail: investor.contactEmail,
      linkedinUrl: investor.linkedinUrl,
      twitterUrl: investor.twitterUrl,
      portfolioCompanies: portfolioMap.get(investor.id) ?? [],
      notableExits: exitsMap.get(investor.id) ?? [],
      isActive: investor.isActive,
      isFeatured: investor.isFeatured,
      createdAt: investor.createdAt.toISOString(),
      updatedAt: investor.updatedAt.toISOString(),
    }));
  }

  private async buildResponseDto(
    investor: typeof investors.$inferSelect,
  ): Promise<InvestorResponseDto> {
    // For single investor, use batch method with array of 1
    const [result] = await this.buildResponseDtosBatch([investor]);
    return result;
  }
}
