import { IsEnum, IsString, IsUUID, IsArray, MinLength, MaxLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from '../types/agent.types';
import { RagRegion, RagJurisdiction } from '@/common/rag/rag.types';

export class RunAgentDto {
  @ApiProperty({ enum: ['legal', 'finance', 'investor', 'competitor'], required: false })
  @IsEnum(['legal', 'finance', 'investor', 'competitor'])
  @IsOptional()
  agentType?: AgentType;

  @ApiProperty({ type: [String], description: 'Agents to query (for multi-agent mode)', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  agents?: string[];

  @ApiProperty({ description: 'The prompt/question for the agent' })
  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  prompt: string;

  @ApiProperty({ description: 'Session UUID for tracking' })
  @IsUUID()
  sessionId: string;

  @ApiProperty({ description: 'Startup UUID for context' })
  @IsUUID()
  startupId: string;

  @ApiProperty({ type: [String], description: 'Document IDs for context', required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  documents?: string[];

  @ApiProperty({ description: 'Region for jurisdiction-specific queries (legal agent)', required: false })
  @IsString()
  @IsOptional()
  region?: RagRegion;

  @ApiProperty({ description: 'Specific jurisdiction for legal queries', required: false })
  @IsString()
  @IsOptional()
  jurisdiction?: RagJurisdiction;

  @ApiProperty({ description: 'Finance focus area (for finance agent)', required: false })
  @IsString()
  @IsOptional()
  financeFocus?: string;

  @ApiProperty({ description: 'Currency preference (for finance agent)', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}
