import {
  Injectable,
  Inject,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { DATABASE_CONNECTION } from '@/database/database.module';
import * as schema from '@/database/schema';
import { campaigns, campaignEmails, leads, Campaign, CampaignEmail, Lead } from '@/database/schema/outreach.schema';
import { startups } from '@/database/schema/startups.schema';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { EmailService } from '@/common/email/email.service';
import { LeadsService } from './leads.service';
import {
  CreateCampaignDto,
  UpdateCampaignDto,
  GenerateEmailsDto,
  PreviewEmailDto,
  CampaignResponseDto,
  CampaignEmailResponseDto,
  CampaignStatsDto,
  EmailPreviewDto,
  UpdateCampaignEmailDto,
  RegenerateEmailDto,
} from './dto/campaign.dto';

const PILOT_CAMPAIGN_LIMIT = 5;
const PILOT_EMAILS_PER_DAY = 50;

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly llmCouncil: LlmCouncilService,
    private readonly emailService: EmailService,
    private readonly leadsService: LeadsService,
  ) {}

  /**
   * Create a new campaign
   */
  async create(
    userId: string,
    startupId: string,
    dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const existingCampaigns = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId));

    if (existingCampaigns.length >= PILOT_CAMPAIGN_LIMIT) {
      throw new BadRequestException(
        `Pilot users are limited to ${PILOT_CAMPAIGN_LIMIT} campaigns.`
      );
    }

    // Validate based on mode
    if (dto.mode === 'single_template') {
      if (!dto.subjectTemplate || !dto.bodyTemplate) {
        throw new BadRequestException('Subject and body templates are required for single_template mode');
      }
    } else if (dto.mode === 'ai_personalized') {
      if (!dto.campaignGoal) {
        throw new BadRequestException('Campaign goal is required for ai_personalized mode');
      }
    }

    // Get available variables for this lead type
    const availableVariables = this.leadsService.getAvailableVariables(dto.targetLeadType);

    const [campaign] = await this.db
      .insert(campaigns)
      .values({
        userId,
        startupId,
        name: dto.name,
        mode: dto.mode,
        targetLeadType: dto.targetLeadType,
        subjectTemplate: dto.subjectTemplate ?? null,
        bodyTemplate: dto.bodyTemplate ?? null,
        campaignGoal: dto.campaignGoal ?? null,
        tone: dto.tone ?? 'professional',
        callToAction: dto.callToAction ?? null,
        availableVariables,
        settings: {
          trackOpens: dto.trackOpens ?? true,
          trackClicks: dto.trackClicks ?? true,
          dailyLimit: dto.dailyLimit ?? PILOT_EMAILS_PER_DAY,
          includeUnsubscribeLink: dto.includeUnsubscribeLink ?? true,
        },
        stats: { totalEmails: 0, sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0 },
      })
      .returning();

    return this.toResponseDto(campaign);
  }

  /**
   * Get all campaigns for a user
   */
  async findAll(userId: string): Promise<CampaignResponseDto[]> {
    const userCampaigns = await this.db
      .select()
      .from(campaigns)
      .where(eq(campaigns.userId, userId))
      .orderBy(desc(campaigns.createdAt));

    return userCampaigns.map((campaign) => this.toResponseDto(campaign));
  }

  /**
   * Get a single campaign
   */
  async findOne(userId: string, campaignId: string): Promise<CampaignResponseDto> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    return this.toResponseDto(campaign);
  }

  /**
   * Update a campaign
   */
  async update(
    userId: string,
    campaignId: string,
    dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    const [existing] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    if (existing.status !== 'draft' && (dto.subjectTemplate || dto.bodyTemplate)) {
      throw new BadRequestException('Cannot modify template of active campaign');
    }

    const updateData: Partial<Campaign> = { updatedAt: new Date() };
    if (dto.name) updateData.name = dto.name;
    if (dto.subjectTemplate !== undefined) updateData.subjectTemplate = dto.subjectTemplate;
    if (dto.bodyTemplate !== undefined) updateData.bodyTemplate = dto.bodyTemplate;
    if (dto.campaignGoal !== undefined) updateData.campaignGoal = dto.campaignGoal;
    if (dto.tone !== undefined) updateData.tone = dto.tone;
    if (dto.callToAction !== undefined) updateData.callToAction = dto.callToAction;
    if (dto.status) updateData.status = dto.status;

    if (dto.trackOpens !== undefined || dto.trackClicks !== undefined) {
      updateData.settings = {
        ...existing.settings,
        ...(dto.trackOpens !== undefined && { trackOpens: dto.trackOpens }),
        ...(dto.trackClicks !== undefined && { trackClicks: dto.trackClicks }),
      };
    }

    const [updated] = await this.db
      .update(campaigns)
      .set(updateData)
      .where(eq(campaigns.id, campaignId))
      .returning();

    return this.toResponseDto(updated);
  }

  /**
   * Delete a campaign
   */
  async delete(userId: string, campaignId: string): Promise<void> {
    const [existing] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!existing) {
      throw new NotFoundException('Campaign not found');
    }

    await this.db.delete(campaigns).where(eq(campaigns.id, campaignId));
  }

  /**
   * Preview email for a specific lead
   */
  async previewEmail(
    userId: string,
    campaignId: string,
    dto: PreviewEmailDto,
  ): Promise<EmailPreviewDto> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const lead = await this.leadsService.getLeadById(dto.leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Get startup for variables
    const [startup] = await this.db
      .select()
      .from(startups)
      .where(eq(startups.id, campaign.startupId));

    const variables = this.buildVariables(lead, startup);
    
    let subject: string;
    let body: string;

    if (campaign.mode === 'single_template') {
      subject = this.applyVariables(campaign.subjectTemplate ?? '', variables);
      body = this.applyVariables(campaign.bodyTemplate ?? '', variables);
    } else {
      // AI personalized - generate unique email
      const generated = await this.generatePersonalizedEmail(campaign, lead, startup);
      subject = generated.subject;
      body = generated.body;
    }

    const leadName = lead.leadType === 'person' 
      ? (lead.name ?? lead.handle ?? 'Unknown')
      : (lead.companyName ?? 'Unknown');

    return {
      subject,
      body,
      leadName,
      variables,
    };
  }

  /**
   * Generate emails for leads
   */
  async generateEmails(
    userId: string,
    campaignId: string,
    dto: GenerateEmailsDto,
  ): Promise<CampaignEmailResponseDto[]> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const leadsList = await this.leadsService.getLeadsByIds(userId, dto.leadIds);
    if (leadsList.length === 0) {
      throw new BadRequestException('No valid leads found');
    }

    // Get startup for variables
    const [startup] = await this.db
      .select()
      .from(startups)
      .where(eq(startups.id, campaign.startupId));

    const generatedEmails: CampaignEmailResponseDto[] = [];

    for (const lead of leadsList) {
      // Check if email already exists
      const [existing] = await this.db
        .select()
        .from(campaignEmails)
        .where(and(
          eq(campaignEmails.campaignId, campaignId),
          eq(campaignEmails.leadId, lead.id),
        ));

      if (existing) {
        generatedEmails.push(this.toEmailResponseDto(existing, lead));
        continue;
      }

      let subject: string;
      let body: string;

      if (campaign.mode === 'single_template') {
        // Apply template variables
        const variables = this.buildVariables(lead, startup);
        subject = this.applyVariables(campaign.subjectTemplate ?? '', variables);
        body = this.applyVariables(campaign.bodyTemplate ?? '', variables);
      } else {
        // AI personalized - generate unique email for each lead
        const generated = await this.generatePersonalizedEmail(campaign, lead, startup);
        subject = generated.subject;
        body = generated.body;
      }

      const [email] = await this.db
        .insert(campaignEmails)
        .values({
          campaignId,
          leadId: lead.id,
          subject,
          body,
          trackingId: randomUUID(),
        })
        .returning();

      generatedEmails.push(this.toEmailResponseDto(email, lead));
    }

    // Update campaign stats
    const totalEmails = await this.db
      .select()
      .from(campaignEmails)
      .where(eq(campaignEmails.campaignId, campaignId));

    await this.db
      .update(campaigns)
      .set({
        stats: { ...campaign.stats, totalEmails: totalEmails.length },
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    return generatedEmails;
  }

  /**
   * Get emails for a campaign
   */
  async getEmails(userId: string, campaignId: string): Promise<CampaignEmailResponseDto[]> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const emails = await this.db
      .select()
      .from(campaignEmails)
      .where(eq(campaignEmails.campaignId, campaignId))
      .orderBy(desc(campaignEmails.createdAt));

    if (emails.length === 0) {
      return [];
    }

    // Batch fetch all leads at once to avoid N+1 query
    const leadIds = [...new Set(emails.map(e => e.leadId))];
    const leadsData = await this.leadsService.getLeadsByIds(userId, leadIds);
    const leadsMap = new Map(leadsData.map(l => [l.id, l]));

    return emails.map(email => this.toEmailResponseDto(email, leadsMap.get(email.leadId) ?? null));
  }

  /**
   * Send campaign emails
   */
  async sendCampaign(userId: string, campaignId: string): Promise<{ sent: number; failed: number }> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const pendingEmails = await this.db
      .select()
      .from(campaignEmails)
      .where(and(
        eq(campaignEmails.campaignId, campaignId),
        eq(campaignEmails.status, 'pending'),
      ));

    if (pendingEmails.length === 0) {
      throw new BadRequestException('No pending emails to send');
    }

    const dailyLimit = campaign.settings?.dailyLimit ?? PILOT_EMAILS_PER_DAY;
    const toSend = pendingEmails.slice(0, dailyLimit);

    // Batch fetch all leads at once to avoid N+1 query
    const leadIds = [...new Set(toSend.map(e => e.leadId))];
    const leadsData = await this.leadsService.getLeadsByIds(userId, leadIds);
    const leadsMap = new Map(leadsData.map(l => [l.id, l]));

    let sent = 0;
    let failed = 0;

    await this.db
      .update(campaigns)
      .set({ status: 'sending', updatedAt: new Date() })
      .where(eq(campaigns.id, campaignId));

    for (const email of toSend) {
      const lead = leadsMap.get(email.leadId) ?? null;
      
      if (!lead) {
        await this.db
          .update(campaignEmails)
          .set({ status: 'failed', errorMessage: 'Lead not found' })
          .where(eq(campaignEmails.id, email.id));
        failed++;
        continue;
      }

      if (!lead.email) {
        await this.db
          .update(campaignEmails)
          .set({ status: 'failed', errorMessage: 'No email address for lead' })
          .where(eq(campaignEmails.id, email.id));
        failed++;
        continue;
      }

      try {
        const success = await this.emailService.send({
          to: lead.email,
          subject: email.subject,
          html: this.formatEmailHtml(email.body, email.trackingId!, campaign.settings?.includeUnsubscribeLink ?? true),
          text: email.body,
        });

        if (success) {
          await this.db
            .update(campaignEmails)
            .set({ status: 'sent', sentAt: new Date() })
            .where(eq(campaignEmails.id, email.id));
          sent++;

          await this.db
            .update(leads)
            .set({ status: 'contacted', updatedAt: new Date() })
            .where(eq(leads.id, lead.id));
        } else {
          await this.db
            .update(campaignEmails)
            .set({ status: 'failed', errorMessage: 'Send failed' })
            .where(eq(campaignEmails.id, email.id));
          failed++;
        }
      } catch (error) {
        this.logger.error(`Failed to send email ${email.id}:`, error);
        await this.db
          .update(campaignEmails)
          .set({ 
            status: 'failed', 
            errorMessage: error instanceof Error ? error.message : 'Unknown error' 
          })
          .where(eq(campaignEmails.id, email.id));
        failed++;
      }
    }

    // Update campaign stats
    const currentStats = campaign.stats ?? {};
    await this.db
      .update(campaigns)
      .set({
        status: sent > 0 ? 'sending' : 'draft',
        stats: {
          ...currentStats,
          sent: (currentStats.sent ?? 0) + sent,
        },
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));

    return { sent, failed };
  }

  /**
   * Get campaign statistics
   */
  async getStats(userId: string, campaignId: string): Promise<CampaignStatsDto> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const stats = campaign.stats ?? {};
    const sent = stats.sent ?? 0;
    const opened = stats.opened ?? 0;
    const clicked = stats.clicked ?? 0;
    const bounced = stats.bounced ?? 0;

    return {
      totalEmails: stats.totalEmails ?? 0,
      sent,
      delivered: stats.delivered ?? sent - bounced,
      opened,
      clicked,
      bounced,
      openRate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
      clickRate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
      bounceRate: sent > 0 ? Math.round((bounced / sent) * 100) : 0,
    };
  }

  /**
   * Get a single email by ID
   */
  async getEmail(userId: string, campaignId: string, emailId: string): Promise<CampaignEmailResponseDto> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [email] = await this.db
      .select()
      .from(campaignEmails)
      .where(and(eq(campaignEmails.id, emailId), eq(campaignEmails.campaignId, campaignId)));

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    const lead = await this.leadsService.getLeadById(email.leadId);
    return this.toEmailResponseDto(email, lead);
  }

  /**
   * Update a campaign email (subject/body)
   */
  async updateEmail(
    userId: string,
    campaignId: string,
    emailId: string,
    dto: UpdateCampaignEmailDto,
  ): Promise<CampaignEmailResponseDto> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [email] = await this.db
      .select()
      .from(campaignEmails)
      .where(and(eq(campaignEmails.id, emailId), eq(campaignEmails.campaignId, campaignId)));

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    if (email.status !== 'pending') {
      throw new BadRequestException('Cannot edit an email that has already been sent');
    }

    const updateData: Partial<CampaignEmail> = {};
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.body !== undefined) updateData.body = dto.body;

    const [updated] = await this.db
      .update(campaignEmails)
      .set(updateData)
      .where(eq(campaignEmails.id, emailId))
      .returning();

    const lead = await this.leadsService.getLeadById(updated.leadId);
    return this.toEmailResponseDto(updated, lead);
  }

  /**
   * Regenerate a campaign email using AI
   */
  async regenerateEmail(
    userId: string,
    campaignId: string,
    emailId: string,
    dto: RegenerateEmailDto,
  ): Promise<CampaignEmailResponseDto> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [email] = await this.db
      .select()
      .from(campaignEmails)
      .where(and(eq(campaignEmails.id, emailId), eq(campaignEmails.campaignId, campaignId)));

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    if (email.status !== 'pending') {
      throw new BadRequestException('Cannot regenerate an email that has already been sent');
    }

    const lead = await this.leadsService.getLeadById(email.leadId);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Get startup for variables
    const [startup] = await this.db
      .select()
      .from(startups)
      .where(eq(startups.id, campaign.startupId));

    let subject: string;
    let body: string;

    if (campaign.mode === 'single_template') {
      // For template mode, just re-apply variables
      const variables = this.buildVariables(lead, startup);
      subject = this.applyVariables(campaign.subjectTemplate ?? '', variables);
      body = this.applyVariables(campaign.bodyTemplate ?? '', variables);
    } else {
      // AI personalized - regenerate with optional custom instructions
      const generated = await this.generatePersonalizedEmail(
        campaign, 
        lead, 
        startup, 
        dto.customInstructions
      );
      subject = generated.subject;
      body = generated.body;
    }

    const [updated] = await this.db
      .update(campaignEmails)
      .set({ subject, body })
      .where(eq(campaignEmails.id, emailId))
      .returning();

    return this.toEmailResponseDto(updated, lead);
  }

  /**
   * Delete a single campaign email
   */
  async deleteEmail(userId: string, campaignId: string, emailId: string): Promise<void> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [email] = await this.db
      .select()
      .from(campaignEmails)
      .where(and(eq(campaignEmails.id, emailId), eq(campaignEmails.campaignId, campaignId)));

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    if (email.status !== 'pending') {
      throw new BadRequestException('Cannot delete an email that has already been sent');
    }

    await this.db.delete(campaignEmails).where(eq(campaignEmails.id, emailId));

    // Update campaign stats
    const totalEmails = await this.db
      .select()
      .from(campaignEmails)
      .where(eq(campaignEmails.campaignId, campaignId));

    await this.db
      .update(campaigns)
      .set({
        stats: { ...campaign.stats, totalEmails: totalEmails.length },
        updatedAt: new Date(),
      })
      .where(eq(campaigns.id, campaignId));
  }

  /**
   * Send a single email
   */
  async sendSingleEmail(userId: string, campaignId: string, emailId: string): Promise<{ success: boolean }> {
    const [campaign] = await this.db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)));

    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const [email] = await this.db
      .select()
      .from(campaignEmails)
      .where(and(eq(campaignEmails.id, emailId), eq(campaignEmails.campaignId, campaignId)));

    if (!email) {
      throw new NotFoundException('Email not found');
    }

    if (email.status !== 'pending') {
      throw new BadRequestException('Email has already been sent or failed');
    }

    const lead = await this.leadsService.getLeadById(email.leadId);
    if (!lead || !lead.email) {
      throw new BadRequestException('Lead has no email address');
    }

    try {
      const success = await this.emailService.send({
        to: lead.email,
        subject: email.subject,
        html: this.formatEmailHtml(email.body, email.trackingId!, campaign.settings?.includeUnsubscribeLink ?? true),
        text: email.body,
      });

      if (success) {
        await this.db
          .update(campaignEmails)
          .set({ status: 'sent', sentAt: new Date() })
          .where(eq(campaignEmails.id, email.id));

        await this.db
          .update(leads)
          .set({ status: 'contacted', updatedAt: new Date() })
          .where(eq(leads.id, lead.id));

        // Update campaign stats
        const currentStats = campaign.stats ?? {};
        await this.db
          .update(campaigns)
          .set({
            stats: { ...currentStats, sent: (currentStats.sent ?? 0) + 1 },
            updatedAt: new Date(),
          })
          .where(eq(campaigns.id, campaignId));

        return { success: true };
      } else {
        await this.db
          .update(campaignEmails)
          .set({ status: 'failed', errorMessage: 'Send failed' })
          .where(eq(campaignEmails.id, email.id));
        return { success: false };
      }
    } catch (error) {
      this.logger.error(`Failed to send email ${email.id}:`, error);
      await this.db
        .update(campaignEmails)
        .set({ 
          status: 'failed', 
          errorMessage: error instanceof Error ? error.message : 'Unknown error' 
        })
        .where(eq(campaignEmails.id, email.id));
      throw error;
    }
  }

  // Private helpers

  private buildVariables(lead: Lead, startup: typeof startups.$inferSelect | undefined): Record<string, string> {
    const vars: Record<string, string> = {};

    // Lead variables
    if (lead.leadType === 'person') {
      vars.name = lead.name ?? '';
      vars.platform = lead.platform ?? '';
      vars.handle = lead.handle ?? '';
      vars.followers = lead.followers?.toString() ?? '';
      vars.niche = lead.niche ?? '';
      vars.profileUrl = lead.profileUrl ?? '';
    } else {
      vars.companyName = lead.companyName ?? '';
      vars.website = lead.website ?? '';
      vars.industry = lead.industry ?? '';
      vars.companySize = lead.companySize ?? '';
    }

    // Common lead variables
    vars.email = lead.email ?? '';
    vars.location = lead.location ?? '';
    vars.description = lead.description ?? '';

    // Custom fields
    const customFields = (lead.customFields) ?? {};
    for (const [key, value] of Object.entries(customFields)) {
      vars[key] = value;
    }

    // Startup variables
    if (startup) {
      vars.myCompany = startup.companyName ?? '';
      vars.myProduct = startup.description ?? '';
      vars.myIndustry = startup.industry ?? '';
      vars.myFounder = startup.founderName ?? '';
      vars.myWebsite = startup.website ?? '';
    }

    return vars;
  }

  private applyVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  private async generatePersonalizedEmail(
    campaign: Campaign,
    lead: Lead,
    startup: typeof startups.$inferSelect | undefined,
    customInstructions?: string,
  ): Promise<{ subject: string; body: string }> {
    const isPerson = lead.leadType === 'person';
    const leadInfo = isPerson
      ? `Name: ${lead.name ?? 'Unknown'}
Platform: ${lead.platform ?? 'Unknown'}
Handle: ${lead.handle ?? ''}
Followers: ${lead.followers ?? 'Unknown'}
Niche: ${lead.niche ?? 'Unknown'}`
      : `Company: ${lead.companyName ?? 'Unknown'}
Industry: ${lead.industry ?? 'Unknown'}
Size: ${lead.companySize ?? 'Unknown'}`;

    const customPart = customInstructions 
      ? `\n\nADDITIONAL INSTRUCTIONS: ${customInstructions}` 
      : '';

    const prompt = `Write a personalized cold email for outreach.

MY STARTUP:
- Company: ${startup?.companyName ?? 'My Company'}
- Product: ${startup?.description ?? 'Our product'}
- Industry: ${startup?.industry ?? 'Tech'}
- Founder: ${startup?.founderName ?? 'Founder'}

RECIPIENT (${isPerson ? 'Influencer/Person' : 'Company'}):
${leadInfo}
Location: ${lead.location ?? 'Unknown'}
Description: ${lead.description ?? 'No description'}

CAMPAIGN GOAL: ${campaign.campaignGoal}
TONE: ${campaign.tone ?? 'professional'}
CALL TO ACTION: ${campaign.callToAction ?? 'Schedule a quick call'}${customPart}

Write a highly personalized email that:
1. Opens with something specific about THEM (not generic)
2. Connects their work/niche to our product naturally
3. Provides clear value proposition for THEM
4. Ends with the specified call to action
5. Is under 150 words
6. Sounds human, not templated

Return JSON only:
{
  "subject": "Compelling subject line (under 60 chars)",
  "body": "Email body with proper formatting"
}`;

    try {
      const result = await this.llmCouncil.runCouncil(
        'You are an expert cold email copywriter. Return only valid JSON.',
        prompt,
        { minModels: 1, maxModels: 2, maxTokens: 800, temperature: 0.7 },
      );

      const jsonMatch = /\{[\s\S]*\}/.exec(result.finalResponse);
      if (!jsonMatch) {
        throw new Error('No JSON found');
      }

      return JSON.parse(jsonMatch[0]) as { subject: string; body: string };
    } catch (error) {
      this.logger.error('Failed to generate personalized email:', error);
      // Fallback to template if AI fails
      const variables = this.buildVariables(lead, startup);
      return {
        subject: `Quick question for ${variables.name ?? variables.companyName ?? 'you'}`,
        body: `Hi ${variables.name ?? 'there'},\n\n${campaign.campaignGoal ?? 'I wanted to reach out.'}\n\n${campaign.callToAction ?? 'Would love to connect!'}\n\nBest,\n${startup?.founderName ?? 'Team'}`,
      };
    }
  }

  private formatEmailHtml(body: string, trackingId: string, includeUnsubscribe: boolean): string {
    const htmlBody = body.replace(/\n/g, '<br>');
    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const trackingPixelUrl = `${appUrl}/api/v1/outreach/track/open/${trackingId}`;
    const unsubscribeUrl = `${appUrl}/api/v1/outreach/unsubscribe/${trackingId}`;
    
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
${htmlBody}
${includeUnsubscribe ? `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
<p>If you'd prefer not to receive these emails, <a href="${unsubscribeUrl}">unsubscribe here</a>.</p>
</div>` : ''}
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />
</body>
</html>`;
  }

  private toResponseDto(campaign: Campaign): CampaignResponseDto {
    return {
      id: campaign.id,
      name: campaign.name,
      mode: campaign.mode ?? 'single_template',
      targetLeadType: campaign.targetLeadType ?? 'person',
      subjectTemplate: campaign.subjectTemplate,
      bodyTemplate: campaign.bodyTemplate,
      campaignGoal: campaign.campaignGoal,
      tone: campaign.tone,
      callToAction: campaign.callToAction,
      status: campaign.status ?? 'draft',
      settings: campaign.settings ?? {},
      availableVariables: (campaign.availableVariables) ?? [],
      stats: campaign.stats ?? {},
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
    };
  }

  private toEmailResponseDto(email: CampaignEmail, lead: Lead | null): CampaignEmailResponseDto {
    const leadName = lead 
      ? (lead.leadType === 'person' ? (lead.name ?? lead.handle) : lead.companyName)
      : null;

    return {
      id: email.id,
      leadId: email.leadId,
      subject: email.subject,
      body: email.body,
      status: email.status ?? 'pending',
      sentAt: email.sentAt?.toISOString() ?? null,
      openedAt: email.openedAt?.toISOString() ?? null,
      clickedAt: email.clickedAt?.toISOString() ?? null,
      createdAt: email.createdAt.toISOString(),
      leadName: leadName ?? undefined,
      leadEmail: lead?.email ?? undefined,
    };
  }
}
