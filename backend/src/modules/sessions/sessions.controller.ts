import { Controller, Get, Post, Patch, Param, Body, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { SessionsExportService } from './sessions-export.service';
import { CreateSessionDto, SessionResponseDto, CreateMessageDto, MessageResponseDto, UpdateSessionTitleDto, ExportSessionDto, ExportResponseDto, EmailSessionDto } from './dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { UserThrottleGuard } from '@/common/guards/user-throttle.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { RateLimit, RateLimitPresets } from '@/common/decorators/rate-limit.decorator';
import { EmailService } from '@/common/email/email.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(AuthGuard, UserThrottleGuard)
@ApiBearerAuth()
@RateLimit(RateLimitPresets.STANDARD) // Default: 100 req/min
export class SessionsController {
  constructor(
    private readonly sessionsService: SessionsService,
    private readonly exportService: SessionsExportService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @RateLimit({ limit: 10, ttl: 60, keyPrefix: 'sessions:create' }) // 10 session creates per minute
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSessionDto,
  ): Promise<ApiResponseDto<SessionResponseDto>> {
    const session = await this.sessionsService.create(user.id, dto);
    return ApiResponseDto.success(session, 'Session created');
  }

  @Get()
  @RateLimit(RateLimitPresets.READ) // 200 req/min for reads
  @ApiOperation({ summary: 'Get all sessions for current user' })
  @ApiQuery({ name: 'search', required: false, description: 'Search sessions by title' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('search') search?: string,
  ): Promise<ApiResponseDto<SessionResponseDto[]>> {
    const sessions = await this.sessionsService.findByUserId(user.id, search);
    return ApiResponseDto.success(sessions);
  }

  @Patch(':id/title')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'sessions:title' })
  @ApiOperation({ summary: 'Update session title' })
  @ApiResponse({ status: 200, description: 'Title updated' })
  async updateTitle(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSessionTitleDto,
  ): Promise<ApiResponseDto<SessionResponseDto>> {
    const session = await this.sessionsService.updateTitle(id, user.id, dto.title);
    return ApiResponseDto.success(session, 'Title updated');
  }

  @Get(':id')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get session by ID' })
  @ApiResponse({ status: 200, description: 'Session found' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async findOne(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<SessionResponseDto>> {
    const session = await this.sessionsService.findById(id, user.id);
    return ApiResponseDto.success(session);
  }

  @Post(':id/end')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'sessions:end' }) // 30 session ends per minute
  @ApiOperation({ summary: 'End a session' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async end(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.sessionsService.end(id, user.id);
    return ApiResponseDto.message('Session ended');
  }

  @Post(':id/activity')
  @RateLimit({ limit: 120, ttl: 60, keyPrefix: 'sessions:activity' }) // 2 per second for activity tracking
  @ApiOperation({ summary: 'Track session activity' })
  @ApiResponse({ status: 200, description: 'Activity tracked' })
  async trackActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { action: string },
  ): Promise<ApiResponseDto<null>> {
    await this.sessionsService.trackActivity(id, user.id, body.action);
    return ApiResponseDto.message('Activity tracked');
  }

  @Get(':id/activity')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get session activity' })
  @ApiResponse({ status: 200, description: 'Activity retrieved' })
  async getActivity(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ action: string; timestamp: string; userId: string } | null>> {
    const activity = await this.sessionsService.getActivity(id, user.id);
    return ApiResponseDto.success(activity);
  }

  @Post(':id/messages')
  @RateLimit({ limit: 60, ttl: 60, keyPrefix: 'sessions:messages' }) // 60 messages per minute (1/sec)
  @ApiOperation({ summary: 'Add message to session' })
  @ApiResponse({ status: 201, description: 'Message added' })
  @ApiResponse({ status: 429, description: 'Rate limit exceeded' })
  async addMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
  ): Promise<ApiResponseDto<MessageResponseDto>> {
    const message = await this.sessionsService.addMessage(id, user.id, dto);
    return ApiResponseDto.success(message, 'Message added');
  }

  @Get(':id/messages')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get session messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getMessages(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponseDto<MessageResponseDto[]>> {
    const limitNum = limit ? parseInt(limit, 10) : 100;
    const messages = await this.sessionsService.getMessages(id, user.id, limitNum);
    return ApiResponseDto.success(messages);
  }

  @Get(':id/history')
  @RateLimit(RateLimitPresets.READ)
  @ApiOperation({ summary: 'Get full session history with messages' })
  @ApiResponse({ status: 200, description: 'Session history retrieved' })
  async getHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ session: SessionResponseDto; messages: MessageResponseDto[] }>> {
    const history = await this.sessionsService.getSessionHistory(id, user.id);
    return ApiResponseDto.success(history);
  }

  @Post(':id/export')
  @RateLimit({ limit: 10, ttl: 60, keyPrefix: 'sessions:export' })
  @ApiOperation({ summary: 'Export session as markdown, PDF, or JSON' })
  @ApiResponse({ status: 200, description: 'Session exported' })
  async exportSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ExportSessionDto,
  ): Promise<ApiResponseDto<ExportResponseDto>> {
    const result = await this.exportService.exportSession(id, user.id, dto.format, dto.title);
    return ApiResponseDto.success(result, 'Session exported');
  }

  @Post(':id/email')
  @RateLimit({ limit: 5, ttl: 60, keyPrefix: 'sessions:email' })
  @ApiOperation({ summary: 'Email session summary' })
  @ApiResponse({ status: 200, description: 'Email sent' })
  @ApiResponse({ status: 400, description: 'Email service not configured' })
  async emailSession(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EmailSessionDto,
  ): Promise<ApiResponseDto<{ sent: boolean }>> {
    if (!this.emailService.isAvailable()) {
      return ApiResponseDto.success({ sent: false }, 'Email service not configured');
    }

    const { session, messages } = await this.sessionsService.getSessionHistory(id, user.id);
    const summary = this.exportService.generateSessionSummary(session, messages);
    const sessionTitle = session.title || 'Chat Session';
    
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'https://co-op.ai');
    const sessionUrl = `${frontendUrl}/sessions/${id}`;

    const sent = await this.emailService.sendSessionSummary(
      dto.email,
      sessionTitle,
      summary,
      sessionUrl,
    );

    return ApiResponseDto.success({ sent }, sent ? 'Email sent' : 'Failed to send email');
  }

  @Patch(':id/pin')
  @RateLimit({ limit: 30, ttl: 60, keyPrefix: 'sessions:pin' })
  @ApiOperation({ summary: 'Toggle session pin status' })
  @ApiResponse({ status: 200, description: 'Pin status updated' })
  async togglePin(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<SessionResponseDto>> {
    const session = await this.sessionsService.togglePin(id, user.id);
    return ApiResponseDto.success(session, session.isPinned ? 'Session pinned' : 'Session unpinned');
  }
}
