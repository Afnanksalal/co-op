import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { OrchestratorService } from '../orchestrator/orchestrator.service';
import { AgentJobData, AgentJobResult } from './agents.queue.types';

@Processor('agents')
export class AgentsProcessor extends WorkerHost {
  private readonly logger = new Logger(AgentsProcessor.name);

  constructor(private readonly orchestrator: OrchestratorService) {
    super();
  }

  async process(job: Job<AgentJobData, AgentJobResult>): Promise<AgentJobResult> {
    const jobId = job.id ?? 'unknown';
    this.logger.log(`Processing agent job ${jobId} - ${job.data.agentType}`);

    try {
      const results = await this.orchestrator.runAgent(job.data.agentType, job.data.input);

      return {
        success: true,
        results,
        error: '',
        completedAt: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Agent job ${jobId} failed`, error);
      return {
        success: false,
        results: [],
        error: errorMessage,
        completedAt: new Date(),
      };
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<AgentJobData, AgentJobResult>): void {
    const jobId = job.id ?? 'unknown';
    this.logger.log(`Job ${jobId} completed`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<AgentJobData, AgentJobResult>, error: Error): void {
    const jobId = job.id ?? 'unknown';
    this.logger.error(`Job ${jobId} failed: ${error.message}`);
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job<AgentJobData, AgentJobResult>, progress: number): void {
    const jobId = job.id ?? 'unknown';
    this.logger.debug(`Job ${jobId} progress: ${String(progress)}%`);
  }
}
