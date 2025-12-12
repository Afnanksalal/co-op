import { IsString, IsUrl, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterServerDto {
  @ApiProperty({ description: 'Unique server identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Server display name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Server base URL' })
  @IsUrl()
  baseUrl: string;

  @ApiProperty({ description: 'API key for authentication' })
  @IsString()
  apiKey: string;

  @ApiProperty({ description: 'Whether the server is enabled' })
  @IsBoolean()
  enabled: boolean;
}
