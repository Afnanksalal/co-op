import { IsString, IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UploadPdfDto {
  @ApiProperty({ description: 'Name of the PDF file' })
  @IsString()
  filename: string;

  @ApiProperty({ description: 'UUID of the startup this document belongs to' })
  @IsUUID()
  startupId: string;

  @ApiProperty({ description: 'Additional metadata for the document' })
  @IsObject()
  metadata: Record<string, unknown>;
}
