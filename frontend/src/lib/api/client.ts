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

// In-flight request deduplication to prevent duplicate API calls
const inflightRequests = new Map<string, Promise<unknown>>();

// Simple in-memory cache for GET requests (5 second TTL)
const responseCache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds

class ApiClient {
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second base delay
  
  // Cacheable GET endpoints (short-lived cache for rapid re-renders)
  private readonly cacheableEndpoints = [
    '/users/me',
    '/sessions',
    '/bookmarks',
    '/alerts',
    '/api-keys',
    '/webhooks',
  ];

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

  private isCacheable(endpoint: string): boolean {
    return this.cacheableEndpoints.some(e => endpoint.startsWith(e));
  }

  private getCacheKey(method: string, endpoint: string, body?: unknown): string {
    return `${method}:${endpoint}:${body ? JSON.stringify(body) : ''}`;
  }

  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
    customHeaders?: HeadersInit
  ): Promise<T> {
    const cacheKey = this.getCacheKey(method, endpoint, body);
    
    // Check cache for GET requests
    if (method === 'GET' && this.isCacheable(endpoint)) {
      const cached = responseCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data as T;
      }
    }
    
    // Deduplicate in-flight requests (same request made multiple times)
    if (method === 'GET') {
      const inflight = inflightRequests.get(cacheKey);
      if (inflight) {
        return inflight as Promise<T>;
      }
    }
    
    const requestPromise = this.executeRequest<T>(method, endpoint, body, customHeaders);
    
    // Track in-flight GET requests
    if (method === 'GET') {
      inflightRequests.set(cacheKey, requestPromise);
      requestPromise.finally(() => {
        inflightRequests.delete(cacheKey);
      });
    }
    
    const result = await requestPromise;
    
    // Cache successful GET responses
    if (method === 'GET' && this.isCacheable(endpoint)) {
      responseCache.set(cacheKey, { data: result, timestamp: Date.now() });
    }
    
    return result;
  }

  private async executeRequest<T>(
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
        
        const json = await res.json();
        // Handle both wrapped { data: T } and raw T responses
        return json.data !== undefined ? json.data : json;
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
      const error = await res.json().catch(() => ({ error: 'Upload failed' }));
      // Handle backend error format: { success: false, error: string, details?: string[] }
      let errorMessage = error.error || error.message || `HTTP ${res.status}`;
      if (Array.isArray(error.details)) {
        errorMessage = error.details.join(', ');
      }
      throw new ApiError(errorMessage, res.status);
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

  // ============================================
  // SECURE DOCUMENTS ENDPOINTS
  // ============================================

  async uploadSecureDocument(
    file: File,
    sessionId?: string,
    expiryDays?: number,
  ): Promise<import('./types').SecureDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (sessionId) formData.append('sessionId', sessionId);
    if (expiryDays) formData.append('expiryDays', String(expiryDays));

    const headers = await this.getHeaders();
    delete (headers as Record<string, string>)['Content-Type']; // Let browser set multipart boundary

    const res = await fetch(`${API_URL}/secure-documents/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new ApiError(error.error || error.message || 'Upload failed', res.status);
    }

    const json = await res.json();
    return json.data !== undefined ? json.data : json;
  }

  async getSecureDocuments(sessionId?: string): Promise<import('./types').SecureDocument[]> {
    const params = sessionId ? `?sessionId=${sessionId}` : '';
    return this.get<import('./types').SecureDocument[]>(`/secure-documents${params}`);
  }

  async getDocumentContext(
    documentId: string,
    chunkIndices?: number[],
  ): Promise<import('./types').DocumentChunkContext[]> {
    const params = chunkIndices ? `?chunks=${chunkIndices.join(',')}` : '';
    return this.get<import('./types').DocumentChunkContext[]>(`/secure-documents/${documentId}/context${params}`);
  }

  async extendDocumentExpiry(documentId: string, days: number): Promise<import('./types').SecureDocument> {
    return this.post<import('./types').SecureDocument>(`/secure-documents/${documentId}/extend`, { days });
  }

  async deleteSecureDocument(documentId: string): Promise<void> {
    await this.delete(`/secure-documents/${documentId}`);
  }

  async purgeAllDocuments(): Promise<{ documentsDeleted: number; chunksDeleted: number }> {
    return this.request<{ documentsDeleted: number; chunksDeleted: number }>('DELETE', '/secure-documents/purge/all');
  }

  // ============================================
  // OUTREACH - LEADS ENDPOINTS
  // ============================================

  async discoverLeads(data: import('./types').DiscoverLeadsRequest): Promise<import('./types').Lead[]> {
    return this.post<import('./types').Lead[]>('/outreach/leads/discover', data);
  }

  async getLeads(filters?: import('./types').LeadFilters): Promise<import('./types').Lead[]> {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.leadType) params.set('leadType', filters.leadType);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.platform) params.set('platform', filters.platform);
    if (filters?.niche) params.set('niche', filters.niche);
    if (filters?.minScore !== undefined) params.set('minScore', String(filters.minScore));
    const queryStr = params.toString();
    return this.get<import('./types').Lead[]>(`/outreach/leads${queryStr ? `?${queryStr}` : ''}`);
  }

  async getLead(id: string): Promise<import('./types').Lead> {
    return this.get<import('./types').Lead>(`/outreach/leads/${id}`);
  }

  async createLead(data: import('./types').CreateLeadRequest): Promise<import('./types').Lead> {
    return this.post<import('./types').Lead>('/outreach/leads', data);
  }

  async updateLead(id: string, data: import('./types').UpdateLeadRequest): Promise<import('./types').Lead> {
    return this.patch<import('./types').Lead>(`/outreach/leads/${id}`, data);
  }

  async deleteLead(id: string): Promise<void> {
    await this.delete(`/outreach/leads/${id}`);
  }

  // ============================================
  // OUTREACH - CAMPAIGNS ENDPOINTS
  // ============================================

  async getCampaigns(): Promise<import('./types').Campaign[]> {
    return this.get<import('./types').Campaign[]>('/outreach/campaigns');
  }

  async getCampaign(id: string): Promise<import('./types').Campaign> {
    return this.get<import('./types').Campaign>(`/outreach/campaigns/${id}`);
  }

  async createCampaign(data: import('./types').CreateCampaignRequest): Promise<import('./types').Campaign> {
    return this.post<import('./types').Campaign>('/outreach/campaigns', data);
  }

  async updateCampaign(id: string, data: import('./types').UpdateCampaignRequest): Promise<import('./types').Campaign> {
    return this.patch<import('./types').Campaign>(`/outreach/campaigns/${id}`, data);
  }

  async deleteCampaign(id: string): Promise<void> {
    await this.delete(`/outreach/campaigns/${id}`);
  }

  async previewCampaignEmail(campaignId: string, leadId: string): Promise<import('./types').EmailPreview> {
    return this.post<import('./types').EmailPreview>(`/outreach/campaigns/${campaignId}/preview`, { leadId });
  }

  async generateCampaignEmails(campaignId: string, leadIds: string[]): Promise<import('./types').CampaignEmail[]> {
    return this.post<import('./types').CampaignEmail[]>(`/outreach/campaigns/${campaignId}/generate-emails`, { leadIds });
  }

  async getCampaignEmails(campaignId: string): Promise<import('./types').CampaignEmail[]> {
    return this.get<import('./types').CampaignEmail[]>(`/outreach/campaigns/${campaignId}/emails`);
  }

  async sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
    return this.post<{ sent: number; failed: number }>(`/outreach/campaigns/${campaignId}/send`);
  }

  async getCampaignStats(campaignId: string): Promise<import('./types').CampaignStats> {
    return this.get<import('./types').CampaignStats>(`/outreach/campaigns/${campaignId}/stats`);
  }
}

export const api = new ApiClient();
export { ApiError };

// Cache invalidation helpers
export function invalidateCache(endpoint?: string): void {
  if (endpoint) {
    // Invalidate specific endpoint
    const keysToDelete: string[] = [];
    responseCache.forEach((_, key) => {
      if (key.includes(endpoint)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => responseCache.delete(key));
  } else {
    // Clear all cache
    responseCache.clear();
  }
}

export function invalidateUserCache(): void {
  invalidateCache('/users/me');
}

export function invalidateSessionsCache(): void {
  invalidateCache('/sessions');
}
