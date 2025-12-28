import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly activeConnections: Gauge;
  private readonly llmRequestsTotal: Counter;
  private readonly llmRequestDuration: Histogram;
  private readonly llmErrors: Counter;
  private readonly llmTokensTotal: Counter;
  private readonly agentTasksTotal: Counter;
  private readonly agentTaskDuration: Histogram;
  private readonly circuitBreakerState: Gauge;
  private readonly redisOperationsTotal: Counter;
  private readonly redisCacheHits: Counter;
  private readonly redisCacheMisses: Counter;
  private readonly redisErrors: Counter;
  private readonly dbQueryDuration: Histogram;
  private readonly dbConnectionsActive: Gauge;
  private readonly taskQueueSize: Gauge;
  private readonly taskDlqSize: Gauge;
  private readonly retryAttemptsTotal: Counter;
  private readonly retrySuccessesTotal: Counter;

  constructor() {
    this.registry = new Registry();

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [this.registry],
    });

    this.activeConnections = new Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    this.llmRequestsTotal = new Counter({
      name: 'llm_requests_total',
      help: 'Total number of LLM requests',
      labelNames: ['provider', 'model', 'status'],
      registers: [this.registry],
    });

    this.llmRequestDuration = new Histogram({
      name: 'llm_request_duration_seconds',
      help: 'LLM request duration in seconds',
      labelNames: ['provider', 'model'],
      buckets: [0.5, 1, 2, 5, 10, 30, 60],
      registers: [this.registry],
    });

    this.llmErrors = new Counter({
      name: 'llm_errors_total',
      help: 'Total number of LLM errors',
      labelNames: ['provider', 'model', 'error_type'],
      registers: [this.registry],
    });

    this.llmTokensTotal = new Counter({
      name: 'llm_tokens_total',
      help: 'Total number of LLM tokens used',
      labelNames: ['provider', 'model', 'type'],
      registers: [this.registry],
    });

    this.agentTasksTotal = new Counter({
      name: 'agent_tasks_total',
      help: 'Total number of agent tasks',
      labelNames: ['agent', 'status'],
      registers: [this.registry],
    });

    this.agentTaskDuration = new Histogram({
      name: 'agent_task_duration_seconds',
      help: 'Agent task duration in seconds',
      labelNames: ['agent'],
      buckets: [1, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    this.circuitBreakerState = new Gauge({
      name: 'circuit_breaker_state',
      help: 'Circuit breaker state (0=closed, 1=open, 0.5=half-open)',
      labelNames: ['name'],
      registers: [this.registry],
    });

    // Redis metrics
    this.redisOperationsTotal = new Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.redisCacheHits = new Counter({
      name: 'redis_cache_hits_total',
      help: 'Total number of Redis cache hits',
      registers: [this.registry],
    });

    this.redisCacheMisses = new Counter({
      name: 'redis_cache_misses_total',
      help: 'Total number of Redis cache misses',
      registers: [this.registry],
    });

    this.redisErrors = new Counter({
      name: 'redis_errors_total',
      help: 'Total number of Redis errors',
      registers: [this.registry],
    });

    // Database metrics
    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.registry],
    });

    this.dbConnectionsActive = new Gauge({
      name: 'db_connections_active',
      help: 'Number of active database connections',
      registers: [this.registry],
    });

    // Task queue metrics
    this.taskQueueSize = new Gauge({
      name: 'task_queue_size',
      help: 'Number of tasks in the queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.taskDlqSize = new Gauge({
      name: 'task_dlq_size',
      help: 'Number of tasks in the dead letter queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });

    this.retryAttemptsTotal = new Counter({
      name: 'retry_attempts_total',
      help: 'Total number of retry attempts',
      labelNames: ['operation'],
      registers: [this.registry],
    });

    this.retrySuccessesTotal = new Counter({
      name: 'retry_successes_total',
      help: 'Total number of successful retries',
      labelNames: ['operation'],
      registers: [this.registry],
    });
  }

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry });
  }

  recordHttpRequest(method: string, path: string, status: number, durationMs: number): void {
    const normalizedPath = this.normalizePath(path);
    this.httpRequestsTotal.inc({ method, path: normalizedPath, status: String(status) });
    this.httpRequestDuration.observe(
      { method, path: normalizedPath, status: String(status) },
      durationMs / 1000,
    );
  }

  incrementActiveConnections(): void {
    this.activeConnections.inc();
  }

  decrementActiveConnections(): void {
    this.activeConnections.dec();
  }

  recordLlmRequest(provider: string, model: string, status: string, durationMs: number): void {
    this.llmRequestsTotal.inc({ provider, model, status });
    this.llmRequestDuration.observe({ provider, model }, durationMs / 1000);
  }

  recordLlmError(provider: string, model: string, errorType: string): void {
    this.llmErrors.inc({ provider, model, error_type: errorType });
  }

  recordAgentTask(agent: string, status: string, durationMs: number): void {
    this.agentTasksTotal.inc({ agent, status });
    this.agentTaskDuration.observe({ agent }, durationMs / 1000);
  }

  setCircuitBreakerState(name: string, state: 'closed' | 'open' | 'half-open'): void {
    const value = state === 'closed' ? 0 : state === 'open' ? 1 : 0.5;
    this.circuitBreakerState.set({ name }, value);
  }

  // Redis metrics
  recordRedisOperation(operation: string): void {
    this.redisOperationsTotal.inc({ operation });
  }

  recordRedisCacheHit(): void {
    this.redisCacheHits.inc();
  }

  recordRedisCacheMiss(): void {
    this.redisCacheMisses.inc();
  }

  recordRedisError(): void {
    this.redisErrors.inc();
  }

  // Database metrics
  recordDbQuery(operation: string, durationMs: number): void {
    this.dbQueryDuration.observe({ operation }, durationMs / 1000);
  }

  setDbConnectionsActive(count: number): void {
    this.dbConnectionsActive.set(count);
  }

  // Task queue metrics
  setTaskQueueSize(queue: string, size: number): void {
    this.taskQueueSize.set({ queue }, size);
  }

  setTaskDlqSize(queue: string, size: number): void {
    this.taskDlqSize.set({ queue }, size);
  }

  recordRetryAttempt(operation: string): void {
    this.retryAttemptsTotal.inc({ operation });
  }

  recordRetrySuccess(operation: string): void {
    this.retrySuccessesTotal.inc({ operation });
  }

  // LLM token tracking
  recordLlmTokens(provider: string, model: string, promptTokens: number, completionTokens: number): void {
    this.llmTokensTotal.inc({ provider, model, type: 'prompt' }, promptTokens);
    this.llmTokensTotal.inc({ provider, model, type: 'completion' }, completionTokens);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getRegistry(): Registry {
    return this.registry;
  }

  private normalizePath(path: string): string {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }
}
