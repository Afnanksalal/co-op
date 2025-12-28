import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import {
  AgentType,
  AgentInput,
  AgentPhaseResult,
  OrchestratorTask,
  BaseAgent,
} from '../types/agent.types';
import { LegalAgentService } from '../domains/legal/legal-agent.service';
import { FinanceAgentService } from '../domains/finance/finance-agent.service';
import { InvestorAgentService } from '../domains/investor/investor-agent.service';
import { CompetitorAgentService } from '../domains/competitor/competitor-agent.service';
import { RedisService } from '@/common/redis/redis.service';
import { MetricsService } from '@/common/metrics/metrics.service';

// Task TTL in Redis (24 hours)
const TASK_TTL_SECONDS = 24 * 60 * 60;
// Task key prefix
const TASK_PREFIX = 'task:';
// Dead letter queue for failed tasks
const TASK_DLQ_KEY = 'task:dlq';
// Max items in DLQ
const TASK_DLQ_MAX_SIZE = 500;
// DLQ retry interval (10 minutes)
const TASK_DLQ_RETRY_INTERVAL_MS = 10 * 60 * 1000;
// Max retry attempts for failed tasks
const TASK_MAX_RETRIES = 3;

interface FailedTask {
  task: OrchestratorTask;
  error: string;
  failedAt: number;
  retryCount: number;
}

@Injectable()
export class OrchestratorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrchestratorService.name);
  private dlqRetryInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly legalAgent: LegalAgentService,
    private readonly financeAgent: FinanceAgentService,
    private readonly investorAgent: InvestorAgentService,
    private readonly competitorAgent: CompetitorAgentService,
    private readonly redis: RedisService,
    private readonly metricsService: MetricsService,
  ) {}

  onModuleInit(): void {
    // Start DLQ processor
    this.dlqRetryInterval = setInterval(() => {
      void this.processDlq();
    }, TASK_DLQ_RETRY_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.dlqRetryInterval) {
      clearInterval(this.dlqRetryInterval);
      this.dlqRetryInterval = null;
    }
  }

  /**
   * Process dead letter queue - retry failed tasks
   */
  private async processDlq(): Promise<void> {
    try {
      const items = await this.redis.lrange(TASK_DLQ_KEY, 0, 20);
      if (items.length === 0) return;

      this.logger.log(`Processing ${items.length} items from task DLQ`);
      let processed = 0;

      for (const item of items) {
        try {
          const failedTask = JSON.parse(item) as FailedTask;
          
          // Skip if max retries exceeded
          if (failedTask.retryCount >= TASK_MAX_RETRIES) {
            this.logger.warn(`Task ${failedTask.task.id} exceeded max retries, removing from DLQ`);
            await this.redis.lrem(TASK_DLQ_KEY, 1, item);
            continue;
          }

          // Restore task to pending state for retry with incremented retry count
          const task = failedTask.task;
          task.status = 'pending';
          task.error = undefined;
          task.updatedAt = new Date();
          
          // Store the incremented retry count in task metadata for tracking
          const newRetryCount = failedTask.retryCount + 1;
          (task as OrchestratorTask & { retryCount?: number }).retryCount = newRetryCount;
          
          await this.redis.set(`${TASK_PREFIX}${task.id}`, task, TASK_TTL_SECONDS);
          await this.redis.lrem(TASK_DLQ_KEY, 1, item);
          processed++;
          
          this.logger.log(`Restored task ${task.id} from DLQ (retry ${newRetryCount}/${TASK_MAX_RETRIES})`);
        } catch {
          // Leave in DLQ for next retry
        }
      }

      if (processed > 0) {
        this.logger.log(`Processed ${processed}/${items.length} task DLQ items`);
      }
    } catch (error) {
      this.logger.warn(`Failed to process task DLQ: ${String(error)}`);
    }
  }

  /**
   * Queue failed task to dead letter queue for retry
   */
  async queueFailedTask(task: OrchestratorTask, error: string, retryCount?: number): Promise<void> {
    try {
      // Use retry count from task metadata if available, otherwise use provided value or 0
      const taskRetryCount = (task as OrchestratorTask & { retryCount?: number }).retryCount ?? retryCount ?? 0;
      
      const failedTask: FailedTask = {
        task,
        error,
        failedAt: Date.now(),
        retryCount: taskRetryCount,
      };
      
      const queueLength = await this.redis.lpush(TASK_DLQ_KEY, JSON.stringify(failedTask));
      if (queueLength > TASK_DLQ_MAX_SIZE) {
        this.logger.warn(`Task DLQ size (${queueLength}) exceeds max (${TASK_DLQ_MAX_SIZE})`);
      }
      
      this.logger.log(`Task ${task.id} queued to DLQ for retry`);
    } catch (dlqError) {
      this.logger.error(`Failed to queue task to DLQ: ${String(dlqError)}`);
    }
  }

  /**
   * Get DLQ stats for monitoring
   */
  async getDlqStats(): Promise<{ size: number; oldestItem: number | null }> {
    try {
      const items = await this.redis.lrange(TASK_DLQ_KEY, -1, -1);
      const size = items.length > 0 ? (await this.redis.lrange(TASK_DLQ_KEY, 0, -1)).length : 0;
      
      let oldestItem: number | null = null;
      if (items.length > 0) {
        const oldest = JSON.parse(items[0]) as FailedTask;
        oldestItem = oldest.failedAt;
      }
      
      return { size, oldestItem };
    } catch {
      return { size: 0, oldestItem: null };
    }
  }

  private getAgent(type: AgentType): BaseAgent {
    const agents: Record<AgentType, BaseAgent> = {
      legal: this.legalAgent,
      finance: this.financeAgent,
      investor: this.investorAgent,
      competitor: this.competitorAgent,
    };
    return agents[type];
  }

  async runAgent(
    agentType: AgentType,
    input: AgentInput,
    onProgress?: (step: string) => void,
  ): Promise<AgentPhaseResult[]> {
    const agent = this.getAgent(agentType);
    const results: AgentPhaseResult[] = [];
    const agentName = agentType.charAt(0).toUpperCase() + agentType.slice(1);
    const startTime = Date.now();

    try {
      this.logger.log(`Running ${agentType} agent - Draft phase`);
      onProgress?.(`${agentName} agent: Generating initial draft...`);
      const draft = await agent.runDraft(input, onProgress);
      results.push({ phase: 'draft', output: draft, timestamp: new Date() });
      onProgress?.(`${agentName} agent: Draft complete`);

      this.logger.log(`Running ${agentType} agent - Critique phase`);
      onProgress?.(`${agentName} agent: Self-critiquing response...`);
      const critique = await agent.runCritique(input, draft, onProgress);
      results.push({ phase: 'critique', output: critique, timestamp: new Date() });
      onProgress?.(`${agentName} agent: Critique complete`);

      this.logger.log(`Running ${agentType} agent - Final phase`);
      onProgress?.(`${agentName} agent: Generating final response...`);
      const final = await agent.runFinal(input, draft, critique, onProgress);
      results.push({ phase: 'final', output: final, timestamp: new Date() });
      onProgress?.(`${agentName} agent: Final response ready`);

      // Record successful agent task metrics
      const durationMs = Date.now() - startTime;
      this.metricsService.recordAgentTask(agentType, 'completed', durationMs);

      return results;
    } catch (error) {
      // Record failed agent task metrics
      const durationMs = Date.now() - startTime;
      this.metricsService.recordAgentTask(agentType, 'failed', durationMs);
      
      this.logger.error(`Agent ${agentType} execution failed`, error);
      throw error;
    }
  }

  async createTask(agentType: AgentType, input: AgentInput): Promise<string> {
    const taskId = uuid();
    const task: OrchestratorTask = {
      id: taskId,
      agentType,
      input,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    // Store in Redis with TTL for automatic cleanup
    await this.redis.set(`${TASK_PREFIX}${taskId}`, task, TASK_TTL_SECONDS);
    return taskId;
  }

  async getTask(taskId: string): Promise<OrchestratorTask | null> {
    const task = await this.redis.get<OrchestratorTask>(`${TASK_PREFIX}${taskId}`);
    if (task) {
      // Restore Date objects from JSON
      task.createdAt = new Date(task.createdAt);
      task.updatedAt = new Date(task.updatedAt);
    }
    return task;
  }

  async updateTask(taskId: string, updates: Partial<OrchestratorTask>): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      const updatedTask = { ...task, ...updates, updatedAt: new Date() };
      await this.redis.set(`${TASK_PREFIX}${taskId}`, updatedTask, TASK_TTL_SECONDS);
    }
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = await this.getTask(taskId);
    if (task) {
      task.status = 'failed';
      task.error = 'Cancelled by user';
      task.updatedAt = new Date();
      await this.redis.set(`${TASK_PREFIX}${taskId}`, task, TASK_TTL_SECONDS);
    }
  }
}
