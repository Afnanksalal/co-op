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
      throw new ApiError(error.message || `HTTP ${res.status}`, res.status, error.code);
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
    
    eventSource.onerror = (e) => {
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
  // STARTUPS ENDPOINTS (Admin only)
  // ============================================

  async getStartups(): Promise<Startup[]> {
    return this.get<Startup[]>('/startups');
  }

  async getStartup(id: string): Promise<Startup> {
    return this.get<Startup>(`/startups/${id}`);
  }
}

export const api = new ApiClient();
export { ApiError };
