import { Injectable, Logger } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { RedisService } from '@/common/redis/redis.service';
import {
  A2AMessage,
  A2ARequest,
  A2AResponse,
  A2ACapability,
  A2A_CAPABILITIES,
} from './a2a.types';
import { AgentType, AgentInput, AgentOutput } from '../types/agent.types';

const A2A_CHANNEL = 'a2a:messages';
const A2A_RESULTS = 'a2a:results';

@Injectable()
export class A2AService {
  private readonly logger = new Logger(A2AService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Get capabilities of all agents
   */
  getCapabilities(): A2ACapability[] {
    return A2A_CAPABILITIES;
  }

  /**
   * Get capabilities of a specific agent
   */
  getAgentCapabilities(agent: string): A2ACapability | null {
    return A2A_CAPABILITIES.find((c) => c.agent === agent) ?? null;
  }

  /**
   * Send a request to another agent
   */
  async sendRequest(
    fromAgent: string,
    request: A2ARequest,
  ): Promise<A2AResponse> {
    const correlationId = uuid();
    const startTime = Date.now();

    const message: A2AMessage = {
      id: uuid(),
      type: 'request',
      fromAgent,
      toAgent: request.targetAgent,
      payload: {
        action: request.action,
        data: request.data,
        priority: 'normal',
      },
      timestamp: new Date(),
      correlationId,
    };

    this.logger.log(`A2A: ${fromAgent} -> ${request.targetAgent} [${request.action}]`);

    // Store message in Redis for processing
    await this.redis.lpush(A2A_CHANNEL, JSON.stringify(message));

    // Wait for response (with timeout)
    const timeout = request.timeout ?? 30000;
    const response = await this.waitForResponse(correlationId, timeout);

    return {
      success: response !== null,
      data: response ?? {},
      error: response === null ? 'Timeout waiting for agent response' : null,
      executionTimeMs: Date.now() - startTime,
    };
  }

  /**
   * Store response for a correlation ID
   */
  async storeResponse(
    correlationId: string,
    response: AgentOutput,
  ): Promise<void> {
    const key = `${A2A_RESULTS}:${correlationId}`;
    await this.redis.set(key, JSON.stringify(response), 60);
  }

  /**
   * Wait for response with timeout using exponential backoff
   * Reduces Redis polling frequency over time
   */
  private async waitForResponse(
    correlationId: string,
    timeout: number,
  ): Promise<Record<string, unknown> | null> {
    const key = `${A2A_RESULTS}:${correlationId}`;
    const startTime = Date.now();
    let pollInterval = 100; // Start with 100ms
    const maxPollInterval = 2000; // Max 2 seconds between polls

    while (Date.now() - startTime < timeout) {
      const result = await this.redis.get<Record<string, unknown>>(key);
      if (result) {
        await this.redis.del(key);
        return result;
      }
      
      await this.sleep(pollInterval);
      
      // Exponential backoff with cap
      pollInterval = Math.min(pollInterval * 1.5, maxPollInterval);
    }

    return null;
  }

  /**
   * Get pending A2A messages for an agent
   */
  async getPendingMessages(agent: string): Promise<A2AMessage[]> {
    const messages: A2AMessage[] = [];
    const rawMessages = await this.redis.lrange(A2A_CHANNEL, 0, -1);

    for (const raw of rawMessages) {
      try {
        const msg = JSON.parse(raw) as A2AMessage;
        if (msg.toAgent === agent) {
          messages.push(msg);
        }
      } catch {
        // Skip invalid messages
      }
    }

    return messages;
  }

  /**
   * Build agent input from A2A request
   */
  buildAgentInput(
    message: A2AMessage,
    sessionId: string,
    userId: string,
    startupId: string,
  ): AgentInput {
    return {
      context: {
        sessionId,
        userId,
        startupId,
        metadata: {
          ...message.payload.data,
          a2aSource: message.fromAgent,
          a2aAction: message.payload.action,
          a2aCorrelationId: message.correlationId,
        },
      },
      prompt: typeof message.payload.data.prompt === 'string'
        ? message.payload.data.prompt
        : message.payload.action,
      documents: [],
    };
  }

  /**
   * Map action to agent type
   */
  getAgentForAction(action: string): AgentType | null {
    for (const cap of A2A_CAPABILITIES) {
      if (cap.actions.includes(action)) {
        return cap.agent as AgentType;
      }
    }
    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
