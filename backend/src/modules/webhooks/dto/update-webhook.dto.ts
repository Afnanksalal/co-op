import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsArray, IsBoolean } from 'class-validator';

export class UpdateWebhookDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiProperty({ type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  events?: string[];

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
