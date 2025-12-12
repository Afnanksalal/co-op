import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, SessionResponseDto, CreateMessageDto, MessageResponseDto } from './dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';

@ApiTags('Sessions')
@Controller('sessions')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateSessionDto,
  ): Promise<ApiResponseDto<SessionResponseDto>> {
    const session = await this.sessionsService.create(user.id, dto);
    return ApiResponseDto.success(session, 'Session created');
  }

  @Get()
  @ApiOperation({ summary: 'Get all sessions for current user' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async findAll(@CurrentUser() user: CurrentUserPayload): Promise<ApiResponseDto<SessionResponseDto[]>> {
    const sessions = await this.sessionsService.findByUserId(user.id);
    return ApiResponseDto.success(sessions);
  }

  @Get(':id')
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
  @ApiOperation({ summary: 'End a session' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async end(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<null>> {
    await this.sessionsService.end(id, user.id);
    return ApiResponseDto.message('Session ended');
  }

  @Post(':id/activity')
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
  @ApiOperation({ summary: 'Add message to session' })
  @ApiResponse({ status: 201, description: 'Message added' })
  async addMessage(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
  ): Promise<ApiResponseDto<MessageResponseDto>> {
    const message = await this.sessionsService.addMessage(id, user.id, dto);
    return ApiResponseDto.success(message, 'Message added');
  }

  @Get(':id/messages')
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
  @ApiOperation({ summary: 'Get full session history with messages' })
  @ApiResponse({ status: 200, description: 'Session history retrieved' })
  async getHistory(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<{ session: SessionResponseDto; messages: MessageResponseDto[] }>> {
    const history = await this.sessionsService.getSessionHistory(id, user.id);
    return ApiResponseDto.success(history);
  }
}
