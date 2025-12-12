import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsIn, IsOptional, IsObject, MaxLength, MinLength } from 'class-validator';

export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export class CreateMessageDto {
  @ApiProperty({ enum: MESSAGE_ROLES })
  @IsString()
  @IsNotEmpty()
  @IsIn(MESSAGE_ROLES)
  role: MessageRole;

  @ApiProperty({ description: 'Message content' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(50000)
  content: string;

  @ApiProperty({ required: false, description: 'Agent that generated this message' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  agent?: string;

  @ApiProperty({ required: false, description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
