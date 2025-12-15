import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentJobResult } from '../queue/agents.queue.types';

export type TaskState =
  | 'waiting'
  | 'active'
  | 'completed'
  | 'failed'
  | 'delayed'
  | 'paused'
  | 'cancelled'
  | 'unknown';

export interface TaskProgressDetail {
  phase: 'queued' | 'gathering' | 'critiquing' | 'synthesizing' | 'completed' | 'failed';
  currentAgent?: string;
  agentsCompleted?: number;
  totalAgents?: number;
  critiquesCompleted?: number;
  totalCritiques?: number;
  estimatedTimeRemaining?: number;
  startedAt?: string;
  message?: string;
}

export class TaskStatusDto {
  @ApiProperty({
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused', 'cancelled', 'unknown'],
  })
  status: TaskState;

  @ApiProperty()
  progress: number;

  @ApiPropertyOptional()
  result?: AgentJobResult;

  @ApiPropertyOptional()
  error?: string;

  @ApiPropertyOptional({ description: 'Detailed progress information for real-time UI updates' })
  progressDetail?: TaskProgressDetail;
}

export interface SSEConnectedEvent {
  taskId: string;
  timestamp: string;
}

export type SSEStatusEvent = TaskStatusDto;

export interface SSEDoneEvent {
  status: TaskState;
}
