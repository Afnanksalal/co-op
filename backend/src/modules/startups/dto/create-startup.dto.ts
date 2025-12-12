import { IsString, MinLength, MaxLength, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateStartupDto {
  @ApiProperty({ description: 'Startup name', example: 'TechCorp Inc' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ description: 'Startup description', example: 'AI-powered solutions' })
  @IsString()
  @MinLength(1)
  description: string;

  @ApiProperty({ description: 'Additional metadata' })
  @IsObject()
  metadata: Record<string, unknown>;
}
