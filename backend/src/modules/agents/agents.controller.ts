import { Controller, Get, Post, Param, Body, Res, UseGuards, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AgentsService } from './agents.service';
import { RunAgentDto } from './dto/run-agent.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { AgentPhaseResult } from './types/agent.types';

@ApiTags('Agents')
@Controller('agents')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run an agent' })
  @ApiResponse({ status: 200, description: 'Agent execution results' })
  async run(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RunAgentDto,
  ): Promise<ApiResponseDto<AgentPhaseResult[]>> {
    const results = await this.agentsService.run(user.id, dto);
    return ApiResponseDto.success(results);
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get task status' })
  @ApiResponse({ status: 200, description: 'Task status' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTask(@Param('taskId') taskId: string): Promise<ApiResponseDto<unknown>> {
    const task = await this.agentsService.getTask(taskId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return ApiResponseDto.success(task);
  }

  @Get('stream/:taskId')
  @ApiOperation({ summary: 'Stream agent responses (SSE)' })
  async stream(@Param('taskId') taskId: string, @Res() res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial connection event
    res.write(`event: connected\ndata: ${JSON.stringify({ taskId })}\n\n`);

    // TODO: Implement actual streaming logic
    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 15000);

    res.on('close', () => {
      clearInterval(keepAlive);
      res.end();
    });
  }
}
