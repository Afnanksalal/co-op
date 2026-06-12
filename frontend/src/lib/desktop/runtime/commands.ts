'use client';

import { previewState } from './preview-state';
import type {
  ActivateLicenseRequest,
  AlertRequest,
  BookmarkRequest,
  BusinessToolResult,
  CampaignEmailRequest,
  CampaignRequest,
  CapTableRequest,
  ChatRequest,
  DesktopState,
  DiscoverLeadsRequest,
  DocumentRequest,
  IntegrationRequest,
  KnowledgeGraphSnapshot,
  LeadRequest,
  ModelSettingsUpdate,
  PitchDeckRequest,
  ResearchRequest,
  ResearchRun,
  SearchRequest,
  SearchResult,
  StartupProfile,
  WorkflowRequest,
  WorkflowRun,
} from './types';

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

export async function refreshLicense(): Promise<DesktopState> {
  if (!isTauriRuntime()) {
    throw new Error('License refresh is only available inside Co-Op Desktop.');
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
