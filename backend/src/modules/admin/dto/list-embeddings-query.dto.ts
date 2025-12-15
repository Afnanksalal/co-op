import { IsOptional, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';
import {
  RAG_DOMAINS,
  RAG_SECTORS,
  RAG_REGIONS,
  RagDomain,
  RagSector,
  RagRegion,
} from '@/common/rag/rag.types';

export class ListEmbeddingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by domain',
    enum: RAG_DOMAINS,
    example: 'legal',
  })
  @IsOptional()
  @IsIn(RAG_DOMAINS)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  domain?: RagDomain;

  @ApiPropertyOptional({
    description: 'Filter by sector',
    enum: RAG_SECTORS,
    example: 'fintech',
  })
  @IsOptional()
  @IsIn(RAG_SECTORS)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  sector?: RagSector;

  @ApiPropertyOptional({
    description: 'Filter by geographic region',
    enum: RAG_REGIONS,
    example: 'eu',
  })
  @IsOptional()
  @IsIn(RAG_REGIONS)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  region?: RagRegion;
}
