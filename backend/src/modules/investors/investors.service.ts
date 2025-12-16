import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, or, ilike, desc, asc, sql } from 'drizzle-orm';
import { DatabaseService } from '@/database/database.module';
import { investors, Investor } from '@/database/schema/investors.schema';
import {
  CreateInvestorDto,
  UpdateInvestorDto,
  InvestorResponseDto,
  InvestorQueryDto,
} from './dto/investor.dto';

@Injectable()
export class InvestorsService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateInvestorDto): Promise<InvestorResponseDto> {
    const [investor] = await this.db.drizzle
      .insert(investors)
      .values({
        name: dto.name,
        description: dto.description,
        website: dto.website,
        stage: dto.stage,
        sectors: dto.sectors,
        checkSizeMin: dto.checkSizeMin,
        checkSizeMax: dto.checkSizeMax,
        location: dto.location,
        regions: dto.regions || [],
        contactEmail: dto.contactEmail,
        linkedinUrl: dto.linkedinUrl,
        twitterUrl: dto.twitterUrl,
        portfolioCompanies: dto.portfolioCompanies || [],
        notableExits: dto.notableExits || [],
        isActive: dto.isActive ?? true,
        isFeatured: dto.isFeatured ?? false,
      })
      .returning();

    return this.toResponseDto(investor);
  }

  async findAll(query: InvestorQueryDto): Promise<InvestorResponseDto[]> {
    const conditions = [eq(investors.isActive, true)];

    if (query.stage) {
      conditions.push(eq(investors.stage, query.stage));
    }

    if (query.sector) {
      conditions.push(sql`${query.sector} = ANY(${investors.sectors})`);
    }

    if (query.region) {
      conditions.push(sql`${query.region} = ANY(${investors.regions})`);
    }

    if (query.featuredOnly) {
      conditions.push(eq(investors.isFeatured, true));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(investors.name, `%${query.search}%`),
          ilike(investors.description, `%${query.search}%`),
          ilike(investors.location, `%${query.search}%`)
        )!
      );
    }

    const results = await this.db.drizzle
      .select()
      .from(investors)
      .where(and(...conditions))
      .orderBy(desc(investors.isFeatured), asc(investors.name));

    return results.map((i) => this.toResponseDto(i));
  }

  async findAllAdmin(): Promise<InvestorResponseDto[]> {
    const results = await this.db.drizzle
      .select()
      .from(investors)
      .orderBy(desc(investors.createdAt));

    return results.map((i) => this.toResponseDto(i));
  }

  async findOne(id: string): Promise<InvestorResponseDto> {
    const [investor] = await this.db.drizzle
      .select()
      .from(investors)
      .where(eq(investors.id, id));

    if (!investor) {
      throw new NotFoundException('Investor not found');
    }

    return this.toResponseDto(investor);
  }

  async update(id: string, dto: UpdateInvestorDto): Promise<InvestorResponseDto> {
    const [existing] = await this.db.drizzle
      .select()
      .from(investors)
      .where(eq(investors.id, id));

    if (!existing) {
      throw new NotFoundException('Investor not found');
    }

    const [updated] = await this.db.drizzle
      .update(investors)
      .set({
        ...dto,
        updatedAt: new Date(),
      })
      .where(eq(investors.id, id))
      .returning();

    return this.toResponseDto(updated);
  }

  async delete(id: string): Promise<void> {
    const [existing] = await this.db.drizzle
      .select()
      .from(investors)
      .where(eq(investors.id, id));

    if (!existing) {
      throw new NotFoundException('Investor not found');
    }

    await this.db.drizzle.delete(investors).where(eq(investors.id, id));
  }

  async bulkCreate(dtos: CreateInvestorDto[]): Promise<{ created: number }> {
    const values = dtos.map((dto) => ({
      name: dto.name,
      description: dto.description,
      website: dto.website,
      stage: dto.stage,
      sectors: dto.sectors,
      checkSizeMin: dto.checkSizeMin,
      checkSizeMax: dto.checkSizeMax,
      location: dto.location,
      regions: dto.regions || [],
      contactEmail: dto.contactEmail,
      linkedinUrl: dto.linkedinUrl,
      twitterUrl: dto.twitterUrl,
      portfolioCompanies: dto.portfolioCompanies || [],
      notableExits: dto.notableExits || [],
      isActive: dto.isActive ?? true,
      isFeatured: dto.isFeatured ?? false,
    }));

    const result = await this.db.drizzle.insert(investors).values(values).returning();
    return { created: result.length };
  }

  async getStats(): Promise<{
    total: number;
    byStage: { stage: string; count: number }[];
    bySector: { sector: string; count: number }[];
  }> {
    const all = await this.db.drizzle.select().from(investors).where(eq(investors.isActive, true));

    const byStage = new Map<string, number>();
    const bySector = new Map<string, number>();

    for (const inv of all) {
      byStage.set(inv.stage, (byStage.get(inv.stage) || 0) + 1);
      for (const sector of inv.sectors) {
        bySector.set(sector, (bySector.get(sector) || 0) + 1);
      }
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

  private toResponseDto(investor: Investor): InvestorResponseDto {
    return {
      id: investor.id,
      name: investor.name,
      description: investor.description,
      website: investor.website,
      logoUrl: investor.logoUrl,
      stage: investor.stage as InvestorResponseDto['stage'],
      sectors: investor.sectors,
      checkSizeMin: investor.checkSizeMin,
      checkSizeMax: investor.checkSizeMax,
      location: investor.location,
      regions: investor.regions,
      contactEmail: investor.contactEmail,
      linkedinUrl: investor.linkedinUrl,
      twitterUrl: investor.twitterUrl,
      portfolioCompanies: investor.portfolioCompanies || [],
      notableExits: investor.notableExits || [],
      isActive: investor.isActive,
      isFeatured: investor.isFeatured,
      createdAt: investor.createdAt.toISOString(),
      updatedAt: investor.updatedAt.toISOString(),
    };
  }
}
