import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Res,
  UseGuards,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AgentsService } from './agents.service';
import { RunAgentDto } from './dto/run-agent.dto';
import {
  TaskStatusDto,
  SSEConnectedEvent,
  SSEStatusEvent,
  SSEDoneEvent,
  TaskState,
} from './dto/task-status.dto';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser, CurrentUserPayload } from '@/common/decorators/current-user.decorator';
import { ApiResponseDto } from '@/common/dto/api-response.dto';
import { AgentPhaseResult } from './types/agent.types';

interface QueueTaskResponse {
  taskId: string;
  jobId: string;
}

@ApiTags('Agents')
@Controller('agents')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post('run')
  @ApiOperation({ summary: 'Run an agent synchronously' })
  @ApiResponse({ status: 200, description: 'Agent execution results' })
  async run(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RunAgentDto,
  ): Promise<ApiResponseDto<AgentPhaseResult[]>> {
    const results = await this.agentsService.run(user.id, dto);
    return ApiResponseDto.success(results);
  }

  @Post('queue')
  @ApiOperation({ summary: 'Queue an agent task for async processing' })
  @ApiResponse({ status: 201, description: 'Task queued' })
  async queue(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: RunAgentDto,
  ): Promise<ApiResponseDto<QueueTaskResponse>> {
    const result = await this.agentsService.queueTask(user.id, dto);
    return ApiResponseDto.success(result, 'Task queued for processing');
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Get task status' })
  @ApiResponse({ status: 200, description: 'Task status', type: TaskStatusDto })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTask(
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ): Promise<ApiResponseDto<TaskStatusDto>> {
    const status = await this.agentsService.getTaskStatus(taskId);
    if (!status) {
      throw new NotFoundException('Task not found');
    }
    return ApiResponseDto.success(status);
  }

  @Delete('tasks/:taskId')
  @ApiOperation({ summary: 'Cancel a queued task' })
  @ApiResponse({ status: 200, description: 'Task cancelled' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async cancelTask(@Param('taskId', ParseUUIDPipe) taskId: string): Promise<ApiResponseDto<null>> {
    const cancelled = await this.agentsService.cancelTask(taskId);
    if (!cancelled) {
      throw new NotFoundException('Task not found');
    }
    return ApiResponseDto.message('Task cancelled');
  }

  @Get('stream/:taskId')
  @ApiOperation({ summary: 'Stream agent responses (SSE)' })
  @ApiResponse({ status: 200, description: 'SSE stream' })
  stream(@Param('taskId', ParseUUIDPipe) taskId: string, @Res() res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (event: string, data: SSEConnectedEvent | SSEStatusEvent | SSEDoneEvent, id?: string): void => {
      if (id) res.write(`id: ${id}\n`);
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const connectedEvent: SSEConnectedEvent = {
      taskId,
      timestamp: new Date().toISOString(),
    };
    sendEvent('connected', connectedEvent);

    const pollInterval = setInterval(() => {
      void (async () => {
        const status = await this.agentsService.getTaskStatus(taskId);

        if (status) {
          const statusEvent: SSEStatusEvent = status;
          sendEvent('status', statusEvent, Date.now().toString());

          if (status.status === 'completed' || status.status === 'failed') {
            clearInterval(pollInterval);
            clearInterval(keepAlive);
            clearTimeout(timeout);
            const doneEvent: SSEDoneEvent = { status: status.status as TaskState };
            sendEvent('done', doneEvent);
            res.end();
          }
        }
      })();
    }, 1000);

    const keepAlive = setInterval(() => {
      res.write(':keepalive\n\n');
    }, 15000);

    // Timeout after 5 minutes to prevent indefinite connections
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      clearInterval(keepAlive);
      const doneEvent: SSEDoneEvent = { status: 'failed' };
      sendEvent('done', doneEvent);
      res.end();
    }, 5 * 60 * 1000);

    res.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(keepAlive);
      clearTimeout(timeout);
      res.end();
    });
  }
}
