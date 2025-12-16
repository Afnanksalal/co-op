import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export type ExportFormat = 'markdown' | 'pdf' | 'json';

export class ExportSessionDto {
  @ApiProperty({ enum: ['markdown', 'pdf', 'json'], default: 'markdown' })
  @IsEnum(['markdown', 'pdf', 'json'])
  format: ExportFormat;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;
}

export class EmailSessionDto {
  @ApiProperty({ description: 'Email address to send the summary to' })
  @IsString()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subject?: string;
}

export class ExportResponseDto {
  @ApiProperty()
  content: string;

  @ApiProperty()
  filename: string;

  @ApiProperty()
  mimeType: string;
}
