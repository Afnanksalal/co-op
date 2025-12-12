export interface McpToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface McpToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  toolName: string;
  executionTime: number;
}

export interface McpProvider {
  id: string;
  name: string;
  description: string;
  tools: McpToolDefinition[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface McpIntegrationConfig {
  providerId: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
}
