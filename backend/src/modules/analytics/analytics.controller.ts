import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AdminGuard } from '@/common/guards/admin.guard';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalStartups: number;
  activeSessions: number;
  eventsToday: number;
  eventsByType: { type: string; count: number }[];
}

interface EventAggregation {
  date: string;
  count: number;
  type: string;
}

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics (admin only)' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  async getDashboard(): Promise<ApiResponseDto<DashboardStats>> {
    const stats = await this.analyticsService.getDashboardStats();
    return ApiResponseDto.success(stats);
  }

  @Get('events/aggregation')
  @ApiOperation({ summary: 'Get event aggregation by day (admin only)' })
  @ApiResponse({ status: 200, description: 'Event aggregation' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 7)' })
  async getEventAggregation(
    @Query('days') days?: string,
  ): Promise<ApiResponseDto<EventAggregation[]>> {
    const daysNum = days ? parseInt(days, 10) : 7;
    const aggregation = await this.analyticsService.getEventAggregation(daysNum);
    return ApiResponseDto.success(aggregation);
  }
}
