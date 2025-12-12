import { Injectable } from '@nestjs/common';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { AgentInput, AgentPhaseResult } from './types/agent.types';
import { RunAgentDto } from './dto/run-agent.dto';
import { TaskStatusDto } from './dto/task-status.dto';

interface QueueTaskResult {
  taskId: string;
  jobId: string;
}

@Injectable()
export class AgentsService {
  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly queueService: AgentsQueueService,
  ) {}

  async run(userId: string, dto: RunAgentDto): Promise<AgentPhaseResult[]> {
    const input: AgentInput = {
      context: {
        sessionId: dto.sessionId,
        userId,
        startupId: dto.startupId,
        metadata: {},
      },
      prompt: dto.prompt,
      documents: dto.documents,
    };

    return this.orchestrator.runAgent(dto.agentType, input);
  }

  async queueTask(userId: string, dto: RunAgentDto): Promise<QueueTaskResult> {
    const input: AgentInput = {
      context: {
        sessionId: dto.sessionId,
        userId,
        startupId: dto.startupId,
        metadata: {},
      },
      prompt: dto.prompt,
      documents: dto.documents,
    };

    return this.queueService.addJob(dto.agentType, input, userId);
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusDto | null> {
    return this.queueService.getJobStatus(taskId);
  }

  async cancelTask(taskId: string): Promise<boolean> {
    return this.queueService.cancelJob(taskId);
  }
}
