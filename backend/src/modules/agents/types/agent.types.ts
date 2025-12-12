export type AgentType = 'legal' | 'finance' | 'investor' | 'competitor';

export interface AgentContext {
  sessionId: string;
  userId: string;
  startupId: string;
  metadata?: Record<string, unknown>;
}

export interface AgentInput {
  context: AgentContext;
  prompt: string;
  documents?: string[];
}

export interface AgentOutput {
  content: string;
  confidence: number;
  sources?: string[];
  metadata?: Record<string, unknown>;
}

export interface AgentPhaseResult {
  phase: 'draft' | 'critique' | 'final';
  output: AgentOutput;
  timestamp: Date;
}

export interface OrchestratorTask {
  id: string;
  agentType: AgentType;
  input: AgentInput;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results?: AgentPhaseResult[];
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BaseAgent {
  runDraft(input: AgentInput): Promise<AgentOutput>;
  runCritique(input: AgentInput, draft: AgentOutput): Promise<AgentOutput>;
  runFinal(input: AgentInput, draft: AgentOutput, critique: AgentOutput): Promise<AgentOutput>;
}
