import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { BaseAgent, AgentInput, AgentOutput } from '../../types/agent.types';

const INVESTOR_SYSTEM_PROMPT = `You are an expert investor relations advisor for startups. You provide clear, actionable guidance on:
- Pitch deck creation and optimization
- Investor targeting and outreach strategies
- Due diligence preparation
- Term sheet negotiation
- Cap table management
- Investor communication and updates
- Fundraising timeline and milestones

Always provide strategic insights from both founder and investor perspectives.
Be specific about what investors look for and common pitfalls to avoid.`;

@Injectable()
export class InvestorAgentService implements BaseAgent {
  private readonly logger = new Logger(InvestorAgentService.name);
  private readonly minModels: number;
  private readonly maxModels: number;

  constructor(
    private readonly council: LlmCouncilService,
    private readonly config: ConfigService,
  ) {
    this.minModels = this.config.get<number>('LLM_COUNCIL_MIN_MODELS', 3);
    this.maxModels = this.config.get<number>('LLM_COUNCIL_MAX_MODELS', 5);
  }

  async runDraft(input: AgentInput): Promise<AgentOutput> {
    this.logger.debug('Running investor agent with LLM Council');

    const userPrompt = this.buildUserPrompt(input);

    const result = await this.council.runCouncil(INVESTOR_SYSTEM_PROMPT, userPrompt, {
      minModels: this.minModels,
      maxModels: this.maxModels,
      temperature: 0.7,
      maxTokens: 2048,
    });

    return {
      content: result.finalResponse,
      confidence: result.consensus.averageScore / 10,
      sources: [],
      metadata: {
        phase: 'council',
        agent: 'investor',
        modelsUsed: result.metadata.modelsUsed,
        totalTokens: result.metadata.totalTokens,
        processingTimeMs: result.metadata.processingTimeMs,
        consensusScore: result.consensus.averageScore,
        responsesCount: result.responses.length,
        critiquesCount: result.critiques.length,
      },
    };
  }

  runCritique(_input: AgentInput, draft: AgentOutput): Promise<AgentOutput> {
    const critiquesCount = typeof draft.metadata?.critiquesCount === 'number'
      ? draft.metadata.critiquesCount
      : 0;

    return Promise.resolve({
      content: `Council critique completed with ${String(critiquesCount)} cross-critiques`,
      confidence: draft.confidence,
      sources: [],
      metadata: {
        phase: 'critique',
        agent: 'investor',
        ...draft.metadata,
      },
    });
  }

  runFinal(_input: AgentInput, draft: AgentOutput, _critique: AgentOutput): Promise<AgentOutput> {
    return Promise.resolve({
      content: draft.content,
      confidence: draft.confidence,
      sources: [],
      metadata: {
        phase: 'final',
        agent: 'investor',
        ...draft.metadata,
      },
    });
  }

  private buildUserPrompt(input: AgentInput): string {
    let prompt = input.prompt;

    if (input.documents.length > 0) {
      prompt += `\n\nRelevant documents:\n${input.documents.join('\n---\n')}`;
    }

    if (Object.keys(input.context.metadata).length > 0) {
      prompt += `\n\nContext: ${JSON.stringify(input.context.metadata)}`;
    }

    return prompt;
  }
}
