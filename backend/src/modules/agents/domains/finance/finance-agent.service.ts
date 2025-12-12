import { Injectable } from '@nestjs/common';
import { BaseAgent, AgentInput, AgentOutput } from '../../types/agent.types';

@Injectable()
export class FinanceAgentService implements BaseAgent {
  async runDraft(input: AgentInput): Promise<AgentOutput> {
    // TODO: Implement finance draft generation
    return {
      content: '',
      confidence: 0,
      sources: [],
      metadata: { phase: 'draft', agent: 'finance' },
    };
  }

  async runCritique(input: AgentInput, draft: AgentOutput): Promise<AgentOutput> {
    // TODO: Implement finance critique
    return {
      content: '',
      confidence: 0,
      sources: [],
      metadata: { phase: 'critique', agent: 'finance' },
    };
  }

  async runFinal(input: AgentInput, draft: AgentOutput, critique: AgentOutput): Promise<AgentOutput> {
    // TODO: Implement finance final output
    return {
      content: '',
      confidence: 0,
      sources: [],
      metadata: { phase: 'final', agent: 'finance' },
    };
  }
}
