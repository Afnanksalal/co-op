import { IsEnum, IsString, IsUUID, IsArray, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AgentType } from '../types/agent.types';

export class RunAgentDto {
  @ApiProperty({ enum: ['legal', 'finance', 'investor', 'competitor'] })
  @IsEnum(['legal', 'finance', 'investor', 'competitor'])
  agentType: AgentType;

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

  @ApiProperty({ type: [String], description: 'Document paths for context' })
  @IsArray()
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  documents: string[];
}
