export interface ActivationState {
  customerEmail: string;
  plan: string;
  status: string;
  expiresAt: string | null;
  features: string[];
  offlineGraceEndsAt: string;
  lastHeartbeatAt: string;
  cloudBaseUrl: string;
}

export interface ModelSettings {
  provider: string;
  ollamaBaseUrl: string;
  ollamaModel: string;
  openaiBaseUrl: string;
  openaiModel: string;
  openaiApiKeySaved: boolean;
  councilMode: string;
  maxRunTokens: number;
  researchProvider: string;
  firecrawlBaseUrl: string;
  firecrawlApiKeySaved: boolean;
  emailProvider: string;
  emailApiKeySaved: boolean;
  emailFrom: string;
  emailFromName: string;
}

export interface ModelSettingsUpdate extends ModelSettings {
  openaiApiKey?: string | null;
  firecrawlApiKey?: string | null;
  emailApiKey?: string | null;
}

export interface StartupProfile {
  founderName: string;
  founderRole: string;
  companyName: string;
  tagline: string;
  website: string;
  description: string;
  stage: string;
  industry: string;
  sector: string;
  location: string;
  country: string;
  city: string;
  operatingRegions: string;
  teamSize: string;
  cofounderCount: number | null;
  targetCustomers: string;
  problem: string;
  solution: string;
  businessModel: string;
  revenueModel: string;
  isRevenue: string;
  monthlyRevenue: number | null;
  fundingStage: string;
  totalRaised: number | null;
  traction: string;
  competitiveAdvantage: string;
  goals: string;
  foundedYear: number | null;
  launchDate: string;
  updatedAt: string;
  onboardingCompletedAt: string | null;
}

export interface ChatMessageRecord {
  id: string;
  role: string;
  content: string;
  agentType: string | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  agentType: string;
  messages: ChatMessageRecord[];
  a2aEnabled: boolean;
  ragEnabled: boolean;
  researchEnabled: boolean;
  councilMode: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  vector: number[];
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  content: string;
  chunkCount: number;
  chunks: KnowledgeChunk[];
  createdAt: string;
}

export interface SearchResult {
  documentId: string;
  chunkId: string;
  title: string;
  source: string;
  content: string;
  score: number;
}

export interface KnowledgeGraphNode {
  id: string;
  label: string;
  nodeType: string;
  summary: string;
}

export interface KnowledgeGraphEdge {
  id: string;
  source: string;
  target: string;
  relationship: string;
  weight: number;
}

export interface KnowledgeGraphSnapshot {
  generatedAt: string;
  nodes: KnowledgeGraphNode[];
  edges: KnowledgeGraphEdge[];
}

export interface ResearchSource {
  title: string;
  url: string;
  description: string;
  content: string;
}

export interface ResearchRun {
  id: string;
  query: string;
  provider: string;
  summary: string;
  sources: ResearchSource[];
  createdAt: string;
}

export interface Lead {
  id: string;
  leadType: string;
  name: string;
  companyName: string;
  email: string;
  website: string;
  profileUrl: string;
  platform: string;
  niche: string;
  location: string;
  description: string;
  leadScore: number;
  status: string;
  source: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  mode: string;
  targetLeadType: string;
  subjectTemplate: string;
  bodyTemplate: string;
  campaignGoal: string;
  tone: string;
  callToAction: string;
  status: string;
  createdAt: string;
}

export interface CampaignEmail {
  id: string;
  campaignId: string;
  leadId: string;
  to: string;
  subject: string;
  body: string;
  status: string;
  providerMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface Investor {
  id: string;
  name: string;
  firm: string;
  stage: string;
  sectors: string[];
  geography: string;
  ticketSize: string;
  notes: string;
}

export interface Alert {
  id: string;
  name: string;
  query: string;
  cadence: string;
  enabled: boolean;
  lastResult: string | null;
  createdAt: string;
}

export interface PitchDeckAnalysis {
  id: string;
  title: string;
  deckNotes: string;
  sourceFileName: string | null;
  slideCount: number;
  score: number;
  analysis: string;
  createdAt: string;
}

export interface CapTableScenario {
  id: string;
  name: string;
  founderOwnershipPercent: number;
  investorOwnershipPercent: number;
  optionPoolPercent: number;
  postMoneyValuation: number;
  notes: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  title: string;
  content: string;
  source: string;
  createdAt: string;
}

export interface IntegrationEndpoint {
  id: string;
  name: string;
  kind: string;
  baseUrl: string;
  enabled: boolean;
  createdAt: string;
}

export interface WorkflowTraceEvent {
  id: string;
  stage: string;
  label: string;
  status: string;
  detail: string;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowType: string;
  objective: string;
  provider: string;
  status: string;
  steps: string[];
  trace: WorkflowTraceEvent[];
  riskLevel: string;
  approvalRequired: boolean;
  output: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface DesktopState {
  installId: string;
  activation: ActivationState | null;
  modelSettings: ModelSettings;
  workflowRuns: WorkflowRun[];
  workspace: StartupProfile;
  chatSessions: ChatSession[];
  documents: KnowledgeDocument[];
  researchRuns: ResearchRun[];
  leads: Lead[];
  campaigns: Campaign[];
  campaignEmails: CampaignEmail[];
  investors: Investor[];
  alerts: Alert[];
  pitchDecks: PitchDeckAnalysis[];
  capTables: CapTableScenario[];
  bookmarks: Bookmark[];
  integrations: IntegrationEndpoint[];
  isUsable: boolean;
}

export interface ActivateLicenseRequest {
  licenseKey: string;
}

export interface WorkflowRequest {
  workflowType: string;
  objective: string;
}

export interface ChatRequest {
  sessionId?: string | null;
  agentType: string;
  message: string;
  a2aEnabled: boolean;
  ragEnabled: boolean;
  researchEnabled: boolean;
  councilMode: string;
}

export interface DocumentRequest {
  title: string;
  source: string;
  content: string;
}

export interface SearchRequest {
  query: string;
  limit?: number;
}

export interface ResearchRequest {
  query: string;
  researchType?: string;
  depth?: string;
  saveToRag: boolean;
}

export interface LeadRequest {
  leadType: string;
  name: string;
  companyName: string;
  email: string;
  website: string;
  profileUrl: string;
  platform: string;
  niche: string;
  location: string;
  description: string;
  leadScore: number;
  status: string;
  source: string;
}

export interface DiscoverLeadsRequest {
  query: string;
  leadType: string;
  maxLeads: number;
}

export interface CampaignRequest {
  name: string;
  mode: string;
  targetLeadType: string;
  subjectTemplate: string;
  bodyTemplate: string;
  campaignGoal: string;
  tone: string;
  callToAction: string;
}

export interface CampaignEmailRequest {
  campaignId: string;
}

export interface AlertRequest {
  name: string;
  query: string;
  cadence: string;
  enabled: boolean;
}

export interface PitchDeckRequest {
  title: string;
  deckNotes: string;
  fileName?: string | null;
  fileMimeType?: string | null;
  fileDataBase64?: string | null;
}

export interface CapTableRequest {
  name: string;
  founderOwnershipPercent: number;
  investorOwnershipPercent: number;
  optionPoolPercent: number;
  postMoneyValuation: number;
  notes: string;
}

export interface BookmarkRequest {
  title: string;
  content: string;
  source: string;
}

export interface IntegrationRequest {
  name: string;
  kind: string;
  baseUrl: string;
  enabled: boolean;
}

export interface BusinessToolResult {
  id: string;
  toolType: string;
  title: string;
  output: string;
  createdAt: string;
}
