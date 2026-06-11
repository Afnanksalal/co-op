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
}

export interface ModelSettingsUpdate extends ModelSettings {
  openaiApiKey?: string | null;
}

export interface DesktopState {
  installId: string;
  activation: ActivationState | null;
  modelSettings: ModelSettings;
  workflowRuns: WorkflowRun[];
  isUsable: boolean;
}

export interface ActivateLicenseRequest {
  cloudBaseUrl?: string;
  email: string;
  licenseKey: string;
  deviceName?: string;
}

export interface WorkflowRun {
  id: string;
  workflowType: string;
  objective: string;
  provider: string;
  status: string;
  steps: string[];
  output: string | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface WorkflowRequest {
  workflowType: string;
  objective: string;
}

const previewState: DesktopState = {
  installId: 'web-preview',
  activation: null,
  isUsable: false,
  workflowRuns: [],
  modelSettings: {
    provider: 'ollama',
    ollamaBaseUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.1',
    openaiBaseUrl: 'https://api.openai.com/v1',
    openaiModel: 'gpt-4.1-mini',
    openaiApiKeySaved: false,
    councilMode: 'review_only',
    maxRunTokens: 12000,
  },
};

export function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__,
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
  if (!isTauriRuntime()) return previewState;
  return invokeDesktop<DesktopState>('clear_activation');
}

export async function saveModelSettings(settings: ModelSettingsUpdate): Promise<DesktopState> {
  if (!isTauriRuntime()) {
    return { ...previewState, modelSettings: settings };
  }
  return invokeDesktop<DesktopState>('save_model_settings', { settings });
}

export async function runBusinessWorkflow(request: WorkflowRequest): Promise<WorkflowRun> {
  if (!isTauriRuntime()) {
    throw new Error('Business workflows run inside Co-Op Desktop because they use local models and local state.');
  }
  return invokeDesktop<WorkflowRun>('run_business_workflow', { request });
}

async function invokeDesktop<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}
