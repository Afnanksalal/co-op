import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentInput, AgentOutput } from '../../types/agent.types';

@Injectable()
export class InvestorAgentService implements BaseAgent {
  async runDraft(input: AgentInput): Promise<AgentOutput> {
    // TODO: Implement investor draft generation
    return {
      content: '',
      confidence: 0,
      sources: [],
      metadata: { phase: 'draft', agent: 'investor' },
    };
  }

  async runCritique(input: AgentInput, draft: AgentOutput): Promise<AgentOutput> {
    // TODO: Implement investor critique
    return {
      content: '',
      confidence: 0,
      sources: [],
      metadata: { phase: 'critique', agent: 'investor' },
    };
  }

  async runFinal(input: AgentInput, draft: AgentOutput, critique: AgentOutput): Promise<AgentOutput> {
    // TODO: Implement investor final output
    return {
      content: '',
      confidence: 0,
      sources: [],
      metadata: { phase: 'final', agent: 'investor' },
    };
  }
}
