import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  startupId: string;

  @ApiPropertyOptional({ description: 'Session title (auto-generated or user-set)' })
  title?: string;

  @ApiProperty()
  status: string;

  @ApiProperty({ description: 'Whether session is pinned/favorited' })
  isPinned: boolean;

  @ApiProperty()
  metadata: Record<string, unknown>;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class UpdateSessionTitleDto {
  @ApiProperty({ description: 'New session title', maxLength: 255 })
  title: string;
}
