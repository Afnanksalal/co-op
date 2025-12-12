import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum EmbeddingStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export class EmbeddingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  filename: string;

  @ApiPropertyOptional()
  startupId?: string;

  @ApiProperty({ enum: EmbeddingStatus })
  status: EmbeddingStatus;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
