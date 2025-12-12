import { IsString, IsUUID, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadPdfDto {
  @ApiProperty()
  @IsString()
  filename: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  startupId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
