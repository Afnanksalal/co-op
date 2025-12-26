import { IsString, IsOptional, IsArray, IsNumber, IsEnum, IsObject, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LEAD_STATUSES, LEAD_TYPES, LeadStatus, LeadType } from '@/database/schema/outreach.schema';

export class DiscoverLeadsDto {
  @ApiProperty({ enum: LEAD_TYPES, description: 'Type of leads to discover' })
  @IsEnum(LEAD_TYPES)
  leadType: LeadType;

  @ApiPropertyOptional({ description: 'Target industry/niche for leads' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  targetNiche?: string;

  @ApiPropertyOptional({ description: 'Target platforms (for influencers)', example: ['youtube', 'twitter', 'linkedin'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetPlatforms?: string[];

  @ApiPropertyOptional({ description: 'Target locations', example: ['United States', 'Europe'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetLocations?: string[];

  @ApiPropertyOptional({ description: 'Minimum follower count (for influencers)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minFollowers?: number;

  @ApiPropertyOptional({ description: 'Maximum follower count (for influencers)' })
  @IsOptional()
  @IsNumber()
  maxFollowers?: number;

  @ApiPropertyOptional({ description: 'Target company sizes (for companies)', example: ['1-10', '11-50', '51-200'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetCompanySizes?: string[];

  @ApiPropertyOptional({ description: 'Additional search keywords' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords?: string;

  @ApiPropertyOptional({ description: 'Maximum number of leads to discover', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(25)
  maxLeads?: number;
}

export class CreateLeadDto {
  @ApiProperty({ enum: LEAD_TYPES })
  @IsEnum(LEAD_TYPES)
  leadType: LeadType;

  // Company fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(50)
  companySize?: string;

  // Person/Influencer fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  handle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  followers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  niche?: string;

  // Common fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileUrl?: string;

  @ApiPropertyOptional({ description: 'Custom fields as key-value pairs' })
  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}

export class UpdateLeadDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  handle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  followers?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  niche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  profileUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;

  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsEnum(LEAD_STATUSES)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  leadScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class LeadResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  leadType: LeadType;

  // Company fields
  @ApiPropertyOptional()
  companyName: string | null;

  @ApiPropertyOptional()
  website: string | null;

  @ApiPropertyOptional()
  industry: string | null;

  @ApiPropertyOptional()
  companySize: string | null;

  // Person fields
  @ApiPropertyOptional()
  name: string | null;

  @ApiPropertyOptional()
  platform: string | null;

  @ApiPropertyOptional()
  handle: string | null;

  @ApiPropertyOptional()
  followers: number | null;

  @ApiPropertyOptional()
  niche: string | null;

  // Common fields
  @ApiPropertyOptional()
  email: string | null;

  @ApiPropertyOptional()
  location: string | null;

  @ApiPropertyOptional()
  description: string | null;

  @ApiPropertyOptional()
  profileUrl: string | null;

  @ApiPropertyOptional()
  customFields: Record<string, string>;

  @ApiProperty()
  leadScore: number;

  @ApiProperty()
  status: LeadStatus;

  @ApiPropertyOptional()
  source: string | null;

  @ApiPropertyOptional()
  tags: string[];

  @ApiProperty()
  createdAt: string;

  // Computed display name
  @ApiProperty()
  displayName: string;
}

export class LeadFiltersDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: LEAD_TYPES })
  @IsOptional()
  @IsEnum(LEAD_TYPES)
  leadType?: LeadType;

  @ApiPropertyOptional({ enum: LEAD_STATUSES })
  @IsOptional()
  @IsEnum(LEAD_STATUSES)
  status?: LeadStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  platform?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  niche?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  minScore?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

// Available template variables based on lead type
export const PERSON_VARIABLES = [
  '{{name}}',
  '{{email}}',
  '{{platform}}',
  '{{handle}}',
  '{{followers}}',
  '{{niche}}',
  '{{location}}',
  '{{profileUrl}}',
] as const;

export const COMPANY_VARIABLES = [
  '{{companyName}}',
  '{{email}}',
  '{{website}}',
  '{{industry}}',
  '{{companySize}}',
  '{{location}}',
] as const;

export const STARTUP_VARIABLES = [
  '{{myCompany}}',
  '{{myProduct}}',
  '{{myIndustry}}',
  '{{myFounder}}',
  '{{myWebsite}}',
] as const;
