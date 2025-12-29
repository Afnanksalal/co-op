import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, ilike, or, gte, inArray } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { leads, Lead, LeadType } from '@/database/schema/outreach.schema';
import { startups } from '@/database/schema/startups.schema';
import { ResearchService } from '@/common/research/research.service';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { CacheService } from '@/common/cache/cache.service';
import {
  DiscoverLeadsDto,
  CreateLeadDto,
  UpdateLeadDto,
  LeadResponseDto,
  LeadFiltersDto,
} from './dto/lead.dto';

// Pilot limits
const PILOT_LEAD_LIMIT = 50;
const DISCOVERY_RATE_LIMIT_KEY = 'outreach:discovery:';
const DISCOVERY_RATE_LIMIT_TTL = 3600;
const DISCOVERY_RATE_LIMIT_MAX = 5;

@Injectable()
export class LeadsService {
  private readonly logger = new Logger(LeadsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly researchService: ResearchService,
    private readonly llmCouncil: LlmCouncilService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Discover potential leads using web research
   * Uses startup data from onboarding - no need to ask again
   */
  async discoverLeads(
    userId: string,
    startupId: string,
    dto: DiscoverLeadsDto,
  ): Promise<LeadResponseDto[]> {
    // Check rate limit
    const rateLimitKey = `${DISCOVERY_RATE_LIMIT_KEY}${userId}`;
    const currentCount = await this.cache.get<number>(rateLimitKey) ?? 0;
    
    if (currentCount >= DISCOVERY_RATE_LIMIT_MAX) {
      throw new BadRequestException(
        `Discovery rate limit reached. You can discover leads ${DISCOVERY_RATE_LIMIT_MAX} times per hour.`
      );
    }

    // Check total lead limit
    const existingLeads = await this.db
      .select()
      .from(leads)
      .where(eq(leads.userId, userId));

    if (existingLeads.length >= PILOT_LEAD_LIMIT) {
      throw new BadRequestException(
        `Pilot users are limited to ${PILOT_LEAD_LIMIT} leads. Delete some leads to discover more.`
      );
    }

    // Get startup info for context (already have from onboarding!)
    const [startup] = await this.db
      .select()
      .from(startups)
      .where(eq(startups.id, startupId));

    if (!startup) {
      throw new NotFoundException('Startup not found');
    }

    const maxLeads = Math.min(dto.maxLeads ?? 10, PILOT_LEAD_LIMIT - existingLeads.length);

    // Build search query based on lead type
    const searchQuery = this.buildSearchQuery(dto, startup);
    this.logger.log(`Discovering ${dto.leadType}s with query: ${searchQuery}`);

    // Use research service to find potential leads
    const webResults = await this.researchService.searchWeb(searchQuery);

    if (webResults.length === 0) {
      this.logger.warn('No web results found for lead discovery');
      return [];
    }

    // Use LLM to extract leads from search results
    const extractedLeads = await this.extractLeadsFromResults(
      webResults,
      dto,
      startup,
      maxLeads,
    );

    // Save leads to database
    const savedLeads: LeadResponseDto[] = [];
    for (const lead of extractedLeads) {
      try {
        const [saved] = await this.db
          .insert(leads)
          .values({
            userId,
            startupId,
            leadType: dto.leadType,
            // Company fields
            companyName: lead.companyName ?? null,
            website: lead.website ?? null,
            industry: lead.industry ?? null,
            companySize: lead.companySize ?? null,
            // Person fields
            name: lead.name ?? null,
            platform: lead.platform ?? null,
            handle: lead.handle ?? null,
            followers: lead.followers ?? null,
            niche: lead.niche ?? dto.targetNiche ?? null,
            // Common fields
            email: lead.email ?? null,
            location: lead.location ?? null,
            description: lead.description ?? null,
            profileUrl: lead.profileUrl ?? null,
            customFields: lead.customFields ?? {},
            leadScore: lead.leadScore ?? 0,
            source: 'discovery',
            tags: [],
          })
          .returning();

        savedLeads.push(this.toResponseDto(saved));
      } catch (error) {
        this.logger.warn(`Failed to save lead:`, error);
      }
    }

    // Update rate limit
    await this.cache.set(rateLimitKey, currentCount + 1, { ttl: DISCOVERY_RATE_LIMIT_TTL });

    this.logger.log(`Discovered and saved ${savedLeads.length} leads`);
    return savedLeads;
  }

  /**
   * Create a lead manually
   */
  async create(
    userId: string,
    startupId: string,
    dto: CreateLeadDto,
  ): Promise<LeadResponseDto> {
    const existingLeads = await this.db
      .select()
      .from(leads)
      .where(eq(leads.userId, userId));

    if (existingLeads.length >= PILOT_LEAD_LIMIT) {
      throw new BadRequestException(
        `Pilot users are limited to ${PILOT_LEAD_LIMIT} leads.`
      );
    }

    const [lead] = await this.db
      .insert(leads)
      .values({
        userId,
        startupId,
        leadType: dto.leadType,
        companyName: dto.companyName ?? null,
        website: dto.website ?? null,
        industry: dto.industry ?? null,
        companySize: dto.companySize ?? null,
        name: dto.name ?? null,
        platform: dto.platform ?? null,
        handle: dto.handle ?? null,
        followers: dto.followers ?? null,
        niche: dto.niche ?? null,
        email: dto.email ?? null,
        location: dto.location ?? null,
        description: dto.description ?? null,
        profileUrl: dto.profileUrl ?? null,
        customFields: dto.customFields ?? {},
        tags: dto.tags ?? [],
        source: dto.source ?? 'manual',
      })
      .returning();

    return this.toResponseDto(lead);
  }

  /**
   * Get all leads for a user with optional filters
   */
  async findAll(userId: string, filters?: LeadFiltersDto): Promise<LeadResponseDto[]> {
    const conditions = [eq(leads.userId, userId)];

    if (filters?.leadType) {
      conditions.push(eq(leads.leadType, filters.leadType));
    }

    if (filters?.status) {
      conditions.push(eq(leads.status, filters.status));
    }

    if (filters?.platform) {
      conditions.push(eq(leads.platform, filters.platform));
    }

    if (filters?.niche) {
      // Escape ILIKE special characters to prevent SQL pattern injection
      const escapedNiche = this.escapeIlikePattern(filters.niche);
      conditions.push(ilike(leads.niche, `%${escapedNiche}%`));
    }

    if (filters?.minScore !== undefined) {
      conditions.push(gte(leads.leadScore, filters.minScore));
    }

    if (filters?.search) {
      // Escape ILIKE special characters to prevent SQL pattern injection
      const escapedSearch = this.escapeIlikePattern(filters.search);
      conditions.push(
        or(
          ilike(leads.name, `%${escapedSearch}%`),
          ilike(leads.companyName, `%${escapedSearch}%`),
          ilike(leads.email, `%${escapedSearch}%`),
          ilike(leads.handle, `%${escapedSearch}%`),
        )!
      );
    }

    const userLeads = await this.db
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.leadScore), desc(leads.createdAt));

    return userLeads.map((lead) => this.toResponseDto(lead));
  }

  // Escape ILIKE special characters
  private escapeIlikePattern(input: string): string {
    return input
      .replace(/\\/g, '\\\\')  // Escape backslashes first
      .replace(/%/g, '\\%')    // Escape percent signs
      .replace(/_/g, '\\_');   // Escape underscores
  }

  /**
   * Get a single lead
   */
  async findOne(userId: string, leadId: string): Promise<LeadResponseDto> {
    const [lead] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return this.toResponseDto(lead);
  }

  /**
   * Update a lead
   */
  async update(
    userId: string,
    leadId: string,
    dto: UpdateLeadDto,
  ): Promise<LeadResponseDto> {
    const [existing] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Lead not found');
    }

    const [updated] = await this.db
      .update(leads)
      .set({ 
        ...dto, 
        customFields: dto.customFields ?? existing.customFields,
        tags: dto.tags ?? existing.tags,
        updatedAt: new Date() 
      })
      .where(eq(leads.id, leadId))
      .returning();

    return this.toResponseDto(updated);
  }

  /**
   * Delete a lead
   */
  async delete(userId: string, leadId: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Lead not found');
    }

    await this.db.delete(leads).where(eq(leads.id, leadId));
  }

  /**
   * Get lead by ID (internal use)
   */
  async getLeadById(leadId: string): Promise<Lead | null> {
    const [lead] = await this.db
      .select()
      .from(leads)
      .where(eq(leads.id, leadId));
    return lead ?? null;
  }

  /**
   * Get multiple leads by IDs - optimized batch query
   */
  async getLeadsByIds(userId: string, leadIds: string[]): Promise<Lead[]> {
    if (leadIds.length === 0) return [];

    // Use IN clause for efficient batch query instead of filtering in memory
    const userLeads = await this.db
      .select()
      .from(leads)
      .where(and(
        eq(leads.userId, userId),
        inArray(leads.id, leadIds),
      ));

    return userLeads;
  }

  /**
   * Get available variables for a lead type
   */
  getAvailableVariables(leadType: LeadType): string[] {
    const common = ['{{email}}', '{{location}}', '{{description}}'];
    const startup = ['{{myCompany}}', '{{myProduct}}', '{{myIndustry}}', '{{myFounder}}', '{{myWebsite}}'];
    
    if (leadType === 'person') {
      return [...common, '{{name}}', '{{platform}}', '{{handle}}', '{{followers}}', '{{niche}}', '{{profileUrl}}', ...startup];
    }
    return [...common, '{{companyName}}', '{{website}}', '{{industry}}', '{{companySize}}', ...startup];
  }

  // Private helpers

  private buildSearchQuery(dto: DiscoverLeadsDto, startup: typeof startups.$inferSelect): string {
    const parts: string[] = [];

    if (dto.leadType === 'person') {
      // Searching for influencers/people
      if (dto.targetPlatforms?.length) {
        parts.push(dto.targetPlatforms.join(' OR '));
      }
      parts.push('influencer OR creator OR expert');
      if (dto.targetNiche) {
        parts.push(dto.targetNiche);
      }
      if (dto.keywords) {
        parts.push(dto.keywords);
      }
      // Use startup context
      parts.push(startup.industry ?? '');
      parts.push('contact email');
    } else {
      // Searching for companies
      parts.push('company OR business OR startup');
      if (dto.targetNiche) {
        parts.push(dto.targetNiche);
      }
      if (dto.keywords) {
        parts.push(dto.keywords);
      }
      // Use startup context for B2B targeting
      if (startup.targetCustomer) {
        parts.push(startup.targetCustomer);
      }
      parts.push(startup.industry ?? '');
      parts.push('contact');
    }

    if (dto.targetLocations?.length) {
      parts.push(`in ${dto.targetLocations.join(' or ')}`);
    }

    return parts.filter(Boolean).join(' ');
  }

  private async extractLeadsFromResults(
    webResults: { title: string; url: string; snippet: string }[],
    dto: DiscoverLeadsDto,
    startup: typeof startups.$inferSelect,
    maxLeads: number,
  ): Promise<Partial<Lead & { leadScore: number }>[]> {
    const isPerson = dto.leadType === 'person';
    
    const prompt = `You are a lead generation expert. Extract ${isPerson ? 'influencers/people' : 'companies'} from these search results.

MY STARTUP CONTEXT (use this to score relevance):
- Company: ${startup.companyName}
- Industry: ${startup.industry}
- Product: ${startup.description}
- Target Customer: ${startup.targetCustomer ?? 'Not specified'}

SEARCH CRITERIA:
- Lead Type: ${dto.leadType}
${isPerson ? `- Target Platforms: ${dto.targetPlatforms?.join(', ') ?? 'Any'}
- Target Niche: ${dto.targetNiche ?? 'Any'}
- Min Followers: ${dto.minFollowers ?? 'Any'}
- Max Followers: ${dto.maxFollowers ?? 'Any'}` : `- Target Industry: ${dto.targetNiche ?? 'Any'}
- Target Company Sizes: ${dto.targetCompanySizes?.join(', ') ?? 'Any'}`}
- Target Locations: ${dto.targetLocations?.join(', ') ?? 'Any'}

WEB RESULTS:
${webResults.map((r, i) => `${i + 1}. ${r.title}\n   URL: ${r.url}\n   ${r.snippet}`).join('\n\n')}

Extract up to ${maxLeads} leads. For each lead, provide:
${isPerson ? `- name: Full name
- platform: Primary platform (youtube, twitter, linkedin, instagram, tiktok)
- handle: Username/handle (e.g., @username)
- followers: Estimated follower count (number)
- niche: Their content niche
- email: Email if found (or null)
- location: Location if found
- description: Brief description
- profileUrl: Profile URL
- leadScore: 0-100 based on relevance to my startup` : `- companyName: Company name
- website: Company website
- industry: Industry/sector
- companySize: Size (1-10, 11-50, 51-200, 201-500, 500+)
- email: Contact email if found
- location: Location
- description: What they do
- leadScore: 0-100 based on fit as potential customer`}

Return ONLY a JSON array. No explanation.`;

    try {
      const result = await this.llmCouncil.runCouncil(
        'You are a lead extraction assistant. Return only valid JSON array.',
        prompt,
        { minModels: 1, maxModels: 2, maxTokens: 2000, temperature: 0.3 },
      );

      const jsonMatch = /\[[\s\S]*\]/.exec(result.finalResponse);
      if (!jsonMatch) {
        this.logger.warn('No JSON array found in LLM response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]) as Partial<Lead & { leadScore: number }>[];
      return parsed.slice(0, maxLeads);
    } catch (error) {
      this.logger.error('Failed to extract leads from results:', error);
      return [];
    }
  }

  private toResponseDto(lead: Lead): LeadResponseDto {
    const displayName = lead.leadType === 'person' 
      ? (lead.name ?? lead.handle ?? 'Unknown')
      : (lead.companyName ?? 'Unknown Company');

    return {
      id: lead.id,
      leadType: lead.leadType ?? 'company',
      companyName: lead.companyName,
      website: lead.website,
      industry: lead.industry,
      companySize: lead.companySize,
      name: lead.name,
      platform: lead.platform,
      handle: lead.handle,
      followers: lead.followers,
      niche: lead.niche,
      email: lead.email,
      location: lead.location,
      description: lead.description,
      profileUrl: lead.profileUrl,
      customFields: (lead.customFields) ?? {},
      leadScore: lead.leadScore ?? 0,
      status: lead.status ?? 'new',
      source: lead.source,
      tags: (lead.tags) ?? [],
      createdAt: lead.createdAt.toISOString(),
      displayName,
    };
  }
}
