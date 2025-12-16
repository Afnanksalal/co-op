// ============================================
// Co-Op Frontend Types
// Aligned with Backend API contracts
// ============================================

// === ENUMS ===
export const FOUNDER_ROLES = ['ceo', 'cto', 'coo', 'cfo', 'cpo', 'founder', 'cofounder'] as const;
export type FounderRole = (typeof FOUNDER_ROLES)[number];

export const INDUSTRIES = [
  'saas', 'fintech', 'healthtech', 'edtech', 'ecommerce', 'marketplace',
  'ai_ml', 'artificial_intelligence', 'cybersecurity', 'cleantech', 'biotech',
  'proptech', 'insurtech', 'legaltech', 'hrtech', 'agritech', 'logistics',
  'media_entertainment', 'gaming', 'food_beverage', 'travel_hospitality',
  'social', 'developer_tools', 'hardware', 'other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const SECTORS = ['fintech', 'greentech', 'healthtech', 'saas', 'ecommerce'] as const;
export type Sector = (typeof SECTORS)[number];

export const BUSINESS_MODELS = ['b2b', 'b2c', 'b2b2c', 'marketplace', 'd2c', 'enterprise', 'smb', 'consumer', 'platform', 'api', 'other'] as const;
export type BusinessModel = (typeof BUSINESS_MODELS)[number];

export const REVENUE_MODELS = ['subscription', 'transaction_fee', 'freemium', 'usage_based', 'licensing', 'advertising', 'commission', 'one_time', 'hybrid', 'not_yet'] as const;
export type RevenueModel = (typeof REVENUE_MODELS)[number];

export const STAGES = ['idea', 'prototype', 'mvp', 'beta', 'launched', 'growth', 'scale'] as const;
export type Stage = (typeof STAGES)[number];

export const TEAM_SIZES = ['1-5', '6-20', '21-50', '51-200', '200+'] as const;
export type TeamSize = (typeof TEAM_SIZES)[number];

export const FUNDING_STAGES = ['bootstrapped', 'pre_seed', 'seed', 'series_a', 'series_b', 'series_c_plus', 'profitable'] as const;
export type FundingStage = (typeof FUNDING_STAGES)[number];

export const REVENUE_STATUS = ['yes', 'no', 'pre_revenue'] as const;
export type RevenueStatus = (typeof REVENUE_STATUS)[number];

export const AGENT_TYPES = ['legal', 'finance', 'investor', 'competitor'] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

export const SESSION_STATUSES = ['active', 'ended', 'expired'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export type MessageRole = (typeof MESSAGE_ROLES)[number];

export const RAG_DOMAINS = ['legal', 'finance'] as const;
export type RagDomain = (typeof RAG_DOMAINS)[number];

export const RAG_REGIONS = ['global', 'eu', 'us', 'uk', 'india', 'apac', 'latam', 'mena', 'canada'] as const;
export type RagRegion = (typeof RAG_REGIONS)[number];

export const RAG_JURISDICTIONS = [
  'general', 'gdpr', 'ccpa', 'lgpd', 'pipeda', 'pdpa', 'dpdp',
  'sec', 'finra', 'fca', 'sebi', 'mas', 'esma',
  'hipaa', 'pci_dss', 'sox', 'aml_kyc',
  'dmca', 'patent', 'trademark', 'copyright',
  'employment', 'labor', 'corporate', 'tax', 'contracts',
] as const;
export type RagJurisdiction = (typeof RAG_JURISDICTIONS)[number];

export const RAG_DOCUMENT_TYPES = ['regulation', 'guidance', 'case_law', 'template', 'guide', 'checklist', 'analysis', 'faq'] as const;
export type RagDocumentType = (typeof RAG_DOCUMENT_TYPES)[number];

export const VECTOR_STATUSES = ['pending', 'indexed', 'expired'] as const;
export type VectorStatus = (typeof VECTOR_STATUSES)[number];

// === USER ===
export interface StartupSummary {
  id: string;
  companyName: string;
  industry: string;
  sector: Sector;
  stage: string;
  fundingStage: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  authProvider: 'google' | 'email' | null;
  onboardingCompleted: boolean;
  startup: StartupSummary | null;
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingStatus {
  completed: boolean;
  hasStartup: boolean;
}

// === STARTUP ===
export interface Startup {
  id: string;
  founderName: string;
  founderRole: string;
  companyName: string;
  tagline: string | null;
  description: string;
  website: string | null;
  industry: string;
  sector: Sector;
  businessModel: string;
  revenueModel: string | null;
  stage: string;
  foundedYear: number;
  launchDate: string | null;
  teamSize: string;
  cofounderCount: number;
  country: string;
  city: string | null;
  operatingRegions: string | null;
  fundingStage: string | null;
  totalRaised: string | null;
  monthlyRevenue: string | null;
  isRevenue: string;
  targetCustomer: string | null;
  problemSolved: string | null;
  competitiveAdvantage: string | null;
  createdAt: string;
  updatedAt: string;
}

// === SESSION ===
export interface Session {
  id: string;
  userId: string;
  startupId: string;
  title?: string;
  status: SessionStatus;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  startupId: string;
  metadata?: Record<string, unknown>;
}

// === MESSAGE ===
export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  agent: AgentType | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface CreateMessageRequest {
  role: MessageRole;
  content: string;
  agent?: AgentType;
  metadata?: Record<string, unknown>;
}

// === AGENT ===
export interface AgentOutput {
  content: string;
  confidence: number;
  sources: string[];
  metadata: Record<string, unknown>;
}

export interface AgentPhaseResult {
  phase: 'draft' | 'critique' | 'final';
  output: AgentOutput;
  timestamp: string;
}

export interface RunAgentRequest {
  agentType?: AgentType;
  agents?: string[];
  prompt: string;
  sessionId: string;
  startupId: string;
  documents: string[];
}

export interface QueueTaskResponse {
  taskId: string;
  messageId: string;
}

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
  councilSteps?: string[]; // Realtime thinking steps from LLM council
}

export interface TaskStatus {
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  result?: {
    success: boolean;
    results: AgentPhaseResult[];
    error?: string;
    completedAt: string;
  };
  error?: string;
  progressDetail?: TaskProgressDetail;
}

// === ONBOARDING ===
export interface OnboardingData {
  founderName: string;
  founderRole: FounderRole;
  companyName: string;
  tagline?: string;
  description: string;
  website?: string;
  industry: Industry;
  sector: Sector;
  businessModel: BusinessModel;
  revenueModel?: RevenueModel;
  stage: Stage;
  foundedYear: number;
  launchDate?: string;
  teamSize: TeamSize;
  cofounderCount: number;
  country: string;
  city?: string;
  operatingRegions?: string;
  fundingStage?: FundingStage;
  totalRaised?: number;
  monthlyRevenue?: number;
  isRevenue: RevenueStatus;
  targetCustomer?: string;
  problemSolved?: string;
  competitiveAdvantage?: string;
}

// === API KEYS ===
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string;
}

export interface ApiKeyCreated extends ApiKey {
  key: string; // Only returned on creation
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
}

// === WEBHOOKS ===
export interface Webhook {
  id: string;
  userId: string;
  name: string;
  url: string;
  events: string[];
  isActive: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookRequest {
  name: string;
  url: string;
  events: string[];
}

export interface UpdateWebhookRequest {
  name?: string;
  url?: string;
  events?: string[];
  isActive?: boolean;
}

// === ADMIN / RAG ===
export interface Embedding {
  id: string;
  filename: string;
  storagePath: string;
  domain: RagDomain;
  sector: Sector;
  region: RagRegion;
  jurisdictions: RagJurisdiction[];
  documentType: RagDocumentType;
  status: VectorStatus;
  chunksCreated: number;
  lastAccessed?: string;
  createdAt: string;
}

export interface UploadPdfRequest {
  domain: RagDomain;
  sector: Sector;
  region?: RagRegion;
  jurisdictions?: RagJurisdiction[];
  documentType?: RagDocumentType;
  filename: string;
}

export interface UploadResult {
  id: string;
  status: string;
  storagePath: string;
  domain: string;
  sector: string;
  region: string;
  jurisdictions: string[];
  documentType: string;
}

export interface VectorizeResult {
  chunksCreated: number;
}

export interface CleanupResult {
  filesCleaned: number;
  vectorsRemoved: number;
}

// === USAGE ===
export interface UsageStats {
  used: number;
  limit: number;
  remaining: number;
  resetsAt: string;
}

// === USER ANALYTICS ===
export interface UserAnalytics {
  totalSessions: number;
  activeSessions: number;
  totalMessages: number;
  agentUsage: { agent: string; count: number }[];
  sessionsThisMonth: number;
  messagesThisMonth: number;
  averageMessagesPerSession: number;
  mostActiveDay: string | null;
  recentActivity: { date: string; sessions: number; messages: number }[];
}

export interface UserActivityHistory {
  date: string;
  sessions: number;
  messages: number;
}

// === API KEY USAGE ===
export interface ApiKeyUsageStats {
  keyId: string;
  keyName: string;
  keyPrefix: string;
  totalRequests: number;
  requestsToday: number;
  requestsThisMonth: number;
  lastUsedAt: string | null;
}

export interface ApiKeyUsageSummary {
  totalKeys: number;
  activeKeys: number;
  totalRequestsToday: number;
  totalRequestsThisMonth: number;
  keyUsage: ApiKeyUsageStats[];
}

// === WEBHOOK USAGE ===
export interface WebhookUsageStats {
  webhookId: string;
  webhookName: string;
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  deliveriesToday: number;
  deliveriesThisMonth: number;
  lastTriggeredAt: string | null;
}

export interface WebhookUsageSummary {
  totalWebhooks: number;
  activeWebhooks: number;
  totalDeliveriesToday: number;
  totalDeliveriesThisMonth: number;
  successRate: number;
  webhookUsage: WebhookUsageStats[];
}

// === ANALYTICS ===
export interface DashboardStats {
  totalUsers: number;
  totalSessions: number;
  totalStartups: number;
  activeSessions: number;
  eventsToday: number;
  eventsByType: { type: string; count: number }[];
}

export interface EventAggregation {
  date: string;
  count: number;
  type: string;
}

// === PAGINATION ===
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

// === NOTION ===
export interface NotionStatus {
  connected: boolean;
  workspaceName: string | null;
  workspaceIcon: string | null;
  defaultPageId: string | null;
}

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
}

export interface ExportToNotionRequest {
  pageId?: string;
  title: string;
  agentType: string;
  content: string;
  sources: string[];
  metadata: Record<string, unknown>;
}

export interface NotionExportResult {
  pageId: string;
  pageUrl: string;
  title: string;
  exportedAt: string;
}

// === MCP ===
export interface McpServer {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, { type: string; description: string; enum?: string[] }>;
    required: string[];
  };
  outputSchema: {
    type: string;
    properties: Record<string, { type: string; description: string }>;
    required: string[];
  };
}

export interface McpToolResult {
  success: boolean;
  data: unknown;
  error: string;
  toolName: string;
  executionTime: number;
}

export interface RegisterMcpServerRequest {
  id: string;
  name: string;
  baseUrl: string;
  apiKey?: string;
}

export interface CallMcpToolRequest {
  serverId: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

// === BOOKMARKS ===
export interface Bookmark {
  id: string;
  userId: string;
  sessionId?: string;
  messageId?: string;
  title: string;
  content: string;
  agent?: string;
  tags: string[];
  createdAt: string;
}

export interface CreateBookmarkRequest {
  title: string;
  content: string;
  sessionId?: string;
  messageId?: string;
  agent?: string;
  tags?: string[];
}

export interface UpdateBookmarkRequest {
  title?: string;
  tags?: string[];
}

// === EXPORT ===
export type ExportFormat = 'markdown' | 'pdf' | 'json';

export interface ExportSessionRequest {
  format: ExportFormat;
  title?: string;
}

export interface ExportResponse {
  content: string;
  filename: string;
  mimeType: string;
}

export interface EmailSessionRequest {
  email: string;
  subject?: string;
}

// === DOCUMENTS ===
export interface ChatDocument {
  id: string;
  userId: string;
  sessionId?: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  description?: string;
  createdAt: string;
}

export interface DocumentUrlResponse {
  url: string;
  expiresAt: string;
}

// === STREAMING ===
export interface StreamEvent {
  type: 'progress' | 'chunk' | 'thinking' | 'done' | 'error';
  data: {
    content?: string;
    phase?: string;
    progress?: number;
    agent?: string;
    step?: string;
    error?: string;
    result?: unknown;
  };
}

// === INVESTORS ===
export type InvestorStage = 'pre-seed' | 'seed' | 'series-a' | 'series-b' | 'series-c' | 'growth';

export interface Investor {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  logoUrl: string | null;
  stage: InvestorStage;
  sectors: string; // comma-separated
  checkSizeMin: number | null;
  checkSizeMax: number | null;
  location: string;
  regions: string | null; // comma-separated
  contactEmail: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInvestorRequest {
  name: string;
  description?: string;
  website?: string;
  stage: InvestorStage;
  sectors: string; // comma-separated
  checkSizeMin?: number;
  checkSizeMax?: number;
  location: string;
  regions?: string; // comma-separated
  contactEmail?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface UpdateInvestorRequest {
  name?: string;
  description?: string;
  website?: string;
  stage?: InvestorStage;
  sectors?: string;
  checkSizeMin?: number;
  checkSizeMax?: number;
  location?: string;
  regions?: string;
  contactEmail?: string;
  linkedinUrl?: string;
  twitterUrl?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

export interface InvestorQuery {
  stage?: InvestorStage;
  sector?: string;
  region?: string;
  search?: string;
  featuredOnly?: boolean;
}

export interface InvestorStats {
  total: number;
  byStage: { stage: string; count: number }[];
  bySector: { sector: string; count: number }[];
}

// === ALERTS ===
export type AlertType = 'competitor' | 'market' | 'news' | 'funding';
export type AlertFrequency = 'realtime' | 'daily' | 'weekly';

export interface Alert {
  id: string;
  name: string;
  type: AlertType;
  keywords: string[];
  competitors: string[];
  frequency: AlertFrequency;
  isActive: boolean;
  emailNotify: boolean;
  lastCheckedAt: string | null;
  lastTriggeredAt: string | null;
  triggerCount: number;
  createdAt: string;
}

export interface CreateAlertRequest {
  name: string;
  type?: AlertType;
  keywords: string[];
  competitors?: string[];
  frequency?: AlertFrequency;
  emailNotify?: boolean;
}

export interface UpdateAlertRequest {
  name?: string;
  keywords?: string[];
  competitors?: string[];
  frequency?: AlertFrequency;
  isActive?: boolean;
  emailNotify?: boolean;
}

export interface AlertResult {
  id: string;
  alertId: string;
  title: string;
  summary: string;
  source: string | null;
  sourceUrl: string | null;
  relevanceScore: number | null;
  matchedKeywords: string[];
  matchedCompetitor: string | null;
  isRead: boolean;
  createdAt: string;
}

// === SECURE DOCUMENTS ===
export type SecureDocumentStatus = 'processing' | 'ready' | 'failed' | 'expired';

export interface SecureDocument {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  status: SecureDocumentStatus;
  chunkCount: number;
  expiresAt: string | null;
  createdAt: string;
}

export interface DocumentChunkContext {
  documentId: string;
  filename: string;
  chunkIndex: number;
  content: string; // Decrypted content
}

// === API RESPONSE ===
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}
