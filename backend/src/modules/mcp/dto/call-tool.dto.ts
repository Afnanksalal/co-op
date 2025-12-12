import { IsString, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CallToolDto {
  @ApiProperty({ description: 'MCP server ID' })
  @IsString()
  serverId: string;

  @ApiProperty({ description: 'Tool name to call' })
  @IsString()
  toolName: string;

  @ApiProperty({ description: 'Tool arguments' })
  @IsObject()
  arguments: Record<string, unknown>;
}
