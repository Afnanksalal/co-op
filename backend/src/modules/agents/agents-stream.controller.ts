import { Controller, Get, Param, Res, UseGuards, ParseUUIDPipe, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { StreamingService, StreamEvent } from '@/common/streaming/streaming.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { AuthGuard } from '@/common/guards/auth.guard';

@ApiTags('Agents')
@Controller('agents')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AgentsStreamController {
  private readonly logger = new Logger(AgentsStreamController.name);

  constructor(
    private readonly streamingService: StreamingService,
    private readonly queueService: AgentsQueueService,
  ) {}

  @Get('stream/:taskId')
  @ApiOperation({ summary: 'Stream agent responses via SSE (true streaming)' })
  @ApiResponse({ status: 200, description: 'SSE stream' })
  async stream(
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Res() res: Response,
  ): Promise<void> {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendEvent = (event: StreamEvent): void => {
      res.write(`id: ${event.timestamp}\n`);
      res.write(`event: ${event.type}\n`);
      res.write(`data: ${JSON.stringify(event.data)}\n\n`);
    };

    // Send connected event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ taskId, timestamp: new Date().toISOString() })}\n\n`);

    // Send buffered events first (for late subscribers)
    const bufferedEvents = await this.streamingService.getBuffer(taskId);
    for (const event of bufferedEvents) {
      sendEvent(event);
    }

    // Check if task is already complete
    const status = await this.queueService.getJobStatus(taskId);
    if (status?.status === 'completed' || status?.status === 'failed') {
      res.write(`event: done\n`);
      res.write(`data: ${JSON.stringify({ status: status.status, result: status.result })}\n\n`);
      res.end();
      return;
    }

    // Poll for new events (Upstash doesn't support true pub/sub in REST mode)
    // We use a hybrid approach: poll Redis for new buffer entries
    let lastEventCount = bufferedEvents.length;
    let isComplete = false;

    const pollInterval = setInterval(async () => {
      try {
        const currentBuffer = await this.streamingService.getBuffer(taskId);
        
        // Send new events
        if (currentBuffer.length > lastEventCount) {
          const newEvents = currentBuffer.slice(lastEventCount);
          for (const event of newEvents) {
            sendEvent(event);
            
            // Check for completion
            if (event.type === 'done' || event.type === 'error') {
              isComplete = true;
            }
          }
          lastEventCount = currentBuffer.length;
        }

        // Also check task status
        const currentStatus = await this.queueService.getJobStatus(taskId);
        if (currentStatus?.status === 'completed' || currentStatus?.status === 'failed') {
          if (!isComplete) {
            res.write(`event: done\n`);
            res.write(`data: ${JSON.stringify({ status: currentStatus.status, result: currentStatus.result })}\n\n`);
          }
          clearInterval(pollInterval);
          clearInterval(keepAlive);
          clearTimeout(timeout);
          res.end();
        }
      } catch (error) {
        this.logger.error(`Stream poll error for task ${taskId}`, error);
      }
    }, 500); // Poll every 500ms for low latency

    // Keep-alive ping
    const keepAlive = setInterval(() => {
      res.write(`:keepalive\n\n`);
    }, 15000);

    // Timeout after 10 minutes
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      clearInterval(keepAlive);
      res.write(`event: error\n`);
      res.write(`data: ${JSON.stringify({ error: 'Stream timeout' })}\n\n`);
      res.end();
    }, 10 * 60 * 1000);

    // Cleanup on client disconnect
    res.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(keepAlive);
      clearTimeout(timeout);
      this.logger.debug(`Stream closed for task ${taskId}`);
    });
  }
}
