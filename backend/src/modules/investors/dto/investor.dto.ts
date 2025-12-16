import { IsString, IsArray, IsBoolean, IsOptional, IsEnum, IsInt, Min, IsUrl, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type InvestorStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth';

export class CreateInvestorDto {
  @ApiProperty({ example: 'Sequoia Capital' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Leading venture capital firm' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'https://sequoiacap.com' })
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiProperty({ enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'] })
  @IsEnum(['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'])
  stage: InvestorStage;

  @ApiProperty({ example: ['saas', 'fintech', 'ai'] })
  @IsArray()
  @IsString({ each: true })
  sectors: string[];

  @ApiPropertyOptional({ example: 1000, description: 'Minimum check size in thousands USD' })
  @IsOptional()
  @IsInt()
  @Min(0)
  checkSizeMin?: number;

  @ApiPropertyOptional({ example: 50000, description: 'Maximum check size in thousands USD' })
  @IsOptional()
  @IsInt()
  @Min(0)
  checkSizeMax?: number;

  @ApiProperty({ example: 'Menlo Park, CA' })
  @IsString()
  location: string;

  @ApiPropertyOptional({ example: ['us', 'eu', 'apac'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional({ example: 'contact@sequoiacap.com' })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/company/sequoia-capital' })
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional({ example: 'https://twitter.com/sequoia' })
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @ApiPropertyOptional({ example: ['Stripe', 'Airbnb', 'DoorDash'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioCompanies?: string[];

  @ApiPropertyOptional({ example: ['WhatsApp', 'Instagram'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notableExits?: string[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateInvestorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;

  @ApiPropertyOptional({ enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'] })
  @IsOptional()
  @IsEnum(['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'])
  stage?: InvestorStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sectors?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  checkSizeMin?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  checkSizeMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  linkedinUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  twitterUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  portfolioCompanies?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  notableExits?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}

export class InvestorResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string | null;

  @ApiProperty()
  website: string | null;

  @ApiProperty()
  logoUrl: string | null;

  @ApiProperty()
  stage: InvestorStage;

  @ApiProperty()
  sectors: string[];

  @ApiProperty()
  checkSizeMin: number | null;

  @ApiProperty()
  checkSizeMax: number | null;

  @ApiProperty()
  location: string;

  @ApiProperty()
  regions: string[];

  @ApiProperty()
  contactEmail: string | null;

  @ApiProperty()
  linkedinUrl: string | null;

  @ApiProperty()
  twitterUrl: string | null;

  @ApiProperty()
  portfolioCompanies: string[];

  @ApiProperty()
  notableExits: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiProperty()
  createdAt: string;

  @ApiProperty()
  updatedAt: string;
}

export class InvestorQueryDto {
  @ApiPropertyOptional({ enum: ['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'] })
  @IsOptional()
  @IsEnum(['pre-seed', 'seed', 'series-a', 'series-b', 'series-c', 'growth'])
  stage?: InvestorStage;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sector?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  featuredOnly?: boolean;
}
