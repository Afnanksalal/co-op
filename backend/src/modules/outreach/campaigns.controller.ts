import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { UserThrottleGuard } from '@/common/guards/user-throttle.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { CampaignsService } from './campaigns.service';
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

@ApiTags('Outreach - Campaigns')
@ApiBearerAuth()
@Controller('outreach/campaigns')
@UseGuards(AuthGuard, UserThrottleGuard)
@RateLimit(RateLimitPresets.STANDARD) // Default: 100 req/min
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post(':id/preview')
  @RateLimit({ limit: 20, ttl: 3600 }) // 20 previews per hour
  @ApiOperation({ summary: 'Preview email for a specific lead' })
  @ApiParam({ name: 'id', type: 'string' })
  async previewEmail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: PreviewEmailDto,
  ): Promise<EmailPreviewDto> {
    return this.campaignsService.previewEmail(userId, campaignId, dto);
  }

  @Post()
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(
    @CurrentUser('id') userId: string,
    @CurrentUser('startupId') startupId: string | null,
    @Body() dto: CreateCampaignDto,
  ): Promise<CampaignResponseDto> {
    if (!startupId) {
      throw new BadRequestException('Startup not found. Please complete onboarding first.');
    }
    return this.campaignsService.create(userId, startupId, dto);
  }

  @Get()
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get all campaigns for current user' })
  async findAll(@CurrentUser('id') userId: string): Promise<CampaignResponseDto[]> {
    return this.campaignsService.findAll(userId);
  }

  @Get(':id')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get a specific campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.findOne(userId, campaignId);
  }

  @Patch(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: UpdateCampaignDto,
  ): Promise<CampaignResponseDto> {
    return this.campaignsService.update(userId, campaignId, dto);
  }

  @Delete(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
  ): Promise<{ success: boolean }> {
    await this.campaignsService.delete(userId, campaignId);
    return { success: true };
  }

  @Post(':id/generate-emails')
  @RateLimit({ limit: 10, ttl: 3600 })
  @ApiOperation({ summary: 'Generate personalized emails for leads' })
  @ApiParam({ name: 'id', type: 'string' })
  async generateEmails(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() dto: GenerateEmailsDto,
  ): Promise<CampaignEmailResponseDto[]> {
    return this.campaignsService.generateEmails(userId, campaignId, dto);
  }

  @Get(':id/emails')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get all emails for a campaign' })
  @ApiParam({ name: 'id', type: 'string' })
  async getEmails(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignEmailResponseDto[]> {
    return this.campaignsService.getEmails(userId, campaignId);
  }

  @Post(':id/send')
  @RateLimit({ limit: 5, ttl: 3600 }) // 5 sends per hour
  @ApiOperation({ summary: 'Send campaign emails' })
  @ApiParam({ name: 'id', type: 'string' })
  async send(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
  ): Promise<{ sent: number; failed: number }> {
    return this.campaignsService.sendCampaign(userId, campaignId);
  }

  @Get(':id/stats')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get campaign statistics' })
  @ApiParam({ name: 'id', type: 'string' })
  async getStats(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
  ): Promise<CampaignStatsDto> {
    return this.campaignsService.getStats(userId, campaignId);
  }

  @Get(':id/emails/:emailId')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get a single campaign email' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'emailId', type: 'string' })
  async getEmail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
  ): Promise<CampaignEmailResponseDto> {
    return this.campaignsService.getEmail(userId, campaignId, emailId);
  }

  @Patch(':id/emails/:emailId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update a campaign email (subject/body)' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'emailId', type: 'string' })
  async updateEmail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
    @Body() dto: UpdateCampaignEmailDto,
  ): Promise<CampaignEmailResponseDto> {
    return this.campaignsService.updateEmail(userId, campaignId, emailId, dto);
  }

  @Post(':id/emails/:emailId/regenerate')
  @RateLimit({ limit: 20, ttl: 3600 }) // 20 regenerations per hour
  @ApiOperation({ summary: 'Regenerate a campaign email using AI' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'emailId', type: 'string' })
  async regenerateEmail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
    @Body() dto: RegenerateEmailDto,
  ): Promise<CampaignEmailResponseDto> {
    return this.campaignsService.regenerateEmail(userId, campaignId, emailId, dto);
  }

  @Delete(':id/emails/:emailId')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete a campaign email' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'emailId', type: 'string' })
  async deleteEmail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
  ): Promise<{ success: boolean }> {
    await this.campaignsService.deleteEmail(userId, campaignId, emailId);
    return { success: true };
  }

  @Post(':id/emails/:emailId/send')
  @RateLimit({ limit: 50, ttl: 3600 }) // 50 individual sends per hour
  @ApiOperation({ summary: 'Send a single campaign email' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiParam({ name: 'emailId', type: 'string' })
  async sendSingleEmail(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Param('emailId', ParseUUIDPipe) emailId: string,
  ): Promise<{ success: boolean }> {
    return this.campaignsService.sendSingleEmail(userId, campaignId, emailId);
  }
}
