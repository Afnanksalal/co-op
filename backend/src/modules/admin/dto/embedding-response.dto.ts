import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RAG_DOMAINS, RAG_SECTORS, RAG_REGIONS, RAG_JURISDICTIONS, RAG_DOCUMENT_TYPES } from '@/common/rag/rag.types';

export class EmbeddingResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Storage path in Supabase' })
  storagePath: string;

  @ApiProperty({ description: 'Document domain', enum: RAG_DOMAINS })
  domain: string;

  @ApiProperty({ description: 'Industry sector', enum: RAG_SECTORS })
  sector: string;

  @ApiProperty({ description: 'Geographic region', enum: RAG_REGIONS, default: 'global' })
  region: string;

  @ApiProperty({
    description: 'Applicable regulatory frameworks',
    type: [String],
    enum: RAG_JURISDICTIONS,
    default: ['general'],
  })
  jurisdictions: string[];

  @ApiProperty({ description: 'Type of document', enum: RAG_DOCUMENT_TYPES, default: 'guide' })
  documentType: string;

  @ApiProperty({ description: 'Vector status', enum: ['pending', 'indexed', 'expired'] })
  status: string;

  @ApiProperty({ description: 'Number of chunks created' })
  chunksCreated: number;

  @ApiPropertyOptional({ description: 'Last accessed timestamp (for TTL tracking)' })
  lastAccessed?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
