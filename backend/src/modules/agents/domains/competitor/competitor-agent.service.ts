import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { ResearchService } from '@/common/research/research.service';
import { BaseAgent, AgentInput, AgentOutput } from '../../types/agent.types';

const COMPETITOR_SYSTEM_PROMPT = `Expert competitive intelligence analyst. Topics: landscape, positioning, moats, GTM, pricing, features.

Rules:
- List specific competitor names
- Include funding, pricing, features
- Max 5 competitors
- Bullet points only
- Cite sources with URLs`;

@Injectable()
export class CompetitorAgentService implements BaseAgent {
  private readonly logger = new Logger(CompetitorAgentService.name);
  private readonly minModels: number;
  private readonly maxModels: number;

  constructor(
    private readonly council: LlmCouncilService,
    private readonly config: ConfigService,
    private readonly researchService: ResearchService,
  ) {
    this.minModels = this.config.get<number>('LLM_COUNCIL_MIN_MODELS', 3);
    this.maxModels = this.config.get<number>('LLM_COUNCIL_MAX_MODELS', 5);
  }

  async runDraft(input: AgentInput): Promise<AgentOutput> {
    this.logger.debug('Running competitor agent with LLM Council + RAG + Web Research');

    // Gather context from multiple sources in parallel
    const [ragContext, webContext] = await Promise.all([
      this.getRagContext(input),
      this.getWebResearchContext(input),
    ]);

    const userPrompt = this.buildUserPrompt(input, ragContext, webContext);

    const result = await this.council.runCouncil(COMPETITOR_SYSTEM_PROMPT, userPrompt, {
      minModels: this.minModels,
      maxModels: this.maxModels,
      temperature: 0.7,
      maxTokens: 1500,
    });

    // Extract sources from research
    const sources = this.extractSources(webContext);

    return {
      content: result.finalResponse,
      confidence: result.consensus.averageScore / 10,
      sources,
      metadata: {
        phase: 'council',
        agent: 'competitor',
        modelsUsed: result.metadata.modelsUsed,
        totalTokens: result.metadata.totalTokens,
        processingTimeMs: result.metadata.processingTimeMs,
        consensusScore: result.consensus.averageScore,
        responsesCount: result.responses.length,
        critiquesCount: result.critiques.length,
        ragContextUsed: ragContext.length > 0,
        webResearchUsed: webContext.length > 0,
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
      sources: draft.sources,
      metadata: {
        phase: 'critique',
        agent: 'competitor',
        ...draft.metadata,
      },
    });
  }

  runFinal(_input: AgentInput, draft: AgentOutput, _critique: AgentOutput): Promise<AgentOutput> {
    return Promise.resolve({
      content: draft.content,
      confidence: draft.confidence,
      sources: draft.sources,
      metadata: {
        phase: 'final',
        agent: 'competitor',
        ...draft.metadata,
      },
    });
  }

  private getRagContext(_input: AgentInput): Promise<string> {
    // Competitor agent is web-research based, not RAG-based
    // RAG is only for legal and finance agents
    return Promise.resolve('');
  }

  private async getWebResearchContext(input: AgentInput): Promise<string> {
    try {
      // Extract company name and industry from metadata or prompt
      const companyName = this.extractFromMetadata(input, 'companyName', 'startup');
      const industry = this.extractFromMetadata(input, 'industry', 'technology');
      const description = this.extractFromMetadata(input, 'description', input.prompt);

      const context = await this.researchService.gatherCompetitorContext(
        companyName,
        industry,
        description,
      );

      return this.researchService.formatContextForPrompt(context);
    } catch (error) {
      this.logger.warn('Failed to get web research context', error);
      return '';
    }
  }

  private extractFromMetadata(input: AgentInput, key: string, fallback: string): string {
    const value = input.context.metadata[key];
    if (typeof value === 'string' && value.length > 0) {
      return value;
    }
    return fallback;
  }

  private extractSources(webContext: string): string[] {
    // Extract URLs from the web context
    const urlRegex = /https?:\/\/[^\s)]+/g;
    const matches = webContext.match(urlRegex);
    return matches ? [...new Set(matches)] : [];
  }

  private buildUserPrompt(input: AgentInput, ragContext: string, webContext: string): string {
    let prompt = input.prompt;

    // Add document context from RAG
    if (ragContext) {
      prompt += ragContext;
    }

    // Add web research context
    if (webContext) {
      prompt += webContext;
    }

    // Add any provided documents
    if (input.documents.length > 0) {
      prompt += `\n\nAdditional documents:\n${input.documents.join('\n---\n')}`;
    }

    // Add metadata context
    if (Object.keys(input.context.metadata).length > 0) {
      prompt += `\n\nStartup Context: ${JSON.stringify(input.context.metadata)}`;
    }

    return prompt;
  }
}
