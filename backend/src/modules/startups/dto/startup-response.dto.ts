import { ApiProperty } from '@nestjs/swagger';

export class StartupResponseDto {
  @ApiProperty()
  id: string;

  // Founder
  @ApiProperty()
  founderName: string;

  @ApiProperty()
  founderRole: string;

  // Company basics
  @ApiProperty()
  companyName: string;

  @ApiProperty({ nullable: true })
  tagline: string | null;

  @ApiProperty()
  description: string;

  @ApiProperty({ nullable: true })
  website: string | null;

  // Business classification
  @ApiProperty()
  industry: string;

  @ApiProperty({ description: 'RAG sector for document filtering (70+ sectors available)' })
  sector: string;

  @ApiProperty()
  businessModel: string;

  @ApiProperty({ nullable: true })
  revenueModel: string | null;

  // Stage
  @ApiProperty()
  stage: string;

  @ApiProperty()
  foundedYear: number;

  @ApiProperty({ nullable: true })
  launchDate: Date | null;

  // Team
  @ApiProperty()
  teamSize: string;

  @ApiProperty()
  cofounderCount: number;

  // Location
  @ApiProperty()
  country: string;

  @ApiProperty({ nullable: true })
  city: string | null;

  @ApiProperty({ nullable: true })
  operatingRegions: string | null;

  // Financials
  @ApiProperty({ nullable: true })
  fundingStage: string | null;

  @ApiProperty({ nullable: true })
  totalRaised: string | null;

  @ApiProperty({ nullable: true })
  monthlyRevenue: string | null;

  @ApiProperty()
  isRevenue: string;

  // Target market
  @ApiProperty({ nullable: true })
  targetCustomer: string | null;

  @ApiProperty({ nullable: true })
  problemSolved: string | null;

  @ApiProperty({ nullable: true })
  competitiveAdvantage: string | null;

  // Timestamps
  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
