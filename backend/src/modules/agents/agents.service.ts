import { Injectable } from '@nestjs/common';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentType, AgentInput, AgentPhaseResult, OrchestratorTask } from './types/agent.types';
import { RunAgentDto } from './dto/run-agent.dto';

@Injectable()
export class AgentsService {
  constructor(private readonly orchestrator: OrchestratorService) {}

  async run(userId: string, dto: RunAgentDto): Promise<AgentPhaseResult[]> {
    const input: AgentInput = {
      context: {
        sessionId: dto.sessionId,
        userId,
        startupId: dto.startupId,
      },
      prompt: dto.prompt,
      documents: dto.documents,
    };

    return this.orchestrator.runAgent(dto.agentType, input);
  }

  async createTask(userId: string, dto: RunAgentDto): Promise<string> {
    const input: AgentInput = {
      context: {
        sessionId: dto.sessionId,
        userId,
        startupId: dto.startupId,
      },
      prompt: dto.prompt,
      documents: dto.documents,
    };

    return this.orchestrator.createTask(dto.agentType, input);
  }

  async getTask(taskId: string): Promise<OrchestratorTask | null> {
    return this.orchestrator.getTask(taskId);
  }
}
