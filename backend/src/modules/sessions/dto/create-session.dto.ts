import { IsUUID, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSessionDto {
  @ApiProperty({ description: 'Startup ID' })
  @IsUUID()
  startupId: string;

  @ApiProperty({ description: 'Session metadata' })
  @IsObject()
  metadata: Record<string, unknown>;
}
