import { ApiProperty } from '@nestjs/swagger';

export class StartupSummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  companyName: string;

  @ApiProperty()
  industry: string;

  @ApiProperty({ description: 'RAG sector for document filtering', enum: ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] })
  sector: string;

  @ApiProperty()
  stage: string;

  @ApiProperty({ nullable: true })
  fundingStage: string | null;
}

export class UserResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  role: string;

  @ApiProperty({ nullable: true })
  authProvider: string | null;

  @ApiProperty()
  onboardingCompleted: boolean;

  @ApiProperty({ type: StartupSummaryDto, nullable: true })
  startup: StartupSummaryDto | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
