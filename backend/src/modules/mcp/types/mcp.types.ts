export interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResult {
  success: boolean;
  data: unknown;
  error: string;
  toolName: string;
  executionTime: number;
}

export interface McpProvider {
  id: string;
  name: string;
  description: string;
  baseUrl: string;
  tools: McpToolDefinition[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: McpJsonSchema;
  outputSchema: McpJsonSchema;
}

export interface McpJsonSchema {
  type: string;
  properties: Record<string, McpSchemaProperty>;
  required: string[];
}

export interface McpSchemaProperty {
  type: string;
  description: string;
  enum?: string[];
  default?: unknown;
}

export interface McpServerConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface McpDiscoveryResponse {
  name: string;
  version: string;
  tools: McpToolDefinition[];
}

export interface McpExecuteRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface McpExecuteResponse {
  success: boolean;
  result: unknown;
  error: string;
  executionTimeMs: number;
}
