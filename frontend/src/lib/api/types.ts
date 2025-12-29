// Co-Op Frontend Types

// === ENUMS ===
export const FOUNDER_ROLES = ['ceo', 'cto', 'coo', 'cfo', 'cpo', 'founder', 'cofounder'] as const;
export type FounderRole = (typeof FOUNDER_ROLES)[number];

export const INDUSTRIES = [
  // Technology & Software
  'saas', 'ai_ml', 'artificial_intelligence', 'machine_learning', 'developer_tools', 'devops',
  'cybersecurity', 'cloud_computing', 'data_analytics', 'big_data', 'enterprise_software',
  'low_code_no_code', 'api_services',
  // Finance & Insurance
  'fintech', 'insurtech', 'wealthtech', 'regtech', 'payments', 'banking', 'lending',
  'crypto_blockchain', 'defi', 'neobank',
  // Health & Life Sciences
  'healthtech', 'biotech', 'medtech', 'digital_health', 'mental_health', 'pharma',
  'genomics', 'telehealth', 'fitness_wellness',
  // Commerce & Retail
  'ecommerce', 'marketplace', 'retail_tech', 'd2c', 'supply_chain', 'logistics', 'fulfillment',
  // Sustainability & Energy
  'cleantech', 'greentech', 'climate_tech', 'renewable_energy', 'carbon_tech',
  'circular_economy', 'sustainability',
  // Real Estate & Construction
  'proptech', 'construction_tech', 'smart_buildings', 'real_estate',
  // Education & HR
  'edtech', 'hrtech', 'workforce_tech', 'learning_platforms', 'corporate_training', 'recruiting',
  // Media & Entertainment
  'media_entertainment', 'gaming', 'esports', 'creator_economy', 'streaming', 'adtech',
  'martech', 'content_creation',
  // Food & Agriculture
  'foodtech', 'agritech', 'food_beverage', 'food_delivery', 'restaurant_tech', 'vertical_farming',
  // Transportation & Mobility
  'mobility', 'automotive', 'ev_tech', 'autonomous_vehicles', 'fleet_management',
  'ride_sharing', 'micro_mobility',
  // Legal & Government
  'legaltech', 'govtech', 'civic_tech', 'compliance',
  // Travel & Hospitality
  'travel_hospitality', 'travel_tech', 'hospitality', 'tourism',
  // Social & Communication
  'social', 'communication', 'community', 'dating', 'networking',
  // Hardware & IoT
  'hardware', 'iot', 'robotics', 'drones', 'wearables', 'consumer_electronics', '3d_printing',
  // Other
  'other',
] as const;
export type Industry = (typeof INDUSTRIES)[number];

export const SECTORS = [
  // Technology & Software
  'saas', 'ai_ml', 'developer_tools', 'cybersecurity', 'cloud_infrastructure',
  'data_analytics', 'devops', 'low_code',
  // Finance
  'fintech', 'insurtech', 'wealthtech', 'regtech', 'payments', 'banking', 'crypto_web3', 'defi',
  // Health & Life Sciences
  'healthtech', 'biotech', 'medtech', 'digital_health', 'mental_health', 'pharma', 'genomics', 'telehealth',
  // Commerce & Retail
  'ecommerce', 'marketplace', 'retail_tech', 'd2c', 'supply_chain', 'logistics',
  // Sustainability & Energy
  'greentech', 'cleantech', 'climate_tech', 'renewable_energy', 'carbon_tech', 'circular_economy',
  // Real Estate & Construction
  'proptech', 'construction_tech', 'smart_buildings',
  // Education & HR
  'edtech', 'hrtech', 'workforce_tech', 'learning_platforms',
  // Media & Entertainment
  'media_entertainment', 'gaming', 'creator_economy', 'streaming', 'adtech', 'martech',
  // Food & Agriculture
  'foodtech', 'agritech', 'food_delivery', 'restaurant_tech',
  // Transportation & Mobility
  'mobility', 'automotive', 'ev_tech', 'autonomous_vehicles', 'fleet_management',
  // Legal & Government
  'legaltech', 'govtech', 'civic_tech',
  // Travel & Hospitality
  'travel_tech', 'hospitality',
  // Social & Communication
  'social', 'communication', 'community',
  // Hardware & IoT
  'hardware', 'iot', 'robotics', 'drones', 'wearables',
  // Other
  'other',
] as const;
export type Sector = (typeof SECTORS)[number];

// Sector categories for UI grouping
export const SECTOR_CATEGORIES = {
  'Technology & Software': ['saas', 'ai_ml', 'developer_tools', 'cybersecurity', 'cloud_infrastructure', 'data_analytics', 'devops', 'low_code'],
  'Finance': ['fintech', 'insurtech', 'wealthtech', 'regtech', 'payments', 'banking', 'crypto_web3', 'defi'],
  'Health & Life Sciences': ['healthtech', 'biotech', 'medtech', 'digital_health', 'mental_health', 'pharma', 'genomics', 'telehealth'],
  'Commerce & Retail': ['ecommerce', 'marketplace', 'retail_tech', 'd2c', 'supply_chain', 'logistics'],
  'Sustainability & Energy': ['greentech', 'cleantech', 'climate_tech', 'renewable_energy', 'carbon_tech', 'circular_economy'],
  'Real Estate & Construction': ['proptech', 'construction_tech', 'smart_buildings'],
  'Education & HR': ['edtech', 'hrtech', 'workforce_tech', 'learning_platforms'],
  'Media & Entertainment': ['media_entertainment', 'gaming', 'creator_economy', 'streaming', 'adtech', 'martech'],
  'Food & Agriculture': ['foodtech', 'agritech', 'food_delivery', 'restaurant_tech'],
  'Transportation & Mobility': ['mobility', 'automotive', 'ev_tech', 'autonomous_vehicles', 'fleet_management'],
  'Legal & Government': ['legaltech', 'govtech', 'civic_tech'],
  'Travel & Hospitality': ['travel_tech', 'hospitality'],
  'Social & Communication': ['social', 'communication', 'community'],
  'Hardware & IoT': ['hardware', 'iot', 'robotics', 'drones', 'wearables'],
  'Other': ['other'],
} as const;

// Human-readable sector labels
export const SECTOR_LABELS: Record<Sector, string> = {
  // Technology & Software
  saas: 'SaaS',
  ai_ml: 'AI / Machine Learning',
  developer_tools: 'Developer Tools',
  cybersecurity: 'Cybersecurity',
  cloud_infrastructure: 'Cloud Infrastructure',
  data_analytics: 'Data & Analytics',
  devops: 'DevOps',
  low_code: 'Low-Code / No-Code',
  // Finance
  fintech: 'Fintech',
  insurtech: 'Insurtech',
  wealthtech: 'Wealthtech',
  regtech: 'Regtech',
  payments: 'Payments',
  banking: 'Banking',
  crypto_web3: 'Crypto / Web3',
  defi: 'DeFi',
  // Health & Life Sciences
  healthtech: 'Healthtech',
  biotech: 'Biotech',
  medtech: 'Medtech',
  digital_health: 'Digital Health',
  mental_health: 'Mental Health',
  pharma: 'Pharma',
  genomics: 'Genomics',
  telehealth: 'Telehealth',
  // Commerce & Retail
  ecommerce: 'E-commerce',
  marketplace: 'Marketplace',
  retail_tech: 'Retail Tech',
  d2c: 'D2C',
  supply_chain: 'Supply Chain',
  logistics: 'Logistics',
  // Sustainability & Energy
  greentech: 'Greentech',
  cleantech: 'Cleantech',
  climate_tech: 'Climate Tech',
  renewable_energy: 'Renewable Energy',
  carbon_tech: 'Carbon Tech',
  circular_economy: 'Circular Economy',
  // Real Estate & Construction
  proptech: 'Proptech',
  construction_tech: 'Construction Tech',
  smart_buildings: 'Smart Buildings',
  // Education & HR
  edtech: 'Edtech',
  hrtech: 'HR Tech',
  workforce_tech: 'Workforce Tech',
  learning_platforms: 'Learning Platforms',
  // Media & Entertainment
  media_entertainment: 'Media & Entertainment',
  gaming: 'Gaming',
  creator_economy: 'Creator Economy',
  streaming: 'Streaming',
  adtech: 'Adtech',
  martech: 'Martech',
  // Food & Agriculture
  foodtech: 'Foodtech',
  agritech: 'Agritech',
  food_delivery: 'Food Delivery',
  restaurant_tech: 'Restaurant Tech',
  // Transportation & Mobility
  mobility: 'Mobility',
  automotive: 'Automotive',
  ev_tech: 'EV Tech',
  autonomous_vehicles: 'Autonomous Vehicles',
  fleet_management: 'Fleet Management',
  // Legal & Government
  legaltech: 'Legaltech',
  govtech: 'Govtech',
  civic_tech: 'Civic Tech',
  // Travel & Hospitality
  travel_tech: 'Travel Tech',
  hospitality: 'Hospitality',
  // Social & Communication
  social: 'Social',
  communication: 'Communication',
  community: 'Community',
  // Hardware & IoT
  hardware: 'Hardware',
  iot: 'IoT',
  robotics: 'Robotics',
  drones: 'Drones',
  wearables: 'Wearables',
  // Other
  other: 'Other',
};

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
  region?: RagRegion;
  jurisdiction?: RagJurisdiction;
  financeFocus?: string;
  currency?: string;
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

// === OUTREACH - LEADS ===
export type LeadType = 'person' | 'company';
export type LeadStatus = 'new' | 'enriched' | 'contacted' | 'replied' | 'converted' | 'unsubscribed';

export interface Lead {
  id: string;
  leadType: LeadType;
  // Company fields
  companyName: string | null;
  website: string | null;
  industry: string | null;
  companySize: string | null;
  // Person/Influencer fields
  name: string | null;
  platform: string | null;
  handle: string | null;
  followers: number | null;
  niche: string | null;
  // Common fields
  email: string | null;
  location: string | null;
  description: string | null;
  profileUrl: string | null;
  customFields: Record<string, string>;
  leadScore: number;
  status: LeadStatus;
  source: string | null;
  tags: string[];
  createdAt: string;
  displayName: string;
}

export interface DiscoverLeadsRequest {
  leadType: LeadType;
  targetNiche?: string;
  targetPlatforms?: string[];
  targetLocations?: string[];
  minFollowers?: number;
  maxFollowers?: number;
  targetCompanySizes?: string[];
  keywords?: string;
  maxLeads?: number;
}

export interface CreateLeadRequest {
  leadType: LeadType;
  // Company fields
  companyName?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  // Person fields
  name?: string;
  platform?: string;
  handle?: string;
  followers?: number;
  niche?: string;
  // Common fields
  email?: string;
  location?: string;
  description?: string;
  profileUrl?: string;
  customFields?: Record<string, string>;
  tags?: string[];
  source?: string;
}

export interface UpdateLeadRequest {
  companyName?: string;
  name?: string;
  email?: string;
  platform?: string;
  handle?: string;
  followers?: number;
  niche?: string;
  location?: string;
  description?: string;
  profileUrl?: string;
  customFields?: Record<string, string>;
  status?: LeadStatus;
  leadScore?: number;
  tags?: string[];
}

export interface LeadFilters {
  search?: string;
  leadType?: LeadType;
  status?: LeadStatus;
  platform?: string;
  niche?: string;
  minScore?: number;
  tags?: string[];
}

// === OUTREACH - CAMPAIGNS ===
export type CampaignMode = 'single_template' | 'ai_personalized';
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'paused' | 'completed';
export type EmailStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed';

export interface Campaign {
  id: string;
  name: string;
  mode: CampaignMode;
  targetLeadType: LeadType;
  subjectTemplate: string | null;
  bodyTemplate: string | null;
  campaignGoal: string | null;
  tone: string | null;
  callToAction: string | null;
  status: CampaignStatus;
  settings: {
    trackOpens?: boolean;
    trackClicks?: boolean;
    dailyLimit?: number;
    includeUnsubscribeLink?: boolean;
  };
  availableVariables: string[];
  stats: {
    totalEmails?: number;
    sent?: number;
    delivered?: number;
    opened?: number;
    clicked?: number;
    bounced?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateCampaignRequest {
  name: string;
  mode: CampaignMode;
  targetLeadType: LeadType;
  // For single_template mode
  subjectTemplate?: string;
  bodyTemplate?: string;
  // For ai_personalized mode
  campaignGoal?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'bold';
  callToAction?: string;
  // Settings
  trackOpens?: boolean;
  trackClicks?: boolean;
  dailyLimit?: number;
  includeUnsubscribeLink?: boolean;
}

export interface UpdateCampaignRequest {
  name?: string;
  subjectTemplate?: string;
  bodyTemplate?: string;
  campaignGoal?: string;
  tone?: 'professional' | 'casual' | 'friendly' | 'bold';
  callToAction?: string;
  status?: CampaignStatus;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

export interface PreviewEmailRequest {
  leadId: string;
}

export interface EmailPreview {
  subject: string;
  body: string;
  leadName: string;
  variables: Record<string, string>;
}

export interface CampaignEmail {
  id: string;
  leadId: string;
  subject: string;
  body: string;
  status: EmailStatus;
  sentAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  createdAt: string;
  leadName?: string;
  leadEmail?: string;
}

export interface CampaignStats {
  totalEmails: number;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

// Template variables
export const PERSON_VARIABLES = [
  '{{name}}', '{{email}}', '{{platform}}', '{{handle}}',
  '{{followers}}', '{{niche}}', '{{location}}', '{{profileUrl}}',
] as const;

export const COMPANY_VARIABLES = [
  '{{companyName}}', '{{email}}', '{{website}}',
  '{{industry}}', '{{companySize}}', '{{location}}',
] as const;

export const STARTUP_VARIABLES = [
  '{{myCompany}}', '{{myProduct}}', '{{myIndustry}}',
  '{{myFounder}}', '{{myWebsite}}',
] as const;

// === API RESPONSE ===
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

// === ADMIN USER MANAGEMENT ===
export type UserStatus = 'active' | 'suspended';

/**
 * Pilot usage stats - reflects actual Redis-based usage tracking
 */
export interface PilotUsage {
  agentRequestsUsed: number;
  agentRequestsLimit: number;
  apiKeysUsed: number;
  webhooksUsed: number;
  leadsUsed: number;
  campaignsUsed: number;
  resetsAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  authProvider: string | null;
  onboardingCompleted: boolean;
  startupId: string | null;
  startupName: string | null;
  status: UserStatus;
  suspendedReason: string | null;
  adminNotes: string | null;
  pilotUsage: PilotUsage;
  createdAt: string;
  updatedAt: string;
  lastActiveAt: string | null;
}

export interface AdminUserListQuery {
  search?: string;
  status?: UserStatus | 'all';
  role?: 'user' | 'admin';
  onboardingCompleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'name' | 'email';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAdminUserRequest {
  email: string;
  name: string;
  role?: 'user' | 'admin';
}

export interface UpdateAdminUserRequest {
  name?: string;
  role?: 'user' | 'admin';
  status?: UserStatus;
  adminNotes?: string;
}

export interface ResetUsageRequest {
  type?: 'agentRequests' | 'all';
}

export interface BulkActionRequest {
  userIds: string[];
}

export interface BulkSuspendRequest extends BulkActionRequest {
  reason?: string;
}

export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  adminUsers: number;
  usersThisMonth: number;
  onboardedUsers: number;
}

/**
 * Pilot limits - these are code-defined, not configurable per user
 */
export const PILOT_LIMITS = {
  agentRequests: { limit: 3, period: 'month' },
  apiKeys: { limit: 1, period: 'total' },
  webhooks: { limit: 1, period: 'total' },
  leads: { limit: 50, period: 'total' },
  campaigns: { limit: 5, period: 'total' },
  emailsPerDay: { limit: 50, period: 'day' },
} as const;
