import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);
  private readonly tasks = new Map<string, OrchestratorTask>();

  constructor(
    private readonly legalAgent: LegalAgentService,
    private readonly financeAgent: FinanceAgentService,
    private readonly investorAgent: InvestorAgentService,
    private readonly competitorAgent: CompetitorAgentService,
  ) {}

  private getAgent(type: AgentType): BaseAgent {
    const agents: Record<AgentType, BaseAgent> = {
      legal: this.legalAgent,
      finance: this.financeAgent,
      investor: this.investorAgent,
      competitor: this.competitorAgent,
    };
    return agents[type];
  }

  async runAgent(agentType: AgentType, input: AgentInput): Promise<AgentPhaseResult[]> {
    const agent = this.getAgent(agentType);
    const results: AgentPhaseResult[] = [];

    try {
      this.logger.log(`Running ${agentType} agent - Draft phase`);
      const draft = await agent.runDraft(input);
      results.push({ phase: 'draft', output: draft, timestamp: new Date() });

      this.logger.log(`Running ${agentType} agent - Critique phase`);
      const critique = await agent.runCritique(input, draft);
      results.push({ phase: 'critique', output: critique, timestamp: new Date() });

      this.logger.log(`Running ${agentType} agent - Final phase`);
      const final = await agent.runFinal(input, draft, critique);
      results.push({ phase: 'final', output: final, timestamp: new Date() });

      return results;
    } catch (error) {
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
    this.tasks.set(taskId, task);
    return taskId;
  }

  async getTask(taskId: string): Promise<OrchestratorTask | null> {
    return this.tasks.get(taskId) || null;
  }

  async cancelTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'failed';
      task.error = 'Cancelled by user';
      task.updatedAt = new Date();
    }
  }
}
