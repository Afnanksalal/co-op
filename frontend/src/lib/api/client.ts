import { createClient } from '@/lib/supabase/client';
import type {
  ApiResponse,
  User,
  OnboardingStatus,
  OnboardingData,
  Session,
  CreateSessionRequest,
  Message,
  CreateMessageRequest,
  RunAgentRequest,
  QueueTaskResponse,
  TaskStatus,
  AgentPhaseResult,
  ApiKey,
  ApiKeyCreated,
  CreateApiKeyRequest,
  Webhook,
  CreateWebhookRequest,
  UpdateWebhookRequest,
  Embedding,
  UploadResult,
  VectorizeResult,
  CleanupResult,
  DashboardStats,
  EventAggregation,
  PaginatedResult,
  Startup,
  NotionStatus,
  NotionPage,
  ExportToNotionRequest,
  NotionExportResult,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

class ApiClient {
  private async getHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    };
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    customHeaders?: HeadersInit
  ): Promise<T> {
    const headers = customHeaders ?? await this.getHeaders();
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Request failed' }));
      // Handle NestJS validation errors which return message as array
      let errorMessage = error.message;
      if (Array.isArray(error.message)) {
        errorMessage = error.message.join(', ');
      }
      throw new ApiError(errorMessage || `HTTP ${res.status}`, res.status, error.code);
    }
    
    const json: ApiResponse<T> = await res.json();
    return json.data;
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>('GET', endpoint);
  }

  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', endpoint, body);
  }

  async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', endpoint, body);
  }

  async delete(endpoint: string): Promise<void> {
    await this.request<null>('DELETE', endpoint);
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const res = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
      },
      body: formData,
    });
    
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Upload failed' }));
      throw new ApiError(error.message || `HTTP ${res.status}`, res.status);
    }
    
    const json: ApiResponse<T> = await res.json();
    return json.data;
  }

  // ============================================
  // USER ENDPOINTS
  // ============================================
  
  async getMe(): Promise<User> {
    return this.get<User>('/users/me');
  }

  async getOnboardingStatus(): Promise<OnboardingStatus> {
    return this.get<OnboardingStatus>('/users/me/onboarding-status');
  }

  async completeOnboarding(data: OnboardingData): Promise<User> {
    return this.post<User>('/users/me/onboarding', data);
  }

  async updateProfile(data: { name?: string }): Promise<User> {
    return this.patch<User>('/users/me', data);
  }

  async updateStartup(data: Partial<OnboardingData>): Promise<User> {
    return this.patch<User>('/users/me/startup', data);
  }

  // ============================================
  // SESSION ENDPOINTS
  // ============================================

  async createSession(data: CreateSessionRequest): Promise<Session> {
    return this.post<Session>('/sessions', data);
  }

  async getSessions(): Promise<Session[]> {
    return this.get<Session[]>('/sessions');
  }

  async getSession(id: string): Promise<Session> {
    return this.get<Session>(`/sessions/${id}`);
  }

  async endSession(id: string): Promise<void> {
    await this.post(`/sessions/${id}/end`);
  }

  async getSessionMessages(sessionId: string, limit?: number): Promise<Message[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<Message[]>(`/sessions/${sessionId}/messages${query}`);
  }

  async addSessionMessage(sessionId: string, data: CreateMessageRequest): Promise<Message> {
    return this.post<Message>(`/sessions/${sessionId}/messages`, data);
  }

  async getSessionHistory(sessionId: string): Promise<{ session: Session; messages: Message[] }> {
    return this.get<{ session: Session; messages: Message[] }>(`/sessions/${sessionId}/history`);
  }

  // ============================================
  // AGENT ENDPOINTS
  // ============================================

  async runAgent(data: RunAgentRequest): Promise<AgentPhaseResult[]> {
    return this.post<AgentPhaseResult[]>('/agents/run', data);
  }

  async queueAgent(data: RunAgentRequest): Promise<QueueTaskResponse> {
    return this.post<QueueTaskResponse>('/agents/queue', data);
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    return this.get<TaskStatus>(`/agents/tasks/${taskId}`);
  }

  async cancelTask(taskId: string): Promise<void> {
    await this.delete(`/agents/tasks/${taskId}`);
  }

  streamTask(
    taskId: string,
    onStatus: (status: TaskStatus) => void,
    onDone: () => void,
    onError?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(`${API_URL}/agents/stream/${taskId}`);
    
    eventSource.addEventListener('status', (e) => {
      try {
        onStatus(JSON.parse(e.data));
      } catch (err) {
        onError?.(err as Error);
      }
    });
    
    eventSource.addEventListener('done', () => {
      eventSource.close();
      onDone();
    });
    
    eventSource.onerror = () => {
      eventSource.close();
      onError?.(new Error('Stream connection failed'));
      onDone();
    };
    
    return () => eventSource.close();
  }

  // ============================================
  // API KEYS ENDPOINTS
  // ============================================

  async getApiKeys(): Promise<ApiKey[]> {
    return this.get<ApiKey[]>('/api-keys');
  }

  async createApiKey(data: CreateApiKeyRequest): Promise<ApiKeyCreated> {
    return this.post<ApiKeyCreated>('/api-keys', data);
  }

  async revokeApiKey(id: string): Promise<void> {
    await this.delete(`/api-keys/${id}`);
  }

  // ============================================
  // WEBHOOKS ENDPOINTS
  // ============================================

  async getWebhooks(): Promise<Webhook[]> {
    return this.get<Webhook[]>('/webhooks');
  }

  async getWebhook(id: string): Promise<Webhook> {
    return this.get<Webhook>(`/webhooks/${id}`);
  }

  async createWebhook(data: CreateWebhookRequest): Promise<Webhook> {
    return this.post<Webhook>('/webhooks', data);
  }

  async updateWebhook(id: string, data: UpdateWebhookRequest): Promise<Webhook> {
    return this.patch<Webhook>(`/webhooks/${id}`, data);
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.delete(`/webhooks/${id}`);
  }

  async regenerateWebhookSecret(id: string): Promise<{ secret: string }> {
    return this.post<{ secret: string }>(`/webhooks/${id}/regenerate-secret`);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  async uploadPdf(file: File, domain: string, sector: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', domain);
    formData.append('sector', sector);
    formData.append('filename', file.name);
    return this.upload<UploadResult>('/admin/embeddings/upload', formData);
  }

  async getEmbeddings(params?: {
    domain?: string;
    sector?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Embedding>> {
    const searchParams = new URLSearchParams();
    if (params?.domain) searchParams.set('domain', params.domain);
    if (params?.sector) searchParams.set('sector', params.sector);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.limit) searchParams.set('limit', String(params.limit));
    
    const query = searchParams.toString();
    return this.get<PaginatedResult<Embedding>>(`/admin/embeddings${query ? `?${query}` : ''}`);
  }

  async getEmbedding(id: string): Promise<Embedding> {
    return this.get<Embedding>(`/admin/embeddings/${id}`);
  }

  async deleteEmbedding(id: string): Promise<void> {
    await this.delete(`/admin/embeddings/${id}`);
  }

  async vectorizeEmbedding(id: string): Promise<VectorizeResult> {
    return this.post<VectorizeResult>(`/admin/embeddings/${id}/vectorize`);
  }

  async cleanupEmbeddings(days?: number): Promise<CleanupResult> {
    const query = days ? `?days=${days}` : '';
    return this.post<CleanupResult>(`/admin/embeddings/cleanup${query}`);
  }

  // ============================================
  // ANALYTICS ENDPOINTS (Admin only)
  // ============================================

  async getDashboardStats(): Promise<DashboardStats> {
    return this.get<DashboardStats>('/analytics/dashboard');
  }

  async getEventAggregation(days?: number): Promise<EventAggregation[]> {
    const query = days ? `?days=${days}` : '';
    return this.get<EventAggregation[]>(`/analytics/events/aggregation${query}`);
  }

  // ============================================
  // METRICS ENDPOINTS (Requires API Key)
  // ============================================

  async getPrometheusMetrics(apiKey?: string): Promise<string> {
    // Try to get API key from localStorage if not provided
    const key = apiKey || (typeof window !== 'undefined' ? localStorage.getItem('metrics_api_key') : null);
    
    if (!key) {
      throw new ApiError('Metrics API key not configured. Set a Master API Key in environment or store one in settings.', 401);
    }
    
    const res = await fetch(`${API_URL}/metrics`, {
      method: 'GET',
      headers: {
        'X-API-Key': key,
      },
    });
    
    if (!res.ok) {
      throw new ApiError('Invalid API key or metrics unavailable', res.status);
    }
    
    return res.text();
  }

  setMetricsApiKey(apiKey: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('metrics_api_key', apiKey);
    }
  }

  getStoredMetricsApiKey(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('metrics_api_key');
    }
    return null;
  }

  clearMetricsApiKey(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('metrics_api_key');
    }
  }

  // ============================================
  // STARTUPS ENDPOINTS (Admin only)
  // ============================================

  async getStartups(): Promise<Startup[]> {
    return this.get<Startup[]>('/startups');
  }

  async getStartup(id: string): Promise<Startup> {
    return this.get<Startup>(`/startups/${id}`);
  }

  // ============================================
  // NOTION ENDPOINTS
  // ============================================

  async getNotionStatus(): Promise<NotionStatus> {
    return this.get<NotionStatus>('/notion/status');
  }

  async searchNotionPages(query: string): Promise<NotionPage[]> {
    return this.get<NotionPage[]>(`/notion/pages?query=${encodeURIComponent(query)}`);
  }

  async exportToNotion(data: ExportToNotionRequest): Promise<NotionExportResult> {
    return this.post<NotionExportResult>('/notion/export', data);
  }

  // ============================================
  // MCP ENDPOINTS (Admin only)
  // ============================================

  async getMcpServers(): Promise<import('./types').McpServer[]> {
    return this.get<import('./types').McpServer[]>('/mcp/servers');
  }

  async registerMcpServer(data: import('./types').RegisterMcpServerRequest): Promise<void> {
    await this.post('/mcp/servers', data);
  }

  async unregisterMcpServer(id: string): Promise<void> {
    await this.delete(`/mcp/servers/${id}`);
  }

  async getMcpServerTools(serverId: string): Promise<import('./types').McpTool[]> {
    return this.get<import('./types').McpTool[]>(`/mcp/servers/${serverId}/tools`);
  }

  async discoverMcpTools(serverId: string): Promise<import('./types').McpTool[]> {
    return this.post<import('./types').McpTool[]>(`/mcp/servers/${serverId}/discover`);
  }

  async getAllMcpTools(): Promise<{ serverId: string; tools: import('./types').McpTool[] }[]> {
    return this.get<{ serverId: string; tools: import('./types').McpTool[] }[]>('/mcp/tools');
  }

  async callMcpTool(data: import('./types').CallMcpToolRequest): Promise<import('./types').McpToolResult> {
    return this.post<import('./types').McpToolResult>('/mcp/execute', data);
  }
}

export const api = new ApiClient();
export { ApiError };
