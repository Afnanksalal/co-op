import { AgentType, AgentInput, AgentPhaseResult } from '../types/agent.types';

export interface AgentJobData {
  taskId: string;
  agentType: AgentType;
  input: AgentInput;
  userId: string;
}

export interface AgentJobResult {
  success: boolean;
  results: AgentPhaseResult[];
  error: string;
  completedAt: Date;
}

export const AGENTS_QUEUE = 'agents';
