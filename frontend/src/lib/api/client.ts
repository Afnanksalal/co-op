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
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay

  private async getHeaders(): Promise<HeadersInit> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      'Content-Type': 'application/json',
      ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
    };
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isRetryable(status: number): boolean {
    // Retry on network errors (0), server errors (5xx), and rate limits (429)
    return status === 0 || status === 429 || (status >= 500 && status < 600);
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    customHeaders?: HeadersInit
  ): Promise<T> {
    const headers = customHeaders ?? await this.getHeaders();
    let lastError: ApiError | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const res = await fetch(`${API_URL}${endpoint}`, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
        });
        
        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: 'Request failed' }));
          
          // Handle backend error format: { success: false, error: string, details?: string[] }
          // Also handle NestJS validation errors: { message: string | string[] }
          let errorMessage = error.error || error.message || `HTTP ${res.status}`;
          
          // If there are validation details, include them
          if (Array.isArray(error.details)) {
            errorMessage = error.details.join(', ');
          } else if (Array.isArray(error.message)) {
            errorMessage = error.message.join(', ');
          }
          
          lastError = new ApiError(errorMessage, res.status, error.code);
          
          // Only retry on retryable errors
          if (this.isRetryable(res.status) && attempt < this.maxRetries - 1) {
            const delay = this.retryDelay * Math.pow(2, attempt); // Exponential backoff
            await this.sleep(delay);
            continue;
          }
          
          throw lastError;
        }
        
        const json: ApiResponse<T> = await res.json();
        return json.data;
      } catch (error) {
        // Handle network errors (fetch throws on network failure)
        if (error instanceof ApiError) {
          throw error;
        }
        
        lastError = new ApiError('Network error', 0);
        
        if (attempt < this.maxRetries - 1) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          await this.sleep(delay);
          continue;
        }
        
        throw lastError;
      }
    }
    
    throw lastError ?? new ApiError('Request failed after retries', 0);
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

  async getSessions(search?: string): Promise<Session[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.get<Session[]>(`/sessions${query}`);
  }

  async updateSessionTitle(id: string, title: string): Promise<Session> {
    return this.patch<Session>(`/sessions/${id}/title`, { title });
  }

  async toggleSessionPin(id: string): Promise<Session> {
    return this.patch<Session>(`/sessions/${id}/pin`, {});
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

  async getUsageStats(): Promise<import('./types').UsageStats> {
    return this.get<import('./types').UsageStats>('/agents/usage');
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
  // USER ANALYTICS ENDPOINTS
  // ============================================

  async getMyAnalytics(): Promise<import('./types').UserAnalytics> {
    return this.get<import('./types').UserAnalytics>('/analytics/me');
  }

  async getMyActivityHistory(days?: number): Promise<import('./types').UserActivityHistory[]> {
    const query = days ? `?days=${days}` : '';
    return this.get<import('./types').UserActivityHistory[]>(`/analytics/me/history${query}`);
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

  async getApiKeyUsageSummary(): Promise<import('./types').ApiKeyUsageSummary> {
    return this.get<import('./types').ApiKeyUsageSummary>('/api-keys/usage');
  }

  async getApiKeyUsage(id: string): Promise<import('./types').ApiKeyUsageStats> {
    return this.get<import('./types').ApiKeyUsageStats>(`/api-keys/${id}/usage`);
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

  async getWebhookUsageSummary(): Promise<import('./types').WebhookUsageSummary> {
    return this.get<import('./types').WebhookUsageSummary>('/webhooks/usage');
  }

  async getWebhookUsage(id: string): Promise<import('./types').WebhookUsageStats> {
    return this.get<import('./types').WebhookUsageStats>(`/webhooks/${id}/usage`);
  }

  // ============================================
  // ADMIN ENDPOINTS
  // ============================================

  async uploadPdf(
    file: File,
    domain: string,
    sector: string,
    options?: {
      region?: string;
      jurisdictions?: string[];
      documentType?: string;
    },
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('domain', domain);
    formData.append('sector', sector);
    formData.append('filename', file.name);
    if (options?.region) formData.append('region', options.region);
    if (options?.jurisdictions?.length) {
      options.jurisdictions.forEach((j) => formData.append('jurisdictions', j));
    }
    if (options?.documentType) formData.append('documentType', options.documentType);
    return this.upload<UploadResult>('/admin/embeddings/upload', formData);
  }

  async getEmbeddings(params?: {
    domain?: string;
    sector?: string;
    region?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<Embedding>> {
    const searchParams = new URLSearchParams();
    if (params?.domain) searchParams.set('domain', params.domain);
    if (params?.sector) searchParams.set('sector', params.sector);
    if (params?.region) searchParams.set('region', params.region);
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
  // METRICS ENDPOINTS
  // ============================================

  async getPrometheusMetrics(): Promise<string> {
    // Use admin endpoint which uses JWT auth instead of API key
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new ApiError('Authentication required for metrics', 401);
    }
    
    const res = await fetch(`${API_URL}/metrics/admin`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      },
    });
    
    if (!res.ok) {
      throw new ApiError('Failed to fetch metrics - admin access required', res.status);
    }
    
    return res.text();
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

  // ============================================
  // EXPORT ENDPOINTS
  // ============================================

  async exportSession(sessionId: string, data: import('./types').ExportSessionRequest): Promise<import('./types').ExportResponse> {
    return this.post<import('./types').ExportResponse>(`/sessions/${sessionId}/export`, data);
  }

  async emailSession(sessionId: string, data: import('./types').EmailSessionRequest): Promise<{ sent: boolean }> {
    return this.post<{ sent: boolean }>(`/sessions/${sessionId}/email`, data);
  }

  // ============================================
  // DOCUMENTS ENDPOINTS
  // ============================================

  async uploadDocument(file: File, sessionId?: string, description?: string): Promise<import('./types').ChatDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('sessionId', sessionId);
    if (description) formData.append('description', description);
    return this.upload<import('./types').ChatDocument>('/documents/upload', formData);
  }

  async getDocuments(sessionId?: string): Promise<import('./types').ChatDocument[]> {
    const query = sessionId ? `?sessionId=${sessionId}` : '';
    return this.get<import('./types').ChatDocument[]>(`/documents${query}`);
  }

  async getDocumentUrl(id: string): Promise<import('./types').DocumentUrlResponse> {
    return this.get<import('./types').DocumentUrlResponse>(`/documents/${id}/url`);
  }

  async getDocumentText(id: string): Promise<{ content: string }> {
    return this.get<{ content: string }>(`/documents/${id}/text`);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.delete(`/documents/${id}`);
  }

  // ============================================
  // STREAMING ENDPOINTS
  // ============================================

  /**
   * Connect to SSE stream for real-time agent updates
   * Note: EventSource doesn't support custom headers, so auth is handled via cookies/session
   */
  streamAgentTask(
    taskId: string,
    onEvent: (event: import('./types').StreamEvent) => void | Promise<void>,
    onError?: (error: Error) => void,
  ): () => void {
    const connect = async () => {
      const url = `${API_URL}/agents/stream/${taskId}`;
      
      const eventSource = new EventSource(url);
      
      eventSource.addEventListener('connected', () => {
        // Connection established
      });
      
      eventSource.addEventListener('progress', (e) => {
        try {
          void onEvent({ type: 'progress', data: JSON.parse(e.data) });
        } catch (err) {
          onError?.(err as Error);
        }
      });
      
      eventSource.addEventListener('chunk', (e) => {
        try {
          void onEvent({ type: 'chunk', data: JSON.parse(e.data) });
        } catch (err) {
          onError?.(err as Error);
        }
      });
      
      eventSource.addEventListener('thinking', (e) => {
        try {
          void onEvent({ type: 'thinking', data: JSON.parse(e.data) });
        } catch (err) {
          onError?.(err as Error);
        }
      });
      
      eventSource.addEventListener('done', async (e) => {
        try {
          // Await the async handler to ensure message is saved before closing
          await onEvent({ type: 'done', data: JSON.parse(e.data) });
          eventSource.close();
        } catch (err) {
          onError?.(err as Error);
        }
      });
      
      eventSource.addEventListener('error', (e) => {
        try {
          const data = (e as MessageEvent).data;
          if (data) {
            void onEvent({ type: 'error', data: JSON.parse(data) });
          }
        } catch {
          // Ignore parse errors on error events
        }
      });
      
      eventSource.onerror = () => {
        onError?.(new Error('SSE connection failed'));
        eventSource.close();
      };
      
      return () => eventSource.close();
    };
    
    let cleanup: (() => void) | undefined;
    connect().then(c => { cleanup = c; }).catch(onError);
    
    return () => cleanup?.();
  }

  // ============================================
  // BOOKMARKS ENDPOINTS
  // ============================================

  async getBookmarks(search?: string): Promise<import('./types').Bookmark[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return this.get<import('./types').Bookmark[]>(`/bookmarks${query}`);
  }

  async createBookmark(data: import('./types').CreateBookmarkRequest): Promise<import('./types').Bookmark> {
    return this.post<import('./types').Bookmark>('/bookmarks', data);
  }

  async updateBookmark(id: string, data: import('./types').UpdateBookmarkRequest): Promise<import('./types').Bookmark> {
    return this.patch<import('./types').Bookmark>(`/bookmarks/${id}`, data);
  }

  async deleteBookmark(id: string): Promise<void> {
    await this.delete(`/bookmarks/${id}`);
  }

  // ============================================
  // ALERTS ENDPOINTS
  // ============================================

  async getAlerts(): Promise<import('./types').Alert[]> {
    return this.get<import('./types').Alert[]>('/alerts');
  }

  async getAlert(id: string): Promise<import('./types').Alert> {
    return this.get<import('./types').Alert>(`/alerts/${id}`);
  }

  async createAlert(data: import('./types').CreateAlertRequest): Promise<import('./types').Alert> {
    return this.post<import('./types').Alert>('/alerts', data);
  }

  async updateAlert(id: string, data: import('./types').UpdateAlertRequest): Promise<import('./types').Alert> {
    return this.patch<import('./types').Alert>(`/alerts/${id}`, data);
  }

  async deleteAlert(id: string): Promise<void> {
    await this.delete(`/alerts/${id}`);
  }

  async getAlertResults(alertId: string, limit?: number): Promise<import('./types').AlertResult[]> {
    const query = limit ? `?limit=${limit}` : '';
    return this.get<import('./types').AlertResult[]>(`/alerts/${alertId}/results${query}`);
  }

  async getUnreadAlertCount(): Promise<{ count: number }> {
    return this.get<{ count: number }>('/alerts/unread-count');
  }

  async markAlertResultRead(resultId: string): Promise<void> {
    await this.patch(`/alerts/results/${resultId}/read`, {});
  }

  // ============================================
  // INVESTORS ENDPOINTS
  // ============================================

  async getInvestors(query?: import('./types').InvestorQuery): Promise<import('./types').Investor[]> {
    const params = new URLSearchParams();
    if (query?.stage) params.set('stage', query.stage);
    if (query?.sector) params.set('sector', query.sector);
    if (query?.region) params.set('region', query.region);
    if (query?.search) params.set('search', query.search);
    if (query?.featuredOnly) params.set('featuredOnly', 'true');
    const queryStr = params.toString();
    return this.get<import('./types').Investor[]>(`/investors${queryStr ? `?${queryStr}` : ''}`);
  }

  async getInvestor(id: string): Promise<import('./types').Investor> {
    return this.get<import('./types').Investor>(`/investors/${id}`);
  }

  async getInvestorStats(): Promise<import('./types').InvestorStats> {
    return this.get<import('./types').InvestorStats>('/investors/stats');
  }

  // Admin only
  async getAllInvestorsAdmin(): Promise<import('./types').Investor[]> {
    return this.get<import('./types').Investor[]>('/investors/admin/all');
  }

  async createInvestor(data: import('./types').CreateInvestorRequest): Promise<import('./types').Investor> {
    return this.post<import('./types').Investor>('/investors', data);
  }

  async updateInvestor(id: string, data: import('./types').UpdateInvestorRequest): Promise<import('./types').Investor> {
    return this.patch<import('./types').Investor>(`/investors/${id}`, data);
  }

  async deleteInvestor(id: string): Promise<void> {
    await this.delete(`/investors/${id}`);
  }

  async bulkCreateInvestors(data: import('./types').CreateInvestorRequest[]): Promise<{ created: number }> {
    return this.post<{ created: number }>('/investors/bulk', data);
  }
}

export const api = new ApiClient();
export { ApiError };
