/**
 * MCP Server Types
 *
 * Types for exposing Co-Op agents as MCP tools
 * Follows MCP specification: https://modelcontextprotocol.io
 */

export interface McpToolSchema {
  type: 'object';
  properties: Record<string, McpPropertySchema>;
  required: string[];
}

export interface McpPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: string[];
  items?: McpPropertySchema;
  default?: unknown;
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpToolSchema;
}

export interface McpServerInfo {
  name: string;
  version: string;
  description: string;
  vendor: string;
  capabilities: McpCapabilities;
}

export interface McpCapabilities {
  tools: boolean;
  resources: boolean;
  prompts: boolean;
  sampling: boolean;
}

export interface McpDiscoveryResult {
  server: McpServerInfo;
  tools: McpToolDefinition[];
  a2aCapabilities: McpA2ACapability[];
}

export interface McpA2ACapability {
  agent: string;
  actions: string[];
  description: string;
}

export interface McpToolCallInput {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface McpToolExecutionResult {
  success: boolean;
  result: McpToolOutput | null;
  error: string | null;
  executionTimeMs: number;
  councilMetadata: McpCouncilMetadata | null;
}

export interface McpCouncilMetadata {
  modelsUsed: string[];
  critiquesCount: number;
  consensusScore: number;
  synthesized: boolean;
}

export interface McpToolOutput {
  content: string;
  confidence: number;
  sources: string[];
}

export type McpAgentTool =
  | 'legal_analysis'
  | 'finance_analysis'
  | 'investor_search'
  | 'competitor_analysis'
  | 'multi_agent_query';

export interface McpAgentToolInput {
  prompt: string;
  companyName: string;
  industry: string;
  stage: string;
  country: string;
  sector?: string; // RAG sector for document filtering
  additionalContext?: string;
}

export interface McpMultiAgentInput {
  prompt: string;
  agents: string[];
  companyName: string;
  industry: string;
  stage: string;
  country: string;
  sector?: string; // RAG sector for document filtering
}
