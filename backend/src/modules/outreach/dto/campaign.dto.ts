import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsUUID, IsNumber, MaxLength, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CAMPAIGN_STATUSES, CAMPAIGN_MODES, LEAD_TYPES, CampaignStatus, CampaignMode, LeadType } from '@/database/schema/outreach.schema';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ enum: CAMPAIGN_MODES, description: 'single_template = 1 email to N leads, ai_personalized = N unique emails' })
  @IsEnum(CAMPAIGN_MODES)
  mode: CampaignMode;

  @ApiProperty({ enum: LEAD_TYPES, description: 'Target lead type' })
  @IsEnum(LEAD_TYPES)
  targetLeadType: LeadType;

  // For single_template mode
  @ApiPropertyOptional({ description: 'Email subject template with variables like {{name}}' })
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiPropertyOptional({ description: 'Email body template with variables' })
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  // For ai_personalized mode
  @ApiPropertyOptional({ description: 'What you want to achieve with this campaign' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  campaignGoal?: string;

  @ApiPropertyOptional({ enum: ['professional', 'casual', 'friendly', 'bold'], default: 'professional' })
  @IsOptional()
  @IsEnum(['professional', 'casual', 'friendly', 'bold'])
  tone?: 'professional' | 'casual' | 'friendly' | 'bold';

  @ApiPropertyOptional({ description: 'What action you want recipients to take' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  callToAction?: string;

  // Settings
  @ApiPropertyOptional({ description: 'Track email opens', default: true })
  @IsOptional()
  @IsBoolean()
  trackOpens?: boolean;

  @ApiPropertyOptional({ description: 'Track link clicks', default: true })
  @IsOptional()
  @IsBoolean()
  trackClicks?: boolean;

  @ApiPropertyOptional({ description: 'Daily sending limit', default: 50 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  dailyLimit?: number;

  @ApiPropertyOptional({ description: 'Include unsubscribe link', default: true })
  @IsOptional()
  @IsBoolean()
  includeUnsubscribeLink?: boolean;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bodyTemplate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  campaignGoal?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['professional', 'casual', 'friendly', 'bold'])
  tone?: 'professional' | 'casual' | 'friendly' | 'bold';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  callToAction?: string;

  @ApiPropertyOptional({ enum: CAMPAIGN_STATUSES })
  @IsOptional()
  @IsEnum(CAMPAIGN_STATUSES)
  status?: CampaignStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackOpens?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  trackClicks?: boolean;
}

export class GenerateEmailsDto {
  @ApiProperty({ description: 'Lead IDs to generate emails for' })
  @IsArray()
  @IsUUID('4', { each: true })
  leadIds: string[];
}

export class PreviewEmailDto {
  @ApiProperty({ description: 'Lead ID to preview email for' })
  @IsUUID('4')
  leadId: string;
}

export class CampaignResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  mode: CampaignMode;

  @ApiProperty()
  targetLeadType: LeadType;

  @ApiPropertyOptional()
  subjectTemplate: string | null;

  @ApiPropertyOptional()
  bodyTemplate: string | null;

  @ApiPropertyOptional()
  campaignGoal: string | null;

  @ApiPropertyOptional()
  tone: string | null;

  @ApiPropertyOptional()
  callToAction: string | null;

  @ApiProperty()
  status: CampaignStatus;

  @ApiProperty()
  settings: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    dailyLimit?: number;
    includeUnsubscribeLink?: boolean;
  };

  @ApiProperty()
  availableVariables: string[];

  @ApiProperty()
  stats: {
    totalEmails?: number;
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
  };

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class CampaignEmailResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  leadId: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  sentAt: string | null;

  @ApiPropertyOptional()
  openedAt: string | null;

  @ApiPropertyOptional()
  clickedAt: string | null;

  @ApiProperty()
  createdAt: string;

  // Include lead info for display
  @ApiPropertyOptional()
  leadName?: string;

  @ApiPropertyOptional()
  leadEmail?: string;
}

export class CampaignStatsDto {
  @ApiProperty()
  totalEmails: number;

  @ApiProperty()
  sent: number;

  @ApiProperty()
  delivered: number;

  @ApiProperty()
  opened: number;

  @ApiProperty()
  clicked: number;

  @ApiProperty()
  bounced: number;

  @ApiProperty()
  openRate: number;

  @ApiProperty()
  clickRate: number;

  @ApiProperty()
  bounceRate: number;
}

export class EmailPreviewDto {
  @ApiProperty()
  subject: string;

  @ApiProperty()
  body: string;

  @ApiProperty()
  leadName: string;

  @ApiProperty()
  variables: Record<string, string>;
}

export class UpdateCampaignEmailDto {
  @ApiPropertyOptional({ description: 'Updated email subject' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;

  @ApiPropertyOptional({ description: 'Updated email body' })
  @IsOptional()
  @IsString()
  body?: string;
}

export class RegenerateEmailDto {
  @ApiPropertyOptional({ description: 'Custom instructions for regeneration' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customInstructions?: string;
}
