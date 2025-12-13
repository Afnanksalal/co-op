import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsUrl,
  IsOptional,
  IsNumber,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer';

// === ENUMS (lowercase for storage, but accept any case) ===

export const FOUNDER_ROLES = ['ceo', 'cto', 'coo', 'cfo', 'cpo', 'founder', 'cofounder'] as const;

export const INDUSTRIES = [
  'saas',
  'fintech',
  'healthtech',
  'edtech',
  'ecommerce',
  'marketplace',
  'ai_ml',
  'artificial_intelligence',
  'cybersecurity',
  'cleantech',
  'biotech',
  'proptech',
  'insurtech',
  'legaltech',
  'hrtech',
  'agritech',
  'logistics',
  'media_entertainment',
  'gaming',
  'food_beverage',
  'travel_hospitality',
  'social',
  'developer_tools',
  'hardware',
  'other',
] as const;

export const BUSINESS_MODELS = [
  'b2b',
  'b2c',
  'b2b2c',
  'marketplace',
  'd2c',
  'enterprise',
  'smb',
  'consumer',
  'platform',
  'api',
  'other',
] as const;

// RAG sectors - used for document filtering
export const SECTORS = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] as const;

export const REVENUE_MODELS = [
  'subscription',
  'transaction_fee',
  'freemium',
  'usage_based',
  'licensing',
  'advertising',
  'commission',
  'one_time',
  'hybrid',
  'not_yet',
] as const;

export const STAGES = [
  'idea',
  'prototype',
  'mvp',
  'beta',
  'launched',
  'growth',
  'scale',
] as const;

export const TEAM_SIZES = ['1-5', '6-20', '21-50', '51-200', '200+'] as const;

export const FUNDING_STAGES = [
  'bootstrapped',
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'series_c_plus',
  'profitable',
] as const;

export const REVENUE_STATUS = ['yes', 'no', 'pre_revenue'] as const;

// Helper to validate case-insensitive enum
const isValidEnum = (value: string, allowed: readonly string[]): boolean => {
  return allowed.includes(value.toLowerCase());
};

// === TYPES ===

export type FounderRole = (typeof FOUNDER_ROLES)[number];
export type Industry = (typeof INDUSTRIES)[number];
export type BusinessModel = (typeof BUSINESS_MODELS)[number];
export type Sector = (typeof SECTORS)[number];
export type RevenueModel = (typeof REVENUE_MODELS)[number];
export type Stage = (typeof STAGES)[number];
export type TeamSize = (typeof TEAM_SIZES)[number];
export type FundingStage = (typeof FUNDING_STAGES)[number];
export type RevenueStatus = (typeof REVENUE_STATUS)[number];

// Custom validator for case-insensitive enums
import { ValidatorConstraint, ValidatorConstraintInterface, Validate } from 'class-validator';

@ValidatorConstraint({ name: 'isValidFounderRole', async: false })
class IsValidFounderRole implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidEnum(value, FOUNDER_ROLES);
  }
  defaultMessage(): string {
    return `founderRole must be one of: ${FOUNDER_ROLES.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidIndustry', async: false })
class IsValidIndustry implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidEnum(value, INDUSTRIES);
  }
  defaultMessage(): string {
    return `industry must be one of: ${INDUSTRIES.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidBusinessModel', async: false })
class IsValidBusinessModel implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidEnum(value, BUSINESS_MODELS);
  }
  defaultMessage(): string {
    return `businessModel must be one of: ${BUSINESS_MODELS.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidSector', async: false })
class IsValidSector implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidEnum(value, SECTORS);
  }
  defaultMessage(): string {
    return `sector must be one of: ${SECTORS.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidRevenueModel', async: false })
class IsValidRevenueModel implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return true;
    return isValidEnum(value, REVENUE_MODELS);
  }
  defaultMessage(): string {
    return `revenueModel must be one of: ${REVENUE_MODELS.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidStage', async: false })
class IsValidStage implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidEnum(value, STAGES);
  }
  defaultMessage(): string {
    return `stage must be one of: ${STAGES.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidFundingStage', async: false })
class IsValidFundingStage implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return true;
    return isValidEnum(value, FUNDING_STAGES);
  }
  defaultMessage(): string {
    return `fundingStage must be one of: ${FUNDING_STAGES.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidRevenueStatus', async: false })
class IsValidRevenueStatus implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return isValidEnum(value, REVENUE_STATUS);
  }
  defaultMessage(): string {
    return `isRevenue must be one of: ${REVENUE_STATUS.join(', ')} (case-insensitive)`;
  }
}

@ValidatorConstraint({ name: 'isValidTeamSize', async: false })
class IsValidTeamSize implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    return TEAM_SIZES.includes(value as TeamSize);
  }
  defaultMessage(): string {
    return `teamSize must be one of: ${TEAM_SIZES.join(', ')}`;
  }
}

// === DTO ===

export class OnboardingDto {
  // === FOUNDER INFO ===
  @ApiProperty({ description: 'Founder full name', example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  founderName: string;

  @ApiProperty({ 
    description: 'Founder role (case-insensitive)', 
    enum: ['ceo', 'cto', 'coo', 'cfo', 'cpo', 'founder', 'cofounder'], 
    example: 'ceo',
  })
  @IsString()
  @Validate(IsValidFounderRole)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  founderRole: FounderRole;

  // === COMPANY BASICS ===
  @ApiProperty({ description: 'Company name', example: 'Acme Inc' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  companyName: string;

  @ApiProperty({ description: 'One-liner pitch', example: 'AI-powered analytics for e-commerce', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  tagline?: string;

  @ApiProperty({ description: 'Detailed company description', example: 'We help e-commerce businesses...' })
  @IsString()
  @MinLength(20)
  @MaxLength(2000)
  description: string;

  @ApiProperty({ description: 'Company website', example: 'https://acme.com', required: false })
  @IsUrl()
  @IsOptional()
  @MaxLength(500)
  website?: string;

  // === BUSINESS CLASSIFICATION ===
  @ApiProperty({ 
    description: 'Primary industry (case-insensitive)', 
    enum: [
      'saas', 'fintech', 'healthtech', 'edtech', 'ecommerce', 'marketplace',
      'ai_ml', 'artificial_intelligence', 'cybersecurity', 'cleantech', 'biotech',
      'proptech', 'insurtech', 'legaltech', 'hrtech', 'agritech', 'logistics',
      'media_entertainment', 'gaming', 'food_beverage', 'travel_hospitality',
      'social', 'developer_tools', 'hardware', 'other'
    ], 
    example: 'saas',
  })
  @IsString()
  @Validate(IsValidIndustry)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  industry: Industry;

  @ApiProperty({ 
    description: 'Sector for RAG document filtering (case-insensitive)', 
    enum: ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'], 
    example: 'fintech',
  })
  @IsString()
  @Validate(IsValidSector)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  sector: Sector;

  @ApiProperty({ 
    description: 'Business model (case-insensitive)', 
    enum: ['b2b', 'b2c', 'b2b2c', 'marketplace', 'd2c', 'enterprise', 'smb', 'consumer', 'platform', 'api', 'other'], 
    example: 'b2b',
  })
  @IsString()
  @Validate(IsValidBusinessModel)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  businessModel: BusinessModel;

  @ApiProperty({ 
    description: 'Revenue model (case-insensitive)', 
    enum: ['subscription', 'transaction_fee', 'freemium', 'usage_based', 'licensing', 'advertising', 'commission', 'one_time', 'hybrid', 'not_yet'], 
    example: 'subscription', 
    required: false,
  })
  @IsString()
  @IsOptional()
  @Validate(IsValidRevenueModel)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  revenueModel?: RevenueModel;

  // === COMPANY STAGE ===
  @ApiProperty({ 
    description: 'Current stage (case-insensitive)', 
    enum: ['idea', 'prototype', 'mvp', 'beta', 'launched', 'growth', 'scale'], 
    example: 'mvp',
  })
  @IsString()
  @Validate(IsValidStage)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  stage: Stage;

  @ApiProperty({ description: 'Year founded', example: 2023 })
  @IsInt()
  @Min(1990)
  @Max(2100)
  foundedYear: number;

  @ApiProperty({ description: 'Product launch date (ISO)', example: '2024-01-15', required: false })
  @IsDateString()
  @IsOptional()
  launchDate?: string;

  // === TEAM ===
  @ApiProperty({ 
    description: 'Team size', 
    enum: ['1-5', '6-20', '21-50', '51-200', '200+'], 
    example: '1-5',
  })
  @IsString()
  @Validate(IsValidTeamSize)
  teamSize: TeamSize;

  @ApiProperty({ description: 'Number of co-founders', example: 2 })
  @IsInt()
  @Min(1)
  @Max(10)
  cofounderCount: number;

  // === LOCATION ===
  @ApiProperty({ description: 'Country of incorporation', example: 'United States' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  country: string;

  @ApiProperty({ description: 'City', example: 'San Francisco', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiProperty({ description: 'Operating regions (comma-separated)', example: 'North America, Europe', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  operatingRegions?: string;

  // === FINANCIALS ===
  @ApiProperty({ 
    description: 'Current funding stage (case-insensitive)', 
    enum: ['bootstrapped', 'pre_seed', 'seed', 'series_a', 'series_b', 'series_c_plus', 'profitable'], 
    example: 'seed', 
    required: false,
  })
  @IsString()
  @IsOptional()
  @Validate(IsValidFundingStage)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  fundingStage?: FundingStage;

  @ApiProperty({ description: 'Total funding raised in USD', example: 500000, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  totalRaised?: number;

  @ApiProperty({ description: 'Monthly recurring revenue in USD', example: 10000, required: false })
  @IsNumber()
  @IsOptional()
  @Min(0)
  monthlyRevenue?: number;

  @ApiProperty({ 
    description: 'Revenue status (case-insensitive)', 
    enum: ['yes', 'no', 'pre_revenue'], 
    example: 'yes',
  })
  @IsString()
  @Validate(IsValidRevenueStatus)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  isRevenue: RevenueStatus;

  // === TARGET MARKET ===
  @ApiProperty({ description: 'Target customer profile', example: 'Mid-market e-commerce companies with $1M-$50M ARR', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  targetCustomer?: string;

  @ApiProperty({ description: 'Problem being solved', example: 'E-commerce businesses struggle to understand customer behavior...', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  problemSolved?: string;

  @ApiProperty({ description: 'Competitive advantage', example: 'Proprietary AI model trained on 10M+ transactions', required: false })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  competitiveAdvantage?: string;
}
