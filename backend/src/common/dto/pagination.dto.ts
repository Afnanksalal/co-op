import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class CursorPaginationDto {
  @ApiPropertyOptional({ description: 'Cursor for pagination (base64 encoded)' })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CursorPaginatedResult<T> {
  data: T[];
  meta: {
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export function encodeCursor(data: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

export function decodeCursor(cursor: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}
