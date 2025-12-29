import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { McpServerService } from './mcp-server.service';
import { McpToolCallDto, McpToolResultDto, McpDiscoveryDto } from './dto/mcp-server.dto';

@ApiTags('MCP Server')
@Controller('mcp-server')
export class McpServerController {
  private readonly logger = new Logger(McpServerController.name);
  private readonly masterApiKey: string;

  constructor(
    private readonly mcpServerService: McpServerService,
    private readonly configService: ConfigService,
  ) {
    this.masterApiKey = this.configService.get<string>('MASTER_API_KEY', '');
  }

  @Get('discover')
  @ApiOperation({
    summary: 'Discover available MCP tools',
    description: 'Returns server information and list of available tools with input schemas',
  })
  @ApiResponse({ status: 200, description: 'List of available tools', type: McpDiscoveryDto })
  @ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication', required: false })
  discover(@Headers('x-api-key') apiKey?: string): McpDiscoveryDto {
    this.validateApiKey(apiKey);
    this.logger.log('MCP discovery request');
    return this.mcpServerService.discoverTools();
  }

  @Post('execute')
  @ApiOperation({
    summary: 'Execute an MCP tool',
    description: 'Execute one of the available tools (legal_analysis, finance_analysis, investor_search, competitor_analysis)',
  })
  @ApiResponse({ status: 200, description: 'Tool execution result', type: McpToolResultDto })
  @ApiResponse({ status: 400, description: 'Invalid tool or arguments' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiHeader({ name: 'X-API-Key', description: 'API Key for authentication', required: true })
  async execute(
    @Headers('x-api-key') apiKey: string,
    @Body() dto: McpToolCallDto,
  ): Promise<McpToolResultDto> {
    this.validateApiKey(apiKey);
    this.logger.log(`MCP tool execution: ${dto.tool}`);
    return this.mcpServerService.executeTool(dto);
  }

  private validateApiKey(apiKey?: string): void {
    // In dev mode without master key, allow access (log warning)
    if (!this.masterApiKey) {
      this.logger.warn('MCP Server: No MASTER_API_KEY configured - running in insecure mode');
      return;
    }

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Use timing-safe comparison to prevent timing attacks
    const apiKeyBuffer = Buffer.from(apiKey);
    const masterKeyBuffer = Buffer.from(this.masterApiKey);
    
    if (apiKeyBuffer.length !== masterKeyBuffer.length) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!timingSafeEqual(apiKeyBuffer, masterKeyBuffer)) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
