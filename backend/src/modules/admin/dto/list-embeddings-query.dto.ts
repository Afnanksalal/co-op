import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { RAG_DOMAINS, RAG_SECTORS } from './upload-pdf.dto';

export class ListEmbeddingsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Filter by domain', 
    enum: RAG_DOMAINS,
  })
  @IsOptional()
  @IsEnum(RAG_DOMAINS)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  domain?: string;

  @ApiPropertyOptional({ 
    description: 'Filter by sector', 
    enum: RAG_SECTORS,
  })
  @IsOptional()
  @IsEnum(RAG_SECTORS)
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  sector?: string;
}
