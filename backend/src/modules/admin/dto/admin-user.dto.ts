import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  Min,
  Max,
  IsUUID,
  MaxLength,
  MinLength,
  IsArray,
  ArrayMaxSize,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * Pilot usage stats - reflects actual Redis-based usage tracking
 */
export class PilotUsageDto {
  @ApiProperty({ description: 'Agent requests used this month (limit: 3)' })
  agentRequestsUsed: number;

  @ApiProperty({ description: 'Agent requests limit per month' })
  agentRequestsLimit: number;

  @ApiProperty({ description: 'API keys created (limit: 1)' })
  apiKeysUsed: number;

  @ApiProperty({ description: 'Webhooks created (limit: 1)' })
  webhooksUsed: number;

  @ApiProperty({ description: 'Leads created (limit: 50)' })
  leadsUsed: number;

  @ApiProperty({ description: 'Campaigns created (limit: 5)' })
  campaignsUsed: number;

  @ApiProperty({ description: 'When agent usage resets (1st of next month)' })
  resetsAt: string;
}

export class AdminUserResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty() role: string;
  @ApiPropertyOptional() authProvider: string | null;
  @ApiProperty() onboardingCompleted: boolean;
  @ApiPropertyOptional() startupId: string | null;
  @ApiPropertyOptional() startupName: string | null;
  @ApiProperty({ enum: ['active', 'suspended'] }) status: 'active' | 'suspended';
  @ApiPropertyOptional() suspendedReason: string | null;
  @ApiPropertyOptional() adminNotes: string | null;
  @ApiProperty({ description: 'Pilot usage stats from Redis' }) pilotUsage: PilotUsageDto;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiPropertyOptional() lastActiveAt: Date | null;
}

export class AdminUserListQueryDto {
  @ApiPropertyOptional({ description: 'Search by email or name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: ['active', 'suspended', 'all'], default: 'all' })
  @IsOptional()
  @IsEnum(['active', 'suspended', 'all'])
  status?: 'active' | 'suspended' | 'all';

  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: 'user' | 'admin';

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  onboardingCompleted?: boolean;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ enum: ['createdAt', 'name', 'email'] })
  @IsOptional()
  @IsEnum(['createdAt', 'name', 'email'])
  sortBy?: 'createdAt' | 'name' | 'email';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class CreateUserDto {
  @ApiProperty({ description: 'User email address', example: 'user@example.com' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ description: 'User display name', example: 'John Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'], default: 'user' })
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: 'user' | 'admin';
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User display name' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ enum: ['user', 'admin'] })
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: 'user' | 'admin';

  @ApiPropertyOptional({ enum: ['active', 'suspended'] })
  @IsOptional()
  @IsEnum(['active', 'suspended'])
  status?: 'active' | 'suspended';

  @ApiPropertyOptional({ description: 'Admin notes about this user' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  adminNotes?: string;
}

export class SuspendUserDto {
  @ApiPropertyOptional({ description: 'Reason for suspension', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Reset specific pilot usage for a user
 */
export class ResetUsageDto {
  @ApiPropertyOptional({
    description: 'Type of usage to reset',
    enum: ['agentRequests', 'all'],
    default: 'agentRequests',
  })
  @IsOptional()
  @IsEnum(['agentRequests', 'all'])
  type?: 'agentRequests' | 'all';
}

export class BulkActionDto {
  @ApiProperty({
    description: 'Array of user IDs to perform action on',
    type: [String],
    example: ['uuid-1', 'uuid-2'],
  })
  @IsArray()
  @ArrayMaxSize(100, { message: 'Cannot process more than 100 users at once' })
  @IsUUID('4', { each: true })
  userIds: string[];
}

export class BulkSuspendDto extends BulkActionDto {
  @ApiPropertyOptional({ description: 'Reason for suspension', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class UserStatsDto {
  @ApiProperty({ description: 'Total number of users' }) totalUsers: number;
  @ApiProperty({ description: 'Number of active users' }) activeUsers: number;
  @ApiProperty({ description: 'Number of suspended users' }) suspendedUsers: number;
  @ApiProperty({ description: 'Number of admin users' }) adminUsers: number;
  @ApiProperty({ description: 'Users created this month' }) usersThisMonth: number;
  @ApiProperty({ description: 'Users who completed onboarding' }) onboardedUsers: number;
}
