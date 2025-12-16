import { Controller, Get, Query, UseGuards, ParseIntPipe, DefaultValuePipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserAnalyticsService, UserAnalyticsStats, DailyActivity } from './user-analytics.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';

/**
 * Controller for user-specific analytics endpoints.
 * Provides personal usage statistics and activity history.
 */
@ApiTags('User Analytics')
@Controller('analytics/me')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@RateLimit(RateLimitPresets.READ)
export class UserAnalyticsController {
  constructor(private readonly userAnalyticsService: UserAnalyticsService) {}

  /**
   * Get personal usage analytics for the authenticated user
   */
  @Get()
  @ApiOperation({ 
    summary: 'Get personal usage analytics',
    description: 'Returns comprehensive analytics including session counts, message totals, agent usage breakdown, and recent activity patterns.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'User analytics retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyAnalytics(
    @CurrentUser() user: CurrentUserPayload,
  ): Promise<ApiResponseDto<UserAnalyticsStats>> {
    const stats = await this.userAnalyticsService.getUserStats(user.id);
    return ApiResponseDto.success(stats);
  }

  /**
   * Get personal usage history over a specified time period
   */
  @Get('history')
  @ApiOperation({ 
    summary: 'Get personal usage history',
    description: 'Returns daily activity breakdown for the specified number of days (max 365).',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Usage history retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiQuery({ 
    name: 'days', 
    required: false, 
    type: Number, 
    description: 'Number of days to look back (default: 30, max: 365)',
    example: 30,
  })
  async getMyHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ): Promise<ApiResponseDto<DailyActivity[]>> {
    const history = await this.userAnalyticsService.getUserHistory(user.id, days);
    return ApiResponseDto.success(history);
  }
}
