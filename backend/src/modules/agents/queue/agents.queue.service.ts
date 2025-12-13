import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { QStashService } from '@/common/qstash';
import { RedisService } from '@/common/redis/redis.service';
import { AgentJobResult } from './agents.queue.types';
import { AgentType, AgentInput } from '../types/agent.types';
import { TaskStatusDto, TaskState } from '../dto/task-status.dto';

interface AddJobResult {
  taskId: string;
  messageId: string;
}

const TASK_STATUS_PREFIX = 'task:status:';
const TASK_RESULT_PREFIX = 'task:result:';
const TASK_TTL = 86400; // 24 hours

@Injectable()
export class AgentsQueueService {
  private readonly logger = new Logger(AgentsQueueService.name);

  constructor(
    private readonly qstash: QStashService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Add a job to QStash queue
   * @param agentType - Primary agent type (or 'legal' for multi-agent)
   * @param input - Agent input
   * @param userId - User ID
   * @param agents - Optional array of agents for multi-agent mode
   */
  async addJob(
    agentType: AgentType,
    input: AgentInput,
    userId: string,
    agents?: string[],
  ): Promise<AddJobResult> {
    const taskId = uuid();
    const isMultiAgent = agents && agents.length > 0;

    if (!this.qstash.isAvailable()) {
      throw new Error('QStash not configured - cannot queue jobs');
    }

    const result = await this.qstash.publish({
      taskId,
      type: isMultiAgent ? 'multi' : agentType,
      payload: {
        agentType: isMultiAgent ? undefined : agentType,
        agents: isMultiAgent ? agents : undefined,
        input,
        isMultiAgent,
      },
      userId,
      createdAt: new Date().toISOString(),
    });

    // Store initial status in Redis
    await this.redis.set(
      `${TASK_STATUS_PREFIX}${taskId}`,
      { status: 'waiting', progress: 0, createdAt: new Date().toISOString(), isMultiAgent },
      TASK_TTL,
    );

    this.logger.log(`QStash job published: ${result.messageId} for ${isMultiAgent ? `multi-agent (${agents.join(', ')})` : agentType}`);
    return { taskId, messageId: result.messageId };
  }

  /**
   * Get job status from Redis
   */
  async getJobStatus(taskId: string): Promise<TaskStatusDto | null> {
    const status = await this.redis.get<{
      status: string;
      progress: number;
      result?: AgentJobResult;
      error?: string;
    }>(`${TASK_STATUS_PREFIX}${taskId}`);

    if (!status) {
      return null;
    }

    return {
      status: status.status as TaskState,
      progress: status.progress,
      result: status.result,
      error: status.error,
    };
  }

  /**
   * Update task status (called by webhook handler for QStash jobs)
   */
  async updateTaskStatus(
    taskId: string,
    status: TaskState,
    progress: number,
    result?: AgentJobResult,
    error?: string,
  ): Promise<void> {
    await this.redis.set(
      `${TASK_STATUS_PREFIX}${taskId}`,
      { status, progress, result, error, updatedAt: new Date().toISOString() },
      TASK_TTL,
    );

    if (result) {
      await this.redis.set(`${TASK_RESULT_PREFIX}${taskId}`, result, TASK_TTL);
    }

    this.logger.debug(`Task ${taskId} status updated: ${status} (${String(progress)}%)`);
  }

  /**
   * Get task result
   */
  async getTaskResult(taskId: string): Promise<AgentJobResult | null> {
    const result = await this.redis.get<AgentJobResult>(`${TASK_RESULT_PREFIX}${taskId}`);
    return result;
  }

  /**
   * Cancel a job (marks as cancelled in Redis, webhook will check before processing)
   */
  async cancelJob(taskId: string): Promise<boolean> {
    const status = await this.redis.get(`${TASK_STATUS_PREFIX}${taskId}`);
    if (!status) {
      return false;
    }

    await this.redis.set(
      `${TASK_STATUS_PREFIX}${taskId}`,
      { status: 'cancelled', progress: 0, cancelledAt: new Date().toISOString() },
      TASK_TTL,
    );
    return true;
  }

  /**
   * Check if task was cancelled (for webhook handler)
   */
  async isTaskCancelled(taskId: string): Promise<boolean> {
    const status = await this.redis.get<{ status: string }>(`${TASK_STATUS_PREFIX}${taskId}`);
    return status?.status === 'cancelled';
  }
}
