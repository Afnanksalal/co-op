export type LlmProvider = 'groq' | 'google' | 'huggingface';

export interface ModelConfig {
  provider: LlmProvider;
  model: string;
  name: string; // Human-readable name for logging
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
}

export interface ChatCompletionResult {
  content: string;
  provider: LlmProvider;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
}

export interface LlmProviderService {
  readonly provider: LlmProvider;
  chat(messages: ChatMessage[], options?: ChatCompletionOptions): Promise<ChatCompletionResult>;
  chatStream?(messages: ChatMessage[], options?: ChatCompletionOptions): AsyncGenerator<StreamChunk>;
  isAvailable(): boolean;
}

// LLM Council types
export interface CouncilResponse {
  id: string; // Anonymous ID for shuffling
  content: string;
  provider: LlmProvider;
  model: string;
  tokens: number;
}

export interface CouncilCritique {
  responseId: string;
  criticId: string;
  score: number; // 1-10
  feedback: string;
  strengths: string[];
  weaknesses: string[];
}

export interface CouncilResult {
  responses: CouncilResponse[];
  critiques: CouncilCritique[];
  finalResponse: string;
  consensus: {
    averageScore: number;
    bestResponseId: string;
    synthesized: boolean;
  };
  metadata: {
    totalTokens: number;
    modelsUsed: string[];
    processingTimeMs: number;
  };
}

// LLM Router config (for simple phase-based routing)
export interface LlmRouterConfig {
  draft: LlmProvider;
  critique: LlmProvider;
  final: LlmProvider;
}

export const DEFAULT_ROUTER_CONFIG: LlmRouterConfig = {
  draft: 'groq',
  critique: 'google',
  final: 'huggingface',
};

// Model health check result
export interface ModelHealthCheck {
  model: string;
  provider: LlmProvider;
  name: string;
  status: 'healthy' | 'deprecated' | 'error' | 'unavailable';
  latencyMs: number;
  error?: string;
  checkedAt: Date;
}

// Available models configuration - updated Dec 2025
// Health check validates on boot - only healthy models used
export const AVAILABLE_MODELS: ModelConfig[] = [
  // Groq - verified working, fastest inference
  { provider: 'groq', model: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile' },
  { provider: 'groq', model: 'llama-3.3-70b-specdec', name: 'Llama 3.3 70B SpecDec' },

  // Google AI - Gemini 2.5 Flash (fast, production-ready)
  { provider: 'google', model: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },

  // HuggingFace - multiple models for diversity
  { provider: 'huggingface', model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek R1 32B' },
  { provider: 'huggingface', model: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini' },
  { provider: 'huggingface', model: 'Qwen/Qwen2.5-72B-Instruct', name: 'Qwen 2.5 72B' },
];
