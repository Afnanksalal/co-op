import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl, IsArray, ArrayNotEmpty, MaxLength, Matches } from 'class-validator';

export const VALID_WEBHOOK_EVENTS = [
  'session.created',
  'session.ended',
  'session.expired',
  'user.created',
  'user.updated',
  'user.deleted',
  'startup.created',
  'startup.updated',
  'startup.deleted',
  'agent.started',
  'agent.completed',
  'agent.failed',
  '*',
] as const;

export type WebhookEvent = (typeof VALID_WEBHOOK_EVENTS)[number];

export class CreateWebhookDto {
  @ApiProperty({ example: 'My Webhook' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'https://example.com/webhook' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;

  @ApiProperty({ type: [String], example: ['session.created', 'session.ended'], enum: VALID_WEBHOOK_EVENTS })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @Matches(/^[a-z]+\.[a-z]+$|\*$/, { each: true, message: 'Invalid event format' })
  events: string[];
}
