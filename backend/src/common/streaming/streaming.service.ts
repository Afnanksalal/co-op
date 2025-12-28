import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '@/common/redis/redis.service';

/**
 * Types of events that can be streamed to clients
 */
export type StreamEventType = 'progress' | 'chunk' | 'thinking' | 'done' | 'error';

/**
 * Data payload for stream events
 */
export interface StreamEventData {
  /** Text content (for chunks or messages) */
  content?: string;
  /** Current processing phase */
  phase?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Agent identifier */
  agent?: string;
  /** Thinking step description */
  step?: string;
  /** Error message */
  error?: string;
  /** Final result payload */
  result?: unknown;
}

/**
 * Complete stream event structure
 */
export interface StreamEvent {
  /** Event type */
  type: StreamEventType;
  /** Associated task ID */
  taskId: string;
  /** ISO timestamp of event creation */
  timestamp: string;
  /** Event data payload */
  data: StreamEventData;
}

/**
 * Service for managing Server-Sent Events (SSE) streaming.
 * Uses Redis for event buffering to support late subscribers and
 * horizontal scaling across multiple server instances.
 */
@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  /** Redis key prefix for pub/sub channels */
  private static readonly CHANNEL_PREFIX = 'stream:';
  /** Redis key prefix for event buffers */
  private static readonly BUFFER_PREFIX = 'stream:buffer:';
  /** TTL for buffered events (1 hour) */
  private static readonly BUFFER_TTL = 3600;
  /** Maximum events to keep in buffer */
  private static readonly MAX_BUFFER_SIZE = 100;

  constructor(private readonly redis: RedisService) {}

  /**
   * Get the Redis channel name for a task
   */
  getChannelName(taskId: string): string {
    return `${StreamingService.CHANNEL_PREFIX}${taskId}`;
  }

  /**
   * Publish a stream event to subscribers and buffer
   * @param taskId - The task identifier
   * @param event - Event data (taskId and timestamp will be added automatically)
   */
  async publish(
    taskId: string, 
    event: Omit<StreamEvent, 'taskId' | 'timestamp'>
  ): Promise<void> {
    const fullEvent: StreamEvent = {
      ...event,
      taskId,
      timestamp: new Date().toISOString(),
    };

    try {
      // Store in buffer for late subscribers (fire-and-forget for performance)
      await this.addToBuffer(taskId, fullEvent);
      
      // Publish to channel for real-time subscribers
      const channel = this.getChannelName(taskId);
      await this.redis.publish(channel, JSON.stringify(fullEvent));
      
      this.logger.debug(`Published ${event.type} event for task ${taskId}`);
    } catch (error) {
      this.logger.error(`Failed to publish event for task ${taskId}`, error);
      // Don't throw - streaming failures shouldn't break the main flow
    }
  }

  /**
   * Get buffered events for a task (for late subscribers)
   * @param taskId - The task identifier
   * @returns Array of buffered events
   */
  async getBuffer(taskId: string): Promise<StreamEvent[]> {
    try {
      const key = `${StreamingService.BUFFER_PREFIX}${taskId}`;
      return await this.redis.get<StreamEvent[]>(key) ?? [];
    } catch (error) {
      this.logger.error(`Failed to get buffer for task ${taskId}`, error);
      return [];
    }
  }

  /**
   * Clear the event buffer for a task
   * @param taskId - The task identifier
   */
  async clearBuffer(taskId: string): Promise<void> {
    try {
      const key = `${StreamingService.BUFFER_PREFIX}${taskId}`;
      await this.redis.del(key);
    } catch (error) {
      this.logger.error(`Failed to clear buffer for task ${taskId}`, error);
    }
  }

  // Convenience methods for common event types

  /**
   * Emit a progress update event
   */
  async emitProgress(
    taskId: string, 
    progress: number, 
    phase: string, 
    message?: string
  ): Promise<void> {
    await this.publish(taskId, {
      type: 'progress',
      data: { progress, phase, content: message },
    });
  }

  /**
   * Emit a content chunk (for streaming responses)
   */
  async emitChunk(taskId: string, content: string, agent?: string): Promise<void> {
    await this.publish(taskId, {
      type: 'chunk',
      data: { content, agent },
    });
  }

  /**
   * Emit a thinking step (for showing AI reasoning)
   */
  async emitThinking(taskId: string, step: string, agent?: string): Promise<void> {
    await this.publish(taskId, {
      type: 'thinking',
      data: { step, agent },
    });
  }

  /**
   * Emit task completion event
   */
  async emitDone(taskId: string, result: unknown): Promise<void> {
    await this.publish(taskId, {
      type: 'done',
      data: { result },
    });
  }

  /**
   * Emit error event
   */
  async emitError(taskId: string, error: string): Promise<void> {
    await this.publish(taskId, {
      type: 'error',
      data: { error },
    });
  }

  // Private helper methods

  /**
   * Add event to buffer with size limit
   * Uses a simple locking mechanism to prevent race conditions
   */
  private async addToBuffer(taskId: string, event: StreamEvent): Promise<void> {
    const key = `${StreamingService.BUFFER_PREFIX}${taskId}`;
    const lockKey = `${key}:lock`;
    
    // Simple spin-lock with timeout
    const maxAttempts = 10;
    const lockTimeout = 100; // ms
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Try to acquire lock
      const acquired = await this.redis.setnx(lockKey, '1', 2); // 2 second TTL
      
      if (acquired) {
        try {
          const buffer = await this.redis.get<StreamEvent[]>(key) ?? [];
          buffer.push(event);
          
          // Trim to max size (keep most recent events)
          const trimmed = buffer.length > StreamingService.MAX_BUFFER_SIZE
            ? buffer.slice(-StreamingService.MAX_BUFFER_SIZE)
            : buffer;
          
          await this.redis.set(key, trimmed, StreamingService.BUFFER_TTL);
          return;
        } finally {
          // Release lock
          await this.redis.del(lockKey);
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, lockTimeout));
    }
    
    // Fallback: just append without lock (better than losing the event)
    this.logger.warn(`Failed to acquire lock for buffer ${taskId}, appending without lock`);
    const buffer = await this.redis.get<StreamEvent[]>(key) ?? [];
    buffer.push(event);
    const trimmed = buffer.length > StreamingService.MAX_BUFFER_SIZE
      ? buffer.slice(-StreamingService.MAX_BUFFER_SIZE)
      : buffer;
    await this.redis.set(key, trimmed, StreamingService.BUFFER_TTL);
  }
}
