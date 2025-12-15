import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { StartupsService } from '@/modules/startups/startups.service';
import { UsersService } from '@/modules/users/users.service';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { AgentType, AgentInput, AgentPhaseResult } from './types/agent.types';
import { RunAgentDto } from './dto/run-agent.dto';
import { TaskStatusDto } from './dto/task-status.dto';

interface QueueTaskResult {
  taskId: string;
  messageId: string;
}

interface A2AAgentResponse {
  agent: AgentType;
  id: string;
  content: string;
  confidence: number;
  sources: string[];
}

interface A2ACritique {
  responseId: string;
  criticAgent: string;
  score: number;
  feedback: string;
}

const ALL_AGENTS: AgentType[] = ['legal', 'finance', 'investor', 'competitor'];

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly queueService: AgentsQueueService,
    private readonly startupsService: StartupsService,
    private readonly usersService: UsersService,
    private readonly council: LlmCouncilService,
  ) {}

  async run(userId: string, dto: RunAgentDto): Promise<AgentPhaseResult[]> {
    const input = await this.buildAgentInput(userId, dto);
    
    // Multi-agent mode: no agentType specified or agents array provided
    if (!dto.agentType) {
      const agents = dto.agents?.filter((a): a is AgentType => ALL_AGENTS.includes(a as AgentType)) ?? ALL_AGENTS;
      return this.runMultiAgent(agents, input, dto.prompt);
    }
    
    return this.orchestrator.runAgent(dto.agentType, input);
  }

  async queueTask(userId: string, dto: RunAgentDto): Promise<QueueTaskResult> {
    const input = await this.buildAgentInput(userId, dto);
    
    // For multi-agent, we use 'legal' as the primary but the queue service will handle multi-agent
    const agentType = dto.agentType ?? 'legal';
    const isMultiAgent = !dto.agentType;
    
    return this.queueService.addJob(agentType, input, userId, isMultiAgent ? (dto.agents ?? ALL_AGENTS) : undefined);
  }

  /**
   * Run multi-agent A2A query with cross-critique
   */
  private async runMultiAgent(agents: AgentType[], input: AgentInput, prompt: string): Promise<AgentPhaseResult[]> {
    this.logger.log(`A2A Multi-Agent: ${agents.join(', ')}`);
    
    // Phase 1: All agents generate responses in parallel
    const responses = await this.gatherAgentResponses(agents, input);
    
    if (responses.length < 2) {
      throw new BadRequestException('Need at least 2 agent responses for A2A critique');
    }
    
    // Phase 2: Shuffle responses (anonymize for fair critique)
    const shuffledResponses = this.shuffleArray(responses);
    
    // Phase 3: Cross-critique
    const critiques = await this.generateA2ACritiques(agents, shuffledResponses, prompt);
    
    // Phase 4: Synthesize
    const { averageScore, synthesizedContent, allSources } = await this.synthesizeA2AResult(
      responses,
      critiques,
      prompt,
    );
    
    return [
      {
        phase: 'draft',
        output: {
          content: `Gathered ${responses.length} agent responses`,
          confidence: 0.5,
          sources: [],
          metadata: { agents: responses.map((r) => r.agent) },
        },
        timestamp: new Date(),
      },
      {
        phase: 'critique',
        output: {
          content: `${critiques.length} cross-critiques completed`,
          confidence: averageScore / 10,
          sources: [],
          metadata: { critiquesCount: critiques.length },
        },
        timestamp: new Date(),
      },
      {
        phase: 'final',
        output: {
          content: synthesizedContent,
          confidence: averageScore / 10,
          sources: allSources,
          metadata: {
            phase: 'final',
            agent: 'multi',
            agentsUsed: agents,
            critiquesCount: critiques.length,
            consensusScore: averageScore,
          },
        },
        timestamp: new Date(),
      },
    ];
  }

  private async gatherAgentResponses(agents: AgentType[], input: AgentInput): Promise<A2AAgentResponse[]> {
    const results = await Promise.all(
      agents.map(async (agent) => {
        try {
          const output = await this.orchestrator.runAgent(agent, input);
          const final = output.find((r) => r.phase === 'final');
          if (!final) return null;
          
          return {
            agent,
            id: uuid(),
            content: final.output.content,
            confidence: final.output.confidence,
            sources: final.output.sources,
          };
        } catch (error) {
          this.logger.warn(`Agent ${agent} failed`, error);
          return null;
        }
      }),
    );
    
    return results.filter((r): r is A2AAgentResponse => r !== null);
  }

  private async generateA2ACritiques(
    agents: AgentType[],
    responses: A2AAgentResponse[],
    prompt: string,
  ): Promise<A2ACritique[]> {
    const critiques: A2ACritique[] = [];
    
    for (const criticAgent of agents) {
      const otherResponses = responses.filter((r) => r.agent !== criticAgent);
      
      for (const response of otherResponses) {
        try {
          const critique = await this.critiqueResponse(criticAgent, response, prompt);
          if (critique) critiques.push(critique);
        } catch (error) {
          this.logger.warn(`Critique by ${criticAgent} failed`, error);
        }
      }
    }
    
    return critiques;
  }

  private async critiqueResponse(
    criticAgent: string,
    response: A2AAgentResponse,
    prompt: string,
  ): Promise<A2ACritique | null> {
    const critiquePrompt = `As ${criticAgent} expert, critique this response:

Question: ${prompt}

Response:
${response.content.slice(0, 1000)}

Rate 1-10 and give brief feedback. JSON only:
{"score":1-10,"feedback":"1 sentence"}`;

    try {
      const result = await this.council.runCouncil(
        'You are a critical evaluator. JSON only.',
        critiquePrompt,
        { minModels: 1, maxModels: 1, temperature: 0.3, maxTokens: 200 },
      );
      
      const parsed = JSON.parse(result.finalResponse) as { score: number; feedback: string };
      
      return {
        responseId: response.id,
        criticAgent,
        score: Math.min(10, Math.max(1, parsed.score)),
        feedback: parsed.feedback,
      };
    } catch {
      return null;
    }
  }

  private async synthesizeA2AResult(
    responses: A2AAgentResponse[],
    critiques: A2ACritique[],
    prompt: string,
  ): Promise<{ bestResponse: A2AAgentResponse; averageScore: number; synthesizedContent: string; allSources: string[] }> {
    const scoreMap = new Map<string, number[]>();
    for (const critique of critiques) {
      const scores = scoreMap.get(critique.responseId) ?? [];
      scores.push(critique.score);
      scoreMap.set(critique.responseId, scores);
    }
    
    let bestResponse = responses[0];
    let highestAvg = 0;
    let totalAvg = 0;
    let count = 0;
    
    for (const response of responses) {
      const scores = scoreMap.get(response.id) ?? [];
      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        totalAvg += avg;
        count++;
        if (avg > highestAvg) {
          highestAvg = avg;
          bestResponse = response;
        }
      }
    }
    
    const averageScore = count > 0 ? totalAvg / count : 5;
    const allSources = [...new Set(responses.flatMap((r) => r.sources))];
    
    const bestCritiques = critiques.filter((c) => c.responseId === bestResponse.id);
    
    const synthesisPrompt = `You are synthesizing expert advice for a startup founder who needs ACTIONABLE guidance.

QUESTION: ${prompt}

EXPERT RESPONSES:

${responses.map((r) => `=== ${r.agent.toUpperCase()} EXPERT ===
${r.content}
`).join('\n')}

PEER REVIEW SCORES:
${bestCritiques.map((c) => `- ${c.criticAgent}: ${String(c.score)}/10 - ${c.feedback}`).join('\n')}

YOUR TASK:
Create a comprehensive, actionable response that:
1. Combines the BEST insights from ALL experts
2. Provides SPECIFIC, ACTIONABLE steps (not vague advice)
3. Includes concrete examples, numbers, or frameworks where relevant
4. Addresses the question from multiple angles (legal, financial, strategic)
5. Prioritizes recommendations by importance/urgency

FORMAT YOUR RESPONSE:
- Start with a brief executive summary (2-3 sentences)
- Use clear sections with headers for different aspects
- Include numbered action items where appropriate
- End with immediate next steps the founder should take

Be thorough but organized. Founders need detailed guidance, not surface-level advice.`;

    try {
      const result = await this.council.runCouncil(
        'You are a senior startup advisor synthesizing expert opinions into actionable guidance. Be thorough and specific.',
        synthesisPrompt,
        { minModels: 2, maxModels: 3, temperature: 0.4, maxTokens: 3000 },
      );
      
      return { bestResponse, averageScore, synthesizedContent: result.finalResponse, allSources };
    } catch {
      return { bestResponse, averageScore, synthesizedContent: bestResponse.content, allSources };
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Build agent input from DTO - shared between run() and queueTask()
   */
  private async buildAgentInput(userId: string, dto: RunAgentDto): Promise<AgentInput> {
    await this.verifyStartupOwnership(userId, dto.startupId);

    const startup = await this.startupsService.findRaw(dto.startupId);
    if (!startup) {
      throw new BadRequestException('Startup not found');
    }

    return {
      context: {
        sessionId: dto.sessionId,
        userId,
        startupId: dto.startupId,
        metadata: {
          // Company basics
          companyName: startup.companyName,
          tagline: startup.tagline,
          description: startup.description,
          website: startup.website,
          // Business classification
          industry: startup.industry,
          sector: startup.sector, // RAG sector for document filtering
          businessModel: startup.businessModel,
          revenueModel: startup.revenueModel,
          // Stage
          stage: startup.stage,
          foundedYear: startup.foundedYear,
          // Team
          teamSize: startup.teamSize,
          cofounderCount: startup.cofounderCount,
          // Location
          country: startup.country,
          city: startup.city,
          operatingRegions: startup.operatingRegions,
          // Financials
          fundingStage: startup.fundingStage,
          totalRaised: startup.totalRaised,
          monthlyRevenue: startup.monthlyRevenue,
          isRevenue: startup.isRevenue,
          // Target market
          targetCustomer: startup.targetCustomer,
          problemSolved: startup.problemSolved,
          competitiveAdvantage: startup.competitiveAdvantage,
        },
      },
      prompt: dto.prompt,
      documents: dto.documents,
    };
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusDto | null> {
    return this.queueService.getJobStatus(taskId);
  }

  async cancelTask(taskId: string): Promise<boolean> {
    return this.queueService.cancelJob(taskId);
  }

  private async verifyStartupOwnership(userId: string, startupId: string): Promise<void> {
    const user = await this.usersService.findById(userId);
    if (user.startup?.id !== startupId) {
      throw new ForbiddenException('You do not have access to this startup');
    }
  }
}
