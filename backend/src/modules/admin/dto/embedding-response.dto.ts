import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class EmbeddingResponseDto {
  @ApiProperty({ description: 'Document ID' })
  id: string;

  @ApiProperty({ description: 'Original filename' })
  filename: string;

  @ApiProperty({ description: 'Storage path in Supabase' })
  storagePath: string;

  @ApiProperty({ description: 'Document domain', enum: ['legal', 'finance'] })
  domain: string;

  @ApiProperty({ description: 'Industry sector', enum: ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] })
  sector: string;

  @ApiProperty({ description: 'Vector status', enum: ['pending', 'indexed', 'expired'] })
  status: string;

  @ApiProperty({ description: 'Number of chunks created' })
  chunksCreated: number;

  @ApiPropertyOptional({ description: 'Last accessed timestamp (for TTL tracking)' })
  lastAccessed?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;
}
