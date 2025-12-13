import { Controller, Post, Body, Headers, Logger, HttpCode, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Receiver } from '@upstash/qstash';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { AgentsQueueService } from './agents.queue.service';
import { AgentsService } from '../agents.service';
import { WebhooksService } from '@/modules/webhooks/webhooks.service';
import { AgentType, AgentInput } from '../types/agent.types';

interface QStashWebhookBody {
  taskId: string;
  type: string;
  payload: {
    agentType?: AgentType;
    agents?: string[];
    input: AgentInput;
    isMultiAgent?: boolean;
  };
  userId: string;
  createdAt: string;
}

@Controller('agents')
export class AgentsWebhookController {
  private readonly logger = new Logger(AgentsWebhookController.name);
  private readonly receiver: Receiver | null = null;

  constructor(
    private readonly configService: ConfigService,
    private readonly orchestrator: OrchestratorService,
    private readonly queueService: AgentsQueueService,
    private readonly agentsService: AgentsService,
    private readonly webhooksService: WebhooksService,
  ) {
    const currentSigningKey = this.configService.get<string>('QSTASH_CURRENT_SIGNING_KEY');
    const nextSigningKey = this.configService.get<string>('QSTASH_NEXT_SIGNING_KEY');

    if (currentSigningKey && nextSigningKey) {
      this.receiver = new Receiver({
        currentSigningKey,
        nextSigningKey,
      });
      this.logger.log('QStash webhook receiver initialized');
    } else {
      this.logger.warn('QStash signing keys not configured - webhook verification disabled');
    }
  }

  /**
   * QStash webhook endpoint for processing agent jobs
   */
  @Post('webhook')
  @HttpCode(200)
  async handleQStashWebhook(
    @Body() body: QStashWebhookBody,
    @Headers('upstash-signature') signature: string,
    @Headers('upstash-message-id') messageId: string,
  ): Promise<{ success: boolean; taskId: string }> {
    this.logger.log(`QStash webhook received: ${messageId} for task ${body.taskId}`);

    // Verify signature in production
    if (this.receiver && signature) {
      try {
        const isValid = await this.receiver.verify({
          signature,
          body: JSON.stringify(body),
        });

        if (!isValid) {
          this.logger.error('Invalid QStash signature');
          throw new UnauthorizedException('Invalid signature');
        }
      } catch (error) {
        this.logger.error(`Signature verification failed: ${String(error)}`);
        throw new UnauthorizedException('Signature verification failed');
      }
    }

    const { taskId, payload } = body;
    const { agentType, agents, input, isMultiAgent } = payload;

    // Check if task was cancelled
    const isCancelled = await this.queueService.isTaskCancelled(taskId);
    if (isCancelled) {
      this.logger.log(`Task ${taskId} was cancelled, skipping`);
      return { success: false, taskId };
    }

    try {
      // Update status to active
      await this.queueService.updateTaskStatus(taskId, 'active', 10);

      let results;
      
      if (isMultiAgent && agents) {
        // Multi-agent A2A mode
        this.logger.log(`Processing multi-agent job: ${taskId} - ${agents.join(', ')}`);
        results = await this.agentsService.run(body.userId, {
          agents,
          prompt: input.prompt,
          sessionId: input.context.sessionId,
          startupId: input.context.startupId,
          documents: input.documents,
        });
      } else if (agentType) {
        // Single agent mode
        this.logger.log(`Processing agent job: ${taskId} - ${agentType}`);
        results = await this.orchestrator.runAgent(agentType, input);
      } else {
        throw new Error('No agent type or agents array provided');
      }

      // Update status to completed with results
      await this.queueService.updateTaskStatus(taskId, 'completed', 100, {
        success: true,
        results,
        error: '',
        completedAt: new Date(),
      });

      // Trigger user webhooks for agent completion
      await this.webhooksService.trigger('agent.completed', {
        taskId,
        agentType: isMultiAgent ? 'multi' : agentType,
        agents: isMultiAgent ? agents : undefined,
        userId: body.userId,
        results: results.map(r => ({
          phase: r.phase,
          confidence: r.output.confidence,
          sourcesCount: r.output.sources.length,
        })),
        completedAt: new Date().toISOString(),
      });

      this.logger.log(`Task ${taskId} completed successfully`);
      return { success: true, taskId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Task ${taskId} failed: ${errorMessage}`);

      // Update status to failed
      await this.queueService.updateTaskStatus(taskId, 'failed', 0, undefined, errorMessage);

      // Trigger user webhooks for agent failure
      await this.webhooksService.trigger('agent.failed', {
        taskId,
        agentType: isMultiAgent ? 'multi' : agentType,
        agents: isMultiAgent ? agents : undefined,
        userId: body.userId,
        error: errorMessage,
        failedAt: new Date().toISOString(),
      });

      // Return 200 to prevent QStash retries for application errors
      // QStash will retry on 5xx errors
      return { success: false, taskId };
    }
  }
}
