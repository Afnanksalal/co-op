import { Controller, Get, Post, Param, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { CreateSessionDto, SessionResponseDto } from './dto';
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
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<SessionResponseDto>> {
    const session = await this.sessionsService.findById(id);
    return ApiResponseDto.success(session);
  }

  @Post(':id/end')
  @ApiOperation({ summary: 'End a session' })
  @ApiResponse({ status: 200, description: 'Session ended' })
  async end(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<null>> {
    await this.sessionsService.end(id);
    return ApiResponseDto.message('Session ended');
  }
}
