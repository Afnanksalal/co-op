import { ApiProperty } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  keyPrefix: string;

  @ApiProperty({ type: [String] })
  scopes: string[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  lastUsedAt: Date;
}

export class ApiKeyCreatedResponseDto extends ApiKeyResponseDto {
  @ApiProperty({ description: 'Full API key (only shown once)' })
  key: string;
}
