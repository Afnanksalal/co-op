import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '@/common/redis/redis.service';
import {
  McpToolCall,
  McpToolResult,
  McpToolDefinition,
  McpServerConfig,
  McpDiscoveryResponse,
  McpExecuteResponse,
} from './types/mcp.types';

@Injectable()
export class McpService {
  private readonly logger = new Logger(McpService.name);
  private readonly MCP_SERVERS_KEY = 'mcp:servers';
  private readonly MCP_TOOLS_KEY = 'mcp:tools';
  private readonly servers = new Map<string, McpServerConfig>();

  constructor(
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    // Load servers from Redis first
    await this.loadServersFromRedis();

    // Then add default server from env if configured
    this.initializeFromEnv();
  }

  private async loadServersFromRedis(): Promise<void> {
    try {
      const servers = await this.redis.hgetall<McpServerConfig>(this.MCP_SERVERS_KEY);
      if (servers) {
        for (const [id, config] of Object.entries(servers)) {
          this.servers.set(id, config);
        }
        this.logger.log(`Loaded ${String(Object.keys(servers).length)} MCP servers from Redis`);
      }
    } catch (error) {
      this.logger.warn('Failed to load MCP servers from Redis', error);
    }
  }

  private initializeFromEnv(): void {
    const endpoint = this.configService.get<string>('MCP_ENDPOINT');
    const apiKey = this.configService.get<string>('MCP_API_KEY');

    if (endpoint && apiKey && !this.servers.has('default')) {
      const defaultServer: McpServerConfig = {
        id: 'default',
        name: 'Default MCP Server',
        baseUrl: endpoint,
        apiKey,
        enabled: true,
      };
      this.servers.set('default', defaultServer);
      this.logger.log('Default MCP server configured from environment');
    }
  }

  async registerServer(config: McpServerConfig): Promise<void> {
    this.servers.set(config.id, config);
    await this.redis.hset(this.MCP_SERVERS_KEY, config.id, config);
    this.logger.log(`MCP server registered: ${config.name}`);

    // Discover tools from the server
    await this.discoverTools(config.id);
  }

  async unregisterServer(serverId: string): Promise<void> {
    this.servers.delete(serverId);
    await this.redis.hdel(this.MCP_SERVERS_KEY, serverId);
    await this.redis.hdel(this.MCP_TOOLS_KEY, serverId);
    this.logger.log(`MCP server unregistered: ${serverId}`);
  }

  async discoverTools(serverId: string): Promise<McpToolDefinition[]> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new NotFoundException(`MCP server not found: ${serverId}`);
    }

    try {
      const response = await fetch(`${server.baseUrl}/discover`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${server.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Discovery failed: ${response.statusText}`);
      }

      const discovery = await response.json() as McpDiscoveryResponse;
      await this.redis.hset(this.MCP_TOOLS_KEY, serverId, discovery.tools);
      this.logger.log(`Discovered ${String(discovery.tools.length)} tools from ${server.name}`);

      return discovery.tools;
    } catch (error) {
      this.logger.error(`Failed to discover tools from ${server.name}`, error);
      return [];
    }
  }

  async callTool(serverId: string, toolCall: McpToolCall): Promise<McpToolResult> {
    const server = this.servers.get(serverId);
    if (!server) {
      throw new NotFoundException(`MCP server not found: ${serverId}`);
    }

    if (!server.enabled) {
      throw new BadRequestException(`MCP server is disabled: ${serverId}`);
    }

    this.logger.log(`Calling MCP tool: ${toolCall.name} on ${server.name}`);
    const startTime = Date.now();

    try {
      const response = await fetch(`${server.baseUrl}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${server.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tool: toolCall.name,
          arguments: toolCall.arguments,
        }),
      });

      const result = await response.json() as McpExecuteResponse;
      const executionTime = Date.now() - startTime;

      return {
        success: result.success,
        data: result.result,
        error: result.error,
        toolName: toolCall.name,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`MCP tool call failed: ${toolCall.name}`, error);

      return {
        success: false,
        data: null,
        error: errorMessage,
        toolName: toolCall.name,
        executionTime,
      };
    }
  }

  listServers(): McpServerConfig[] {
    return Array.from(this.servers.values());
  }

  async getServerTools(serverId: string): Promise<McpToolDefinition[]> {
    const cached = await this.redis.hget<McpToolDefinition[]>(this.MCP_TOOLS_KEY, serverId);
    if (cached) {
      return cached;
    }

    return this.discoverTools(serverId);
  }

  async listAllTools(): Promise<{ serverId: string; tools: McpToolDefinition[] }[]> {
    const result: { serverId: string; tools: McpToolDefinition[] }[] = [];

    for (const [serverId] of this.servers) {
      const tools = await this.getServerTools(serverId);
      result.push({ serverId, tools });
    }

    return result;
  }

  getToolSchema(serverId: string, toolName: string): McpToolDefinition {
    // This would be called after tools are discovered
    return {
      name: toolName,
      description: '',
      inputSchema: { type: 'object', properties: {}, required: [] },
      outputSchema: { type: 'object', properties: {}, required: [] },
    };
  }
}
