'use client';

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

const emptyWorkspace: StartupProfile = {
  founderName: '',
  founderRole: 'founder',
  companyName: '',
  tagline: '',
  website: '',
  description: '',
  stage: 'idea',
  industry: '',
  sector: 'other',
  location: '',
  country: '',
  city: '',
  operatingRegions: '',
  teamSize: '',
  cofounderCount: null,
  targetCustomers: '',
  problem: '',
  solution: '',
  businessModel: '',
  revenueModel: 'not_yet',
  isRevenue: 'pre_revenue',
  monthlyRevenue: null,
  fundingStage: 'bootstrapped',
  totalRaised: null,
  traction: '',
  competitiveAdvantage: '',
  goals: '',
  foundedYear: null,
  launchDate: '',
  updatedAt: new Date(0).toISOString(),
};

const previewState: DesktopState = {
  installId: 'web-preview',
  activation: null,
  isUsable: false,
  workflowRuns: [],
  workspace: emptyWorkspace,
  chatSessions: [],
  documents: [],
  researchRuns: [],
  leads: [],
  campaigns: [],
  campaignEmails: [],
  investors: [],
  alerts: [],
  pitchDecks: [],
  capTables: [],
  bookmarks: [],
  integrations: [],
  modelSettings: {
    provider: 'ollama',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4.1-mini',
    openaiApiKeySaved: false,
    councilMode: 'review_only',
    maxRunTokens: 12000,
    researchProvider: 'llm',
    firecrawlBaseUrl: 'https://api.firecrawl.dev',
    firecrawlApiKeySaved: false,
    emailProvider: 'none',
    emailApiKeySaved: false,
    emailFrom: '',
    emailFromName: '',
  },
};

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__
  );
}

export async function getActivationState(): Promise<DesktopState> {
  if (!isTauriRuntime()) return previewState;
  return invokeDesktop<DesktopState>('get_activation_state');
}

export async function activateLicense(request: ActivateLicenseRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) {
    throw new Error('License activation must be completed inside Co-Op Desktop.');
  }
  return invokeDesktop<DesktopState>('activate_license', { request });
}

export async function heartbeatLicense(): Promise<DesktopState> {
  if (!isTauriRuntime()) {
    throw new Error('License heartbeat is only available inside Co-Op Desktop.');
  }
  return invokeDesktop<DesktopState>('heartbeat_license');
}

export async function clearActivation(): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Local activation');
  return invokeDesktop<DesktopState>('clear_activation');
}

export async function saveModelSettings(settings: ModelSettingsUpdate): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Model settings');
  return invokeDesktop<DesktopState>('save_model_settings', { settings });
}

export async function saveWorkspaceProfile(profile: StartupProfile): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Workspace profile');
  return invokeDesktop<DesktopState>('save_workspace_profile', { profile });
}

export async function runBusinessWorkflow(request: WorkflowRequest): Promise<WorkflowRun> {
  if (!isTauriRuntime()) {
    throw new Error(
      'Business workflows run inside Co-Op Desktop because they use local models and local state.'
    );
  }
  return invokeDesktop<WorkflowRun>('run_business_workflow', { request });
}

export async function runAgentChat(request: ChatRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throw new Error('Agent chat runs inside Co-Op Desktop.');
  return invokeDesktop<DesktopState>('run_agent_chat', { request });
}

export async function addKnowledgeDocument(request: DocumentRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Knowledge documents');
  return invokeDesktop<DesktopState>('add_knowledge_document', { request });
}

export async function searchKnowledge(request: SearchRequest): Promise<SearchResult[]> {
  if (!isTauriRuntime()) throwDesktopOnly('Knowledge search');
  return invokeDesktop<SearchResult[]>('search_knowledge', { request });
}

export async function getKnowledgeGraph(): Promise<KnowledgeGraphSnapshot> {
  if (!isTauriRuntime()) {
    return {
      generatedAt: new Date(0).toISOString(),
      nodes: [],
      edges: [],
    };
  }
  return invokeDesktop<KnowledgeGraphSnapshot>('get_knowledge_graph');
}

export async function runResearchQuery(request: ResearchRequest): Promise<ResearchRun> {
  if (!isTauriRuntime()) throw new Error('Research runs inside Co-Op Desktop.');
  return invokeDesktop<ResearchRun>('run_research_query', { request });
}

export async function createLead(request: LeadRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Lead management');
  return invokeDesktop<DesktopState>('create_lead', { request });
}

export async function discoverLeads(request: DiscoverLeadsRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throw new Error('Lead discovery runs inside Co-Op Desktop.');
  return invokeDesktop<DesktopState>('discover_leads', { request });
}

export async function createCampaign(request: CampaignRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Campaign management');
  return invokeDesktop<DesktopState>('create_campaign', { request });
}

export async function generateCampaignEmails(request: CampaignEmailRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throw new Error('Email generation runs inside Co-Op Desktop.');
  return invokeDesktop<DesktopState>('generate_campaign_emails', { request });
}

export async function sendCampaignEmails(request: CampaignEmailRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throw new Error('Campaign sending runs inside Co-Op Desktop.');
  return invokeDesktop<DesktopState>('send_campaign_emails', { request });
}

export async function saveAlert(request: AlertRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Alerts');
  return invokeDesktop<DesktopState>('save_alert', { request });
}

export async function runAlertNow(alertId: string): Promise<DesktopState> {
  if (!isTauriRuntime()) throw new Error('Alerts run inside Co-Op Desktop.');
  return invokeDesktop<DesktopState>('run_alert_now', { alertId });
}

export async function analyzePitchDeck(request: PitchDeckRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throw new Error('Pitch analysis runs inside Co-Op Desktop.');
  return invokeDesktop<DesktopState>('analyze_pitch_deck', { request });
}

export async function saveCapTable(request: CapTableRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Cap tables');
  return invokeDesktop<DesktopState>('save_cap_table', { request });
}

export async function runCalculator(
  toolType: string,
  values: number[]
): Promise<BusinessToolResult> {
  if (!isTauriRuntime()) throw new Error('Calculators run inside Co-Op Desktop.');
  return invokeDesktop<BusinessToolResult>('run_calculator', { toolType, values });
}

export async function saveBookmark(request: BookmarkRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Bookmarks');
  return invokeDesktop<DesktopState>('save_bookmark', { request });
}

export async function saveIntegration(request: IntegrationRequest): Promise<DesktopState> {
  if (!isTauriRuntime()) throwDesktopOnly('Integrations');
  return invokeDesktop<DesktopState>('save_integration', { request });
}

function throwDesktopOnly(feature: string): never {
  throw new Error(`Co-Op Desktop is required for ${feature.toLowerCase()}.`);
}

async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}
