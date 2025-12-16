import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, UpdateAlertDto, AlertResponseDto, AlertResultResponseDto } from './dto/alert.dto';

@ApiTags('Alerts')
@ApiBearerAuth()
@Controller('alerts')
@UseGuards(AuthGuard)
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @RateLimit(RateLimitPresets.CREATE)
  @ApiOperation({ summary: 'Create a new alert' })
  async create(
    @CurrentUser('id') userId: string,
    @Req() req: { user?: { startup?: { id: string } } },
    @Body() dto: CreateAlertDto,
  ): Promise<AlertResponseDto> {
    return this.alertsService.create(userId, req.user?.startup?.id || null, dto);
  }

  @Get()
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get all alerts for current user' })
  async findAll(@CurrentUser('id') userId: string): Promise<AlertResponseDto[]> {
    return this.alertsService.findAllByUser(userId);
  }

  @Get('unread-count')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get count of unread alert results' })
  async getUnreadCount(@CurrentUser('id') userId: string): Promise<{ count: number }> {
    const count = await this.alertsService.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get a specific alert' })
  @ApiParam({ name: 'id', type: 'string' })
  async findOne(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
  ): Promise<AlertResponseDto> {
    return this.alertsService.findOne(userId, alertId);
  }

  @Put(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Update an alert' })
  @ApiParam({ name: 'id', type: 'string' })
  async update(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
    @Body() dto: UpdateAlertDto,
  ): Promise<AlertResponseDto> {
    return this.alertsService.update(userId, alertId, dto);
  }

  @Patch(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Partially update an alert' })
  @ApiParam({ name: 'id', type: 'string' })
  async partialUpdate(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
    @Body() dto: UpdateAlertDto,
  ): Promise<AlertResponseDto> {
    return this.alertsService.update(userId, alertId, dto);
  }

  @Delete(':id')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Delete an alert' })
  @ApiParam({ name: 'id', type: 'string' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
  ): Promise<{ success: boolean }> {
    await this.alertsService.delete(userId, alertId);
    return { success: true };
  }

  @Get(':id/results')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get results for an alert' })
  @ApiParam({ name: 'id', type: 'string' })
  @ApiQuery({ name: 'limit', required: false, type: 'number' })
  async getResults(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
    @Query('limit') limit?: string,
  ): Promise<AlertResultResponseDto[]> {
    return this.alertsService.getResults(userId, alertId, limit ? parseInt(limit, 10) : 20);
  }

  @Patch('results/:resultId/read')
  @RateLimit(RateLimitPresets.STANDARD)
  @ApiOperation({ summary: 'Mark an alert result as read' })
  @ApiParam({ name: 'resultId', type: 'string' })
  async markRead(
    @CurrentUser('id') userId: string,
    @Param('resultId', ParseUUIDPipe) resultId: string,
  ): Promise<{ success: boolean }> {
    await this.alertsService.markResultRead(userId, resultId);
    return { success: true };
  }
}
