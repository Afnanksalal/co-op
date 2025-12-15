import { IsString, IsEnum, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  RAG_DOMAINS,
  RAG_SECTORS,
  RAG_REGIONS,
  RAG_JURISDICTIONS,
  RAG_DOCUMENT_TYPES,
  RagDomain,
  RagSector,
  RagRegion,
  RagJurisdiction,
  RagDocumentType,
} from '@/common/rag/rag.types';

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

  @ApiPropertyOptional({
    description: 'Geographic region for jurisdiction filtering',
    enum: RAG_REGIONS,
    example: 'eu',
    default: 'global',
  })
  @IsOptional()
  @IsEnum(RAG_REGIONS, { message: `region must be one of: ${RAG_REGIONS.join(', ')}` })
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  region?: RagRegion;

  @ApiPropertyOptional({
    description: 'Applicable regulatory frameworks (comma-separated or array)',
    type: [String],
    example: ['gdpr', 'ccpa'],
    default: ['general'],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(RAG_JURISDICTIONS, { each: true, message: `jurisdictions must be from: ${RAG_JURISDICTIONS.join(', ')}` })
  @Transform(({ value }: { value: string | string[] }) => {
    if (typeof value === 'string') {
      return value.split(',').map((v) => v.trim().toLowerCase());
    }
    return Array.isArray(value) ? value.map((v) => v.toLowerCase()) : ['general'];
  })
  jurisdictions?: RagJurisdiction[];

  @ApiPropertyOptional({
    description: 'Type of document content',
    enum: RAG_DOCUMENT_TYPES,
    example: 'regulation',
    default: 'guide',
  })
  @IsOptional()
  @IsEnum(RAG_DOCUMENT_TYPES, { message: `documentType must be one of: ${RAG_DOCUMENT_TYPES.join(', ')}` })
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  documentType?: RagDocumentType;

  @ApiPropertyOptional({ description: 'Additional metadata for the document' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
