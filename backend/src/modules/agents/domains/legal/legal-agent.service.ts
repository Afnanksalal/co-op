import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { RagService } from '@/common/rag/rag.service';
import { RagSector } from '@/common/rag/rag.types';
import { BaseAgent, AgentInput, AgentOutput } from '../../types/agent.types';

const LEGAL_SYSTEM_PROMPT = `Expert startup legal advisor. Topics: corporate structure, IP, employment, compliance, fundraising, ToS/privacy.

Rules:
- Bullet points only
- Max 5 key points
- Cite specific laws/regulations
- Reference provided documents when relevant
- Flag when lawyer needed
- No fluff or disclaimers`;

@Injectable()
export class LegalAgentService implements BaseAgent {
  private readonly logger = new Logger(LegalAgentService.name);
  private readonly minModels: number;
  private readonly maxModels: number;

  constructor(
    private readonly council: LlmCouncilService,
    private readonly config: ConfigService,
    private readonly ragService: RagService,
  ) {
    this.minModels = this.config.get<number>('LLM_COUNCIL_MIN_MODELS', 3);
    this.maxModels = this.config.get<number>('LLM_COUNCIL_MAX_MODELS', 5);
  }

  async runDraft(input: AgentInput): Promise<AgentOutput> {
    this.logger.debug('Running legal agent with LLM Council + RAG');

    // Get sector from startup metadata
    const sector = (input.context.metadata.sector as RagSector) || 'saas';

    // Fetch RAG context for legal domain
    let ragContext = '';
    if (this.ragService.isAvailable()) {
      ragContext = await this.ragService.getContext(input.prompt, 'legal', sector, 5);
      if (ragContext) {
        this.logger.debug(`RAG context fetched for legal/${sector}`);
      }
    }

    const userPrompt = this.buildUserPrompt(input, ragContext);

    const result = await this.council.runCouncil(LEGAL_SYSTEM_PROMPT, userPrompt, {
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
        agent: 'legal',
        sector,
        ragEnabled: Boolean(ragContext),
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
    const critiquesCount =
      typeof draft.metadata?.critiquesCount === 'number' ? draft.metadata.critiquesCount : 0;

    return Promise.resolve({
      content: `Council critique completed with ${String(critiquesCount)} cross-critiques`,
      confidence: draft.confidence,
      sources: [],
      metadata: {
        phase: 'critique',
        agent: 'legal',
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
        agent: 'legal',
        ...draft.metadata,
      },
    });
  }

  private buildUserPrompt(input: AgentInput, ragContext: string): string {
    let prompt = input.prompt;

    // Add RAG context if available
    if (ragContext) {
      prompt += ragContext;
    }

    // Add any additional documents
    if (input.documents.length > 0) {
      prompt += `\n\nAdditional documents:\n${input.documents.join('\n---\n')}`;
    }

    // Add startup context
    if (Object.keys(input.context.metadata).length > 0) {
      const { companyName, industry, stage, country } = input.context.metadata;
      prompt += `\n\nStartup: ${String(companyName)} (${String(industry)}, ${String(stage)}, ${String(country)})`;
    }

    return prompt;
  }
}
