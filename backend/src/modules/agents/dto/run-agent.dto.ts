import { IsEnum, IsString, IsUUID, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentType } from '../types/agent.types';

export class RunAgentDto {
  @ApiProperty({ enum: ['legal', 'finance', 'investor', 'competitor'] })
  @IsEnum(['legal', 'finance', 'investor', 'competitor'])
  agentType: AgentType;

  @ApiProperty()
  @IsString()
  prompt: string;

  @ApiProperty()
  @IsUUID()
  sessionId: string;

  @ApiProperty()
  @IsUUID()
  startupId: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[];
}
