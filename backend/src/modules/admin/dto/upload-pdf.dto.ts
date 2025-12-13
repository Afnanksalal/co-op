import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

// RAG domains - legal or finance
export const RAG_DOMAINS = ['legal', 'finance'] as const;
export type RagDomain = (typeof RAG_DOMAINS)[number];

// RAG sectors - must match RAG service
export const RAG_SECTORS = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] as const;
export type RagSector = (typeof RAG_SECTORS)[number];

export class UploadPdfDto {
  @ApiProperty({ description: 'Name of the PDF file' })
  @IsString()
  filename: string;

  @ApiProperty({ 
    description: 'Document domain', 
    enum: RAG_DOMAINS,
    example: 'legal',
  })
  @IsEnum(RAG_DOMAINS, { message: `domain must be one of: ${RAG_DOMAINS.join(', ')}` })
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  domain: RagDomain;

  @ApiProperty({ 
    description: 'Industry sector', 
    enum: RAG_SECTORS,
    example: 'fintech',
  })
  @IsEnum(RAG_SECTORS, { message: `sector must be one of: ${RAG_SECTORS.join(', ')}` })
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  sector: RagSector;

  @ApiPropertyOptional({ description: 'Additional metadata for the document' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
