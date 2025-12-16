export type LlmProvider = 'groq' | 'google' | 'huggingface';

/** Model role in the council */
export type ModelRole = 'council' | 'rag-specialist';

export interface ModelConfig {
  provider: LlmProvider;
  model: string;
  name: string; // Human-readable name for logging
  role?: ModelRole; // Default: 'council' - participates in critique. 'rag-specialist' = RAG processing only
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
  { provider: 'groq', model: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', role: 'council' },
  { provider: 'groq', model: 'kimi-k2-instruct-0905', name: 'Kimi K2 Instruct', role: 'council' },

  // Google AI - Gemini 2.5 Flash (fast, production-ready)
  { provider: 'google', model: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', role: 'council' },

  // HuggingFace - multiple models for diversity
  { provider: 'huggingface', model: 'deepseek-ai/DeepSeek-R1-Distill-Qwen-32B', name: 'DeepSeek R1 32B', role: 'council' },
  { provider: 'huggingface', model: 'microsoft/Phi-3-mini-4k-instruct', name: 'Phi-3 Mini 4K', role: 'council' },
  { provider: 'huggingface', model: 'Qwen/Qwen2.5-14B-Instruct-1M', name: 'Qwen 2.5 14B 1M', role: 'council' },

  // Apple CLaRA - RAG Specialist (NOT for critique)
  // Semantic document compression (16×/128×), instruction-tuned for QA from compressed representations
  // Used for: RAG context processing, document understanding, context distribution to council
  { provider: 'huggingface', model: 'apple/CLaRa-7B-Instruct', name: 'CLaRA 7B RAG Specialist', role: 'rag-specialist' },
];

/** Get only council models (for critique/response generation) */
export const getCouncilModels = (): ModelConfig[] =>
  AVAILABLE_MODELS.filter(m => m.role !== 'rag-specialist');

/** Get RAG specialist model (CLaRA) */
export const getRagSpecialistModel = (): ModelConfig | undefined =>
  AVAILABLE_MODELS.find(m => m.role === 'rag-specialist');
