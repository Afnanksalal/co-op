import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsObject,
  ValidateNested,
  IsArray,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  McpToolDefinition,
  McpServerInfo,
  McpToolSchema,
  McpCouncilMetadata,
  McpA2ACapability,
} from '../types/mcp-server.types';

export class McpToolArgumentsDto {
  @ApiProperty({ description: 'Question for the agent' })
  @IsString()
  @IsNotEmpty()
  prompt: string;

  @ApiProperty({ description: 'Company name' })
  @IsString()
  @IsNotEmpty()
  companyName: string;

  @ApiProperty({ description: 'Industry' })
  @IsString()
  @IsNotEmpty()
  industry: string;

  @ApiProperty({ 
    description: 'RAG sector for document filtering (required for legal/finance agents)',
    example: 'fintech',
  })
  @IsString()
  @IsNotEmpty()
  sector: string;

  @ApiProperty({ description: 'Stage' })
  @IsString()
  @IsNotEmpty()
  stage: string;

  @ApiProperty({ description: 'Country' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Extra context', required: false })
  @ValidateIf((o: McpToolArgumentsDto) => o.additionalContext !== undefined)
  @IsString()
  @IsOptional()
  additionalContext?: string;

  @ApiProperty({ 
    description: 'Agents for multi-agent query', 
    required: false,
    type: [String],
    enum: ['legal', 'finance', 'investor', 'competitor'],
  })
  @ValidateIf((o: McpToolArgumentsDto) => o.agents !== undefined)
  @IsArray()
  @IsOptional()
  agents?: string[];
}

export class McpToolCallDto {
  @ApiProperty({
    description: 'Tool name',
    enum: ['legal_analysis', 'finance_analysis', 'investor_search', 'competitor_analysis', 'multi_agent_query'],
  })
  @IsString()
  @IsNotEmpty()
  tool: string;

  @ApiProperty({ description: 'Tool arguments', type: McpToolArgumentsDto })
  @IsObject()
  @ValidateNested()
  @Type(() => McpToolArgumentsDto)
  arguments: McpToolArgumentsDto;
}

export class McpToolOutputDto {
  @ApiProperty({ description: 'Response content' })
  content: string;

  @ApiProperty({ description: 'Confidence score 0-1' })
  confidence: number;

  @ApiProperty({ description: 'Source URLs' })
  sources: string[];
}

export class McpCouncilMetadataDto implements McpCouncilMetadata {
  @ApiProperty({ description: 'Models used in council' })
  modelsUsed: string[];

  @ApiProperty({ description: 'Number of critiques' })
  critiquesCount: number;

  @ApiProperty({ description: 'Consensus score' })
  consensusScore: number;

  @ApiProperty({ description: 'Was response synthesized' })
  synthesized: boolean;
}

export class McpToolResultDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({ description: 'Result', nullable: true, type: McpToolOutputDto })
  result: McpToolOutputDto | null;

  @ApiProperty({ description: 'Error message', nullable: true })
  error: string | null;

  @ApiProperty({ description: 'Execution time ms' })
  executionTimeMs: number;

  @ApiProperty({ description: 'Council metadata', nullable: true, type: McpCouncilMetadataDto })
  councilMetadata: McpCouncilMetadataDto | null;
}

export class McpServerInfoDto implements McpServerInfo {
  @ApiProperty({ description: 'Server name' })
  name: string;

  @ApiProperty({ description: 'Version' })
  version: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Vendor' })
  vendor: string;

  @ApiProperty({ description: 'Capabilities' })
  capabilities: {
    tools: boolean;
    resources: boolean;
    prompts: boolean;
    sampling: boolean;
  };
}

export class McpToolDefinitionDto implements McpToolDefinition {
  @ApiProperty({ description: 'Tool name' })
  name: string;

  @ApiProperty({ description: 'Description' })
  description: string;

  @ApiProperty({ description: 'Input schema' })
  inputSchema: McpToolSchema;
}

export class McpA2ACapabilityDto implements McpA2ACapability {
  @ApiProperty({ description: 'Agent name' })
  agent: string;

  @ApiProperty({ description: 'Available actions' })
  actions: string[];

  @ApiProperty({ description: 'Description' })
  description: string;
}

export class McpDiscoveryDto {
  @ApiProperty({ description: 'Server info', type: McpServerInfoDto })
  server: McpServerInfoDto;

  @ApiProperty({ description: 'Available tools', type: [McpToolDefinitionDto] })
  tools: McpToolDefinitionDto[];

  @ApiProperty({ description: 'A2A capabilities', type: [McpA2ACapabilityDto] })
  a2aCapabilities: McpA2ACapabilityDto[];
}
