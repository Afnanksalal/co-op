import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import { OrchestratorService } from './orchestrator/orchestrator.service';
import { AgentsQueueService } from './queue/agents.queue.service';
import { StartupsService } from '@/modules/startups/startups.service';
import { UsersService } from '@/modules/users/users.service';
import { SecureDocumentsService } from '@/modules/secure-documents/secure-documents.service';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { RedisService } from '@/common/redis/redis.service';
import { CacheService } from '@/common/cache/cache.service';
import { AgentType, AgentInput, AgentPhaseResult } from './types/agent.types';
import { RunAgentDto } from './dto/run-agent.dto';
import { TaskStatusDto } from './dto/task-status.dto';

// Pilot plan limits
const PILOT_MONTHLY_LIMIT = 3;

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

// Response cache TTL (15 minutes for similar queries)
const RESPONSE_CACHE_TTL = 15 * 60;

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);

  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly queueService: AgentsQueueService,
    private readonly startupsService: StartupsService,
    private readonly usersService: UsersService,
    private readonly secureDocumentsService: SecureDocumentsService,
    private readonly council: LlmCouncilService,
    private readonly redis: RedisService,
    private readonly cache: CacheService,
  ) {}

  /**
   * Generate cache key for a prompt (normalized hash)
   */
  private getPromptCacheKey(startupId: string, prompt: string, agents?: string[]): string {
    // Normalize prompt: lowercase, trim, remove extra spaces
    const normalizedPrompt = prompt.toLowerCase().trim().replace(/\s+/g, ' ');
    const agentKey = agents?.sort().join(',') ?? 'all';
    const hash = createHash('md5').update(`${startupId}:${agentKey}:${normalizedPrompt}`).digest('hex').slice(0, 16);
    return `agent:response:${hash}`;
  }

  /**
   * Get usage key for current month
   */
  private getUsageKey(userId: string): string {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `usage:${userId}:${month}`;
  }

  /**
   * Check and increment usage for pilot users
   * Uses atomic increment to prevent race conditions
   */
  private async checkAndIncrementUsage(userId: string): Promise<{ used: number; limit: number; remaining: number }> {
    const key = this.getUsageKey(userId);
    const user = await this.usersService.findById(userId);
    
    // Admins have unlimited usage
    if (user.role === 'admin') {
      return { used: 0, limit: -1, remaining: -1 };
    }

    // Atomic increment first - this prevents race conditions
    // If multiple requests come in simultaneously, each gets a unique count
    const newCount = await this.redis.incr(key);
    
    // Set expiry to end of month if this is the first request
    if (newCount === 1) {
      const now = new Date();
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const ttl = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000);
      await this.redis.expire(key, ttl);
    }

    // Check if over limit AFTER incrementing
    // This ensures we don't have a TOCTOU race condition
    if (newCount > PILOT_MONTHLY_LIMIT) {
      // Decrement back since we're over limit
      // Note: In high-concurrency scenarios, this is still safe because
      // the user already exceeded their limit
      throw new ForbiddenException(`Monthly limit of ${PILOT_MONTHLY_LIMIT} AI requests reached. Resets on the 1st of next month.`);
    }

    return {
      used: newCount,
      limit: PILOT_MONTHLY_LIMIT,
      remaining: PILOT_MONTHLY_LIMIT - newCount,
    };
  }

  /**
   * Get current usage stats for a user
   */
  async getUsageStats(userId: string): Promise<{ used: number; limit: number; remaining: number; resetsAt: string }> {
    const user = await this.usersService.findById(userId);
    
    // Admins have unlimited usage
    if (user.role === 'admin') {
      return { used: 0, limit: -1, remaining: -1, resetsAt: '' };
    }

    const key = this.getUsageKey(userId);
    const current = await this.redis.get<number>(key) ?? 0;
    
    // Calculate reset date (1st of next month)
    const now = new Date();
    const resetsAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      used: current,
      limit: PILOT_MONTHLY_LIMIT,
      remaining: Math.max(0, PILOT_MONTHLY_LIMIT - current),
      resetsAt: resetsAt.toISOString(),
    };
  }

  async run(
    userId: string,
    dto: RunAgentDto,
    onProgress?: (step: string) => void,
  ): Promise<AgentPhaseResult[]> {
    // Check usage limits for pilot users
    await this.checkAndIncrementUsage(userId);
    
    return this.runWithoutUsageCheck(userId, dto, onProgress);
  }

  /**
   * Run agent without incrementing usage (for webhook handler where queueTask already incremented)
   */
  async runWithoutUsageCheck(
    userId: string,
    dto: RunAgentDto,
    onProgress?: (step: string) => void,
  ): Promise<AgentPhaseResult[]> {
    // Check cache for similar prompts (skip if onProgress is provided - user wants realtime updates)
    const cacheKey = this.getPromptCacheKey(dto.startupId, dto.prompt, dto.agents);
    if (!onProgress) {
      const cached = await this.cache.get<AgentPhaseResult[]>(cacheKey);
      if (cached) {
        this.logger.log(`Cache hit for prompt: ${cacheKey}`);
        return cached;
      }
    }

    const input = await this.buildAgentInput(userId, dto);
    
    // Multi-agent mode: no agentType specified or agents array provided
    let result: AgentPhaseResult[];
    if (!dto.agentType) {
      const agents = dto.agents?.filter((a): a is AgentType => ALL_AGENTS.includes(a as AgentType)) ?? ALL_AGENTS;
      result = await this.runMultiAgent(agents, input, dto.prompt, onProgress);
    } else {
      result = await this.orchestrator.runAgent(dto.agentType, input, onProgress);
    }

    // Cache the result for future similar queries
    await this.cache.set(cacheKey, result, { ttl: RESPONSE_CACHE_TTL });
    
    return result;
  }

  /**
   * Run multi-agent with pre-built input (for webhook handler where input is already built)
   * This avoids re-running buildAgentInput which would fail since documents are already content, not IDs.
   */
  async runMultiAgentWithInput(
    input: AgentInput,
    agents: string[],
    onProgress?: (step: string) => void,
  ): Promise<AgentPhaseResult[]> {
    const validAgents = agents.filter((a): a is AgentType => ALL_AGENTS.includes(a as AgentType));
    if (validAgents.length === 0) {
      throw new BadRequestException('No valid agents specified');
    }
    return this.runMultiAgent(validAgents, input, input.prompt, onProgress);
  }

  async queueTask(userId: string, dto: RunAgentDto): Promise<QueueTaskResult> {
    // Check usage limits for pilot users
    await this.checkAndIncrementUsage(userId);
    
    const input = await this.buildAgentInput(userId, dto);
    
    // For multi-agent, we use 'legal' as the primary but the queue service will handle multi-agent
    const agentType = dto.agentType ?? 'legal';
    const isMultiAgent = !dto.agentType;
    
    return this.queueService.addJob(agentType, input, userId, isMultiAgent ? (dto.agents ?? ALL_AGENTS) : undefined);
  }

  /**
   * Run multi-agent A2A query with cross-critique
   * @param onProgress - Optional callback for realtime progress updates
   */
  private async runMultiAgent(
    agents: AgentType[],
    input: AgentInput,
    prompt: string,
    onProgress?: (step: string) => void,
  ): Promise<AgentPhaseResult[]> {
    this.logger.log(`A2A Multi-Agent: ${agents.join(', ')}`);
    onProgress?.(`Starting multi-agent analysis with ${agents.length} agents: ${agents.join(', ')}`);
    
    // Phase 1: All agents generate responses in parallel
    onProgress?.('Phase 1: Gathering responses from all domain agents...');
    const responses = await this.gatherAgentResponses(agents, input, onProgress);
    
    if (responses.length < 2) {
      throw new BadRequestException('Need at least 2 agent responses for A2A critique');
    }
    onProgress?.(`Received ${responses.length} agent responses`);
    
    // Phase 2: Shuffle responses (anonymize for fair critique)
    const shuffledResponses = this.shuffleArray(responses);
    onProgress?.('Shuffling responses for anonymous cross-critique...');
    
    // Phase 3: Cross-critique
    onProgress?.('Phase 2: Cross-critiquing responses between agents...');
    const critiques = await this.generateA2ACritiques(agents, shuffledResponses, prompt, onProgress);
    onProgress?.(`Generated ${critiques.length} cross-critiques`);
    
    // Phase 4: Synthesize
    onProgress?.('Phase 3: Synthesizing final response from best insights...');
    const { averageScore, synthesizedContent, allSources } = await this.synthesizeA2AResult(
      responses,
      critiques,
      prompt,
      onProgress,
    );
    onProgress?.(`Synthesis complete. Consensus score: ${averageScore.toFixed(1)}/10`);
    
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

  private async gatherAgentResponses(
    agents: AgentType[],
    input: AgentInput,
    onProgress?: (step: string) => void,
  ): Promise<A2AAgentResponse[]> {
    // Guard against empty agents array
    if (!agents || agents.length === 0) {
      throw new BadRequestException('At least one agent must be specified');
    }

    const results = await Promise.all(
      agents.map(async (agent) => {
        try {
          onProgress?.(`${agent.charAt(0).toUpperCase() + agent.slice(1)} agent analyzing...`);
          const output = await this.orchestrator.runAgent(agent, input, onProgress);
          const final = output.find((r) => r.phase === 'final');
          if (!final) return null;
          
          onProgress?.(`${agent.charAt(0).toUpperCase() + agent.slice(1)} agent completed`);
          return {
            agent,
            id: uuid(),
            content: final.output.content,
            confidence: final.output.confidence,
            sources: final.output.sources,
          };
        } catch (error) {
          this.logger.warn(`Agent ${agent} failed`, error);
          onProgress?.(`${agent.charAt(0).toUpperCase() + agent.slice(1)} agent failed - skipping`);
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
    onProgress?: (step: string) => void,
  ): Promise<A2ACritique[]> {
    // Build all critique tasks for parallel execution
    const critiqueTasks: Promise<A2ACritique | null>[] = [];
    
    for (const criticAgent of agents) {
      // Each agent critiques only 1 other response for speed
      const otherResponses = responses.filter((r) => r.agent !== criticAgent).slice(0, 1);
      
      for (const response of otherResponses) {
        onProgress?.(`${criticAgent.charAt(0).toUpperCase() + criticAgent.slice(1)} critiquing ${response.agent}'s response...`);
        critiqueTasks.push(
          this.critiqueResponse(criticAgent, response, prompt)
            .then(result => {
              if (result) {
                onProgress?.(`${criticAgent.charAt(0).toUpperCase() + criticAgent.slice(1)} scored ${response.agent}: ${result.score}/10`);
              }
              return result;
            })
            .catch(error => {
              this.logger.warn(`Critique by ${criticAgent} failed`, error);
              onProgress?.(`${criticAgent.charAt(0).toUpperCase() + criticAgent.slice(1)} critique failed - skipping`);
              return null;
            })
        );
      }
    }
    
    // Run all critiques in parallel
    const results = await Promise.all(critiqueTasks);
    return results.filter((c): c is A2ACritique => c !== null);
  }

  private async critiqueResponse(
    criticAgent: string,
    response: A2AAgentResponse,
    prompt: string,
  ): Promise<A2ACritique | null> {
    const critiquePrompt = `Rate 1-10. JSON only.
Q: ${prompt.slice(0, 150)}
R: ${response.content.slice(0, 500)}
{"score":7,"feedback":"brief"}`;

    try {
      const result = await this.council.runCouncil(
        'JSON only. No markdown.',
        critiquePrompt,
        { minModels: 1, maxModels: 1, temperature: 0.2, maxTokens: 100 },
      );
      
      // Try to extract JSON from response
      const jsonMatch = /\{[^}]+\}/.exec(result.finalResponse);
      if (!jsonMatch) return null;
      
      const parsed = JSON.parse(jsonMatch[0]) as { score: number; feedback: string };
      
      return {
        responseId: response.id,
        criticAgent,
        score: Math.min(10, Math.max(1, parsed.score)),
        feedback: parsed.feedback || 'Good response',
      };
    } catch {
      return null;
    }
  }

  private async synthesizeA2AResult(
    responses: A2AAgentResponse[],
    critiques: A2ACritique[],
    prompt: string,
    onProgress?: (step: string) => void,
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
    
    onProgress?.(`Best response from ${bestResponse.agent} agent (score: ${highestAvg.toFixed(1)}/10)`);
    
    const bestCritiques = critiques.filter((c) => c.responseId === bestResponse.id);
    
    // Truncate responses for faster synthesis
    const truncatedResponses = responses.map((r) => `${r.agent.toUpperCase()}: ${r.content.slice(0, 400)}`).join('\n\n');
    
    const synthesisPrompt = `Synthesize expert advice.

Q: ${prompt.slice(0, 200)}

EXPERTS:
${truncatedResponses}

SCORES: ${bestCritiques.map((c) => `${c.criticAgent}:${String(c.score)}/10`).join(', ')}

Output: Brief summary, key insights, 3-5 action items. Be concise.`;

    try {
      onProgress?.('Running LLM council for final synthesis...');
      const result = await this.council.runCouncil(
        'Senior startup advisor. Be concise and actionable.',
        synthesisPrompt,
        { minModels: 2, maxModels: 2, temperature: 0.4, maxTokens: 800, onProgress },
      );
      
      onProgress?.('Final response ready');
      return { bestResponse, averageScore, synthesizedContent: result.finalResponse, allSources };
    } catch {
      onProgress?.('Using best agent response as fallback');
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
   * Uses semantic search to find only the most relevant document chunks.
   */
  private async buildAgentInput(userId: string, dto: RunAgentDto): Promise<AgentInput> {
    await this.verifyStartupOwnership(userId, dto.startupId);

    const startup = await this.startupsService.findRaw(dto.startupId);
    if (!startup) {
      throw new BadRequestException('Startup not found');
    }

    // Fetch document content using semantic search for relevance
    const documentContents: string[] = [];
    if (dto.documents && dto.documents.length > 0) {
      try {
        // Use semantic search to find relevant chunks across all provided documents
        const searchResults = await this.secureDocumentsService.searchUserDocuments(
          userId,
          dto.prompt,
          dto.documents,
          10, // Top 10 most relevant chunks
          0.4, // Lower threshold to ensure we get results
        );

        if (searchResults.length > 0) {
          // Group results by document for organized retrieval
          const chunksByDoc = new Map<string, number[]>();
          for (const result of searchResults) {
            const chunks = chunksByDoc.get(result.documentId) ?? [];
            chunks.push(result.chunkIndex);
            chunksByDoc.set(result.documentId, chunks);
          }

          // Decrypt only the relevant chunks for each document
          for (const [docId, chunkIndices] of chunksByDoc) {
            try {
              const chunks = await this.secureDocumentsService.getDecryptedChunks(
                docId,
                userId,
                chunkIndices,
              );
              if (chunks.length > 0) {
                const content = chunks
                  .sort((a, b) => a.chunkIndex - b.chunkIndex)
                  .map(c => c.content)
                  .join('\n');
                documentContents.push(`[Document: ${chunks[0].filename}]\n${content}`);
              }
            } catch (error) {
              this.logger.warn(`Failed to get chunks for document ${docId}`, error);
            }
          }

          this.logger.log(`Semantic search: ${searchResults.length} relevant chunks from ${chunksByDoc.size} documents`);
        } else {
          // Fallback: no semantic results, get all chunks (legacy behavior)
          this.logger.log('No semantic search results, falling back to all chunks');
          for (const docId of dto.documents) {
            try {
              const chunks = await this.secureDocumentsService.getDecryptedChunks(docId, userId);
              if (chunks.length > 0) {
                const content = chunks
                  .sort((a, b) => a.chunkIndex - b.chunkIndex)
                  .map(c => c.content)
                  .join('\n');
                documentContents.push(`[Document: ${chunks[0].filename}]\n${content}`);
              }
            } catch (error) {
              this.logger.warn(`Failed to extract content from secure document ${docId}`, error);
            }
          }
        }
      } catch (error) {
        // If semantic search fails entirely, fall back to getting all chunks
        this.logger.warn('Semantic search failed, falling back to all chunks', error);
        for (const docId of dto.documents) {
          try {
            const chunks = await this.secureDocumentsService.getDecryptedChunks(docId, userId);
            if (chunks.length > 0) {
              const content = chunks
                .sort((a, b) => a.chunkIndex - b.chunkIndex)
                .map(c => c.content)
                .join('\n');
              documentContents.push(`[Document: ${chunks[0].filename}]\n${content}`);
            }
          } catch (err) {
            this.logger.warn(`Failed to extract content from secure document ${docId}`, err);
          }
        }
      }
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
          // Jurisdiction info (for legal agent)
          region: dto.region,
          jurisdiction: dto.jurisdiction,
          // Finance params (for finance agent)
          financeFocus: dto.financeFocus,
          currency: dto.currency,
        },
      },
      prompt: dto.prompt,
      documents: documentContents, // Contains only relevant chunks from semantic search
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
