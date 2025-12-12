export const EventTypes = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // Session events
  SESSION_STARTED: 'session.started',
  SESSION_ENDED: 'session.ended',
  SESSION_EXPIRED: 'session.expired',

  // Agent events
  AGENT_TASK_CREATED: 'agent.task.created',
  AGENT_TASK_STARTED: 'agent.task.started',
  AGENT_TASK_COMPLETED: 'agent.task.completed',
  AGENT_TASK_FAILED: 'agent.task.failed',
  AGENT_DRAFT_COMPLETED: 'agent.draft.completed',
  AGENT_CRITIQUE_COMPLETED: 'agent.critique.completed',
  AGENT_FINAL_COMPLETED: 'agent.final.completed',

  // MCP events
  MCP_TOOL_CALLED: 'mcp.tool.called',
  MCP_TOOL_SUCCESS: 'mcp.tool.success',
  MCP_TOOL_FAILED: 'mcp.tool.failed',

  // Admin events
  EMBEDDING_UPLOADED: 'embedding.uploaded',
  EMBEDDING_PROCESSED: 'embedding.processed',
  EMBEDDING_DELETED: 'embedding.deleted',

  // System events
  SYSTEM_ERROR: 'system.error',
  SYSTEM_WARNING: 'system.warning',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

export interface AnalyticsEvent {
  type: EventType;
  userId?: string;
  sessionId?: string;
  startupId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
