import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { OrchestratorService } from '@/modules/agents/orchestrator/orchestrator.service';
import { A2AService } from '@/modules/agents/a2a/a2a.service';
import { LlmCouncilService } from '@/common/llm/llm-council.service';
import { AgentType, AgentInput } from '@/modules/agents/types/agent.types';
import {
  McpDiscoveryResult,
  McpToolDefinition,
  McpToolExecutionResult,
  McpAgentTool,
  McpToolSchema,
  McpCouncilMetadata,
} from './types/mcp-server.types';
import { McpToolCallDto } from './dto/mcp-server.dto';

const TOOL_TO_AGENT: Record<string, AgentType> = {
  legal_analysis: 'legal',
  finance_analysis: 'finance',
  investor_search: 'investor',
  competitor_analysis: 'competitor',
};

const VALID_TOOLS: McpAgentTool[] = [
  'legal_analysis',
  'finance_analysis',
  'investor_search',
  'competitor_analysis',
  'multi_agent_query',
];

const SINGLE_AGENT_SCHEMA: McpToolSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Your question (be specific, concise)',
    },
    companyName: {
      type: 'string',
      description: 'Company name',
    },
    industry: {
      type: 'string',
      description: 'Industry (fintech, healthtech, saas, etc.)',
    },
    sector: {
      type: 'string',
      description: 'RAG sector for document filtering (e.g., fintech, healthtech, saas, ai_ml, ecommerce)',
    },
    stage: {
      type: 'string',
      description: 'Stage (pre-seed, seed, series-a, series-b)',
    },
    country: {
      type: 'string',
      description: 'Country',
    },
    additionalContext: {
      type: 'string',
      description: 'Extra context (optional)',
    },
  },
  required: ['prompt', 'companyName', 'industry', 'sector', 'stage', 'country'],
};

const MULTI_AGENT_SCHEMA: McpToolSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      description: 'Your question for multiple agents',
    },
    agents: {
      type: 'array',
      description: 'Agents to query: legal, finance, investor, competitor',
      items: { type: 'string', description: 'Agent name', enum: ['legal', 'finance', 'investor', 'competitor'] },
    },
    companyName: {
      type: 'string',
      description: 'Company name',
    },
    industry: {
      type: 'string',
      description: 'Industry',
    },
    sector: {
      type: 'string',
      description: 'RAG sector (e.g., fintech, healthtech, saas, ai_ml, ecommerce)',
    },
    stage: {
      type: 'string',
      description: 'Stage',
    },
    country: {
      type: 'string',
      description: 'Country',
    },
  },
  required: ['prompt', 'agents', 'companyName', 'industry', 'sector', 'stage', 'country'],
};

interface A2AAgentResponse {
  agent: string;
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

@Injectable()
export class McpServerService {
  private readonly logger = new Logger(McpServerService.name);

  constructor(
    private readonly orchestrator: OrchestratorService,
    private readonly a2a: A2AService,
    private readonly council: LlmCouncilService,
  ) {}

  /**
   * Discover available MCP tools
   */
  discoverTools(): McpDiscoveryResult {
    const tools: McpToolDefinition[] = [
      {
        name: 'legal_analysis',
        description: 'Legal advice: corporate structure, IP, compliance, contracts. Returns bullet points.',
        inputSchema: SINGLE_AGENT_SCHEMA,
      },
      {
        name: 'finance_analysis',
        description: 'Finance advice: modeling, metrics, runway, valuation. Returns numbers and formulas.',
        inputSchema: SINGLE_AGENT_SCHEMA,
      },
      {
        name: 'investor_search',
        description: 'Find investors: VCs, angels matching your profile. Returns names, check sizes, focus.',
        inputSchema: SINGLE_AGENT_SCHEMA,
      },
      {
        name: 'competitor_analysis',
        description: 'Competitor intel: market landscape, positioning, features. Returns competitor list.',
        inputSchema: SINGLE_AGENT_SCHEMA,
      },
      {
        name: 'multi_agent_query',
        description: 'Query multiple agents at once. Combines results from selected agents.',
        inputSchema: MULTI_AGENT_SCHEMA,
      },
    ];

    return {
      server: {
        name: 'co-op-agents',
        version: '2.0.0',
        description: 'AI Startup Advisory - LLM Council with mandatory cross-critique',
        vendor: 'Co-Op',
        capabilities: {
          tools: true,
          resources: false,
          prompts: false,
          sampling: false,
        },
      },
      tools,
      a2aCapabilities: this.a2a.getCapabilities(),
    };
  }

  /**
   * Execute an MCP tool
   */
  async executeTool(dto: McpToolCallDto): Promise<McpToolExecutionResult> {
    const startTime = Date.now();
    const toolName = dto.tool as McpAgentTool;

    if (!VALID_TOOLS.includes(toolName)) {
      return this.errorResult(
        `Unknown tool: ${dto.tool}. Use: ${VALID_TOOLS.join(', ')}`,
        startTime,
      );
    }

    try {
      if (toolName === 'multi_agent_query') {
        return await this.executeMultiAgent(dto, startTime);
      }

      return await this.executeSingleAgent(toolName, dto, startTime);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`MCP ${toolName} failed: ${errorMessage}`);
      return this.errorResult(errorMessage, startTime);
    }
  }

  /**
   * Execute single agent tool
   */
  private async executeSingleAgent(
    toolName: McpAgentTool,
    dto: McpToolCallDto,
    startTime: number,
  ): Promise<McpToolExecutionResult> {
    const agentType = TOOL_TO_AGENT[toolName];
    if (!agentType) {
      return this.errorResult(`No agent for tool: ${toolName}`, startTime);
    }

    const args = dto.arguments as unknown as Record<string, unknown>;
    this.logger.log(`MCP: ${toolName} -> ${agentType}`);

    const input = this.buildAgentInput(args);
    const results = await this.orchestrator.runAgent(agentType, input);

    const finalResult = results.find((r) => r.phase === 'final');
    if (!finalResult) {
      throw new BadRequestException('Agent failed to produce result');
    }

    const councilMetadata = this.extractCouncilMetadata(finalResult.output.metadata);

    return {
      success: true,
      result: {
        content: finalResult.output.content,
        confidence: finalResult.output.confidence,
        sources: finalResult.output.sources,
      },
      error: null,
      executionTimeMs: Date.now() - startTime,
      councilMetadata,
    };
  }

  /**
   * Execute multi-agent query with A2A council critique
   * 1. All agents generate responses in parallel
   * 2. Shuffle responses (anonymize)
   * 3. Each agent critiques other agents' responses
   * 4. Score and synthesize best response
   */
  private async executeMultiAgent(
    dto: McpToolCallDto,
    startTime: number,
  ): Promise<McpToolExecutionResult> {
    const args = dto.arguments as unknown as Record<string, unknown>;
    const agents = args.agents as string[] | undefined;

    if (!agents || agents.length === 0) {
      return this.errorResult('agents array required', startTime);
    }

    const validAgents = agents.filter((a) =>
      ['legal', 'finance', 'investor', 'competitor'].includes(a),
    );

    if (validAgents.length < 2) {
      return this.errorResult('Need at least 2 agents for A2A critique', startTime);
    }

    this.logger.log(`A2A Council: ${validAgents.join(', ')}`);

    const input = this.buildAgentInput(args);

    // Phase 1: All agents generate responses in parallel
    const responses = await this.gatherAgentResponses(validAgents, input);

    if (responses.length < 2) {
      return this.errorResult('Need at least 2 agent responses for critique', startTime);
    }

    // Phase 2: Shuffle responses (anonymize for fair critique)
    const shuffledResponses = this.shuffleArray(responses);

    // Phase 3: Cross-critique - each agent critiques others
    const critiques = await this.generateA2ACritiques(
      validAgents,
      shuffledResponses,
      args.prompt as string,
    );

    if (critiques.length === 0) {
      return this.errorResult('A2A critique phase failed', startTime);
    }

    // Phase 4: Score and synthesize
    const { averageScore, synthesizedContent } = await this.synthesizeA2AResult(
      shuffledResponses,
      critiques,
      args.prompt as string,
    );

    const allSources = responses.flatMap((r) => r.sources);

    return {
      success: true,
      result: {
        content: synthesizedContent,
        confidence: averageScore / 10,
        sources: [...new Set(allSources)],
      },
      error: null,
      executionTimeMs: Date.now() - startTime,
      councilMetadata: {
        modelsUsed: validAgents,
        critiquesCount: critiques.length,
        consensusScore: averageScore,
        synthesized: true,
      },
    };
  }

  /**
   * Gather responses from all agents
   */
  private async gatherAgentResponses(
    agents: string[],
    input: AgentInput,
  ): Promise<A2AAgentResponse[]> {
    const results = await Promise.all(
      agents.map(async (agent) => {
        try {
          const output = await this.orchestrator.runAgent(agent as AgentType, input);
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

  /**
   * Generate cross-critiques between agents
   */
  private async generateA2ACritiques(
    agents: string[],
    responses: A2AAgentResponse[],
    prompt: string,
  ): Promise<A2ACritique[]> {
    const critiques: A2ACritique[] = [];

    // Each agent critiques responses from other agents
    for (const criticAgent of agents) {
      const otherResponses = responses.filter((r) => r.agent !== criticAgent);

      for (const response of otherResponses) {
        try {
          const critique = await this.critiqueResponse(criticAgent, response, prompt);
          if (critique) {
            critiques.push(critique);
          }
        } catch (error) {
          this.logger.warn(`Critique by ${criticAgent} failed`, error);
        }
      }
    }

    return critiques;
  }

  /**
   * Generate a single critique using LLM
   */
  private async critiqueResponse(
    criticAgent: string,
    response: A2AAgentResponse,
    prompt: string,
  ): Promise<A2ACritique | null> {
    const critiquePrompt = `As ${criticAgent} expert, critique this response:

Question: ${prompt}

Response from another agent:
${response.content}

Rate 1-10 and give brief feedback. JSON only:
{"score":1-10,"feedback":"1 sentence"}`;

    try {
      const models = this.council.getAvailableModels();
      if (models.length === 0) return null;

      // Use council for critique (will use available model)
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

  /**
   * Synthesize final result from critiques
   */
  private async synthesizeA2AResult(
    responses: A2AAgentResponse[],
    critiques: A2ACritique[],
    prompt: string,
  ): Promise<{ bestResponse: A2AAgentResponse; averageScore: number; synthesizedContent: string }> {
    // Calculate scores per response
    const scoreMap = new Map<string, number[]>();
    for (const critique of critiques) {
      const scores = scoreMap.get(critique.responseId) ?? [];
      scores.push(critique.score);
      scoreMap.set(critique.responseId, scores);
    }

    // Find best response
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

    // Get critiques for best response
    const bestCritiques = critiques.filter((c) => c.responseId === bestResponse.id);

    // Synthesize improved response
    const synthesisPrompt = `Improve this multi-agent response based on feedback.

Question: ${prompt}

Best response (from ${bestResponse.agent}):
${bestResponse.content}

Feedback:
${bestCritiques.map((c) => `${c.criticAgent}: ${String(c.score)}/10 - ${c.feedback}`).join('\n')}

Other agent insights:
${responses.filter((r) => r.id !== bestResponse.id).map((r) => `${r.agent}: ${r.content.slice(0, 200)}...`).join('\n')}

Output improved synthesis. Bullet points. No preamble.`;

    try {
      const result = await this.council.runCouncil(
        'Synthesize expert responses concisely.',
        synthesisPrompt,
        { minModels: 2, maxModels: 2, temperature: 0.3, maxTokens: 600 },
      );

      return { bestResponse, averageScore, synthesizedContent: result.finalResponse };
    } catch {
      // Fallback to best response
      return { bestResponse, averageScore, synthesizedContent: bestResponse.content };
    }
  }

  /**
   * Shuffle array (Fisher-Yates)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Build agent input from MCP arguments
   * Note: MCP clients don't have real user/startup IDs, so we use placeholders
   */
  private buildAgentInput(args: Record<string, unknown>): AgentInput {
    // Use deterministic IDs for MCP clients (based on company name hash)
    const companyName = (args.companyName as string) || 'unknown';
    const deterministicId = this.generateDeterministicId(companyName);
    
    return {
      context: {
        sessionId: uuid(), // Session is unique per request
        userId: 'mcp-client',
        startupId: deterministicId, // Deterministic based on company name
        metadata: {
          companyName,
          industry: args.industry as string,
          sector: args.sector as string, // Add sector for RAG filtering
          stage: args.stage as string,
          country: args.country as string,
          source: 'mcp',
        },
      },
      prompt: args.prompt as string,
      documents: args.additionalContext ? [args.additionalContext as string] : [],
    };
  }

  /**
   * Generate a deterministic UUID-like ID from a string
   */
  private generateDeterministicId(input: string): string {
    // Simple hash-based deterministic ID (not a real UUID but consistent)
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Format as UUID-like string
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return `mcp-${hex}-0000-0000-000000000000`;
  }

  /**
   * Extract council metadata from agent output
   */
  private extractCouncilMetadata(metadata: Record<string, unknown>): McpCouncilMetadata {
    return {
      modelsUsed: (metadata.modelsUsed as string[]) ?? [],
      critiquesCount: (metadata.critiquesCount as number) ?? 0,
      consensusScore: (metadata.consensusScore as number) ?? 0,
      synthesized: true,
    };
  }

  /**
   * Create error result
   */
  private errorResult(error: string, startTime: number): McpToolExecutionResult {
    return {
      success: false,
      result: null,
      error,
      executionTimeMs: Date.now() - startTime,
      councilMetadata: null,
    };
  }
}
