import type {
  DesktopState,
  KnowledgeDocument,
  KnowledgeGraphSnapshot,
  Lead,
  StartupProfile,
} from '@/lib/desktop/runtime';
import type { View } from './shell-types';
import {
  memoryTypeLabels,
  optionLabels,
  providerLabels,
  reviewModeLabels,
  roleLabels,
  runStatusLabels,
} from './constants';

export function leadName(lead: Lead): string {
  return lead.name || lead.companyName || lead.website || 'Untitled lead';
}

export function workspaceCompletion(profile: StartupProfile): number {
  const fields = [
    profile.founderName,
    profile.companyName,
    profile.tagline,
    profile.website,
    profile.description,
    profile.industry,
    profile.sector,
    profile.targetCustomers,
    profile.problem,
    profile.solution,
    profile.businessModel,
    profile.revenueModel,
    profile.traction,
    profile.competitiveAdvantage,
    profile.goals,
  ];
  const filled = fields.filter((value) => value.trim().length > 2).length;
  return Math.round((filled / fields.length) * 100);
}

export function onboardingRequired(profile: StartupProfile): boolean {
  return !profile.onboardingCompletedAt && workspaceCompletion(profile) < 70;
}

export function webSearchReady(state: DesktopState): boolean {
  return (
    state.modelSettings.researchProvider === 'firecrawl' && state.modelSettings.firecrawlApiKeySaved
  );
}

export function nextViewForState(
  next: DesktopState,
  currentView: View,
  runtimeAvailable: boolean
): View | null {
  if (!runtimeAvailable) return null;
  if (!next.activation) return currentView === 'activation' ? null : 'activation';
  if (
    next.isUsable &&
    onboardingRequired(next.workspace) &&
    currentView !== 'settings' &&
    currentView !== 'onboarding'
  ) {
    return 'onboarding';
  }
  return null;
}

export function numberToInput(value: number | null): string {
  return value === null || Number.isNaN(value) ? '' : String(value);
}

export function optionalNumberFromInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export function optionalIntegerFromInput(value: string): number | null {
  const parsed = optionalNumberFromInput(value);
  return parsed === null ? null : Math.trunc(parsed);
}

export function labelOption(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return (
    optionLabels[trimmed] ??
    trimmed.replaceAll('_', ' ').replace(/\b\w/g, (match) => match.toUpperCase())
  );
}

export function formatProfileUpdated(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.getFullYear() <= 1970) return 'Not saved yet';
  return parsed.toLocaleDateString();
}

export function successToastText(value: string): string {
  const text = value.trim().replace(/\.$/, '');
  if (!text) return '';

  const normalized = text.toLowerCase();
  if (normalized === 'response saved') return '';
  if (normalized.includes('license refreshed')) return 'License updated';
  if (normalized.includes('activation removed')) return 'Activation removed';
  if (normalized.includes('activation saved')) return 'Activated';
  if (normalized.includes('prospects found')) return 'Prospects added';
  if (normalized.includes('email drafts generated')) return 'Drafts ready';
  if (normalized.includes('plan needs attention')) return 'Needs review';
  if (normalized.includes('plan completed')) return 'Plan ready';
  if (normalized.includes('research completed')) return 'Research ready';
  if (normalized.includes('money check completed')) return 'Check ready';
  if (normalized.includes('pitch review')) return 'Review ready';
  if (normalized.includes('alert refreshed')) return 'Alert checked';
  if (normalized.includes('saved')) return 'Saved';

  return text;
}

export function advisorDisplay(value: string): string {
  return roleLabels[value] ?? labelOption(value);
}

export function reviewModeDisplay(value: string): string {
  return reviewModeLabels[value] ?? labelOption(value);
}

export function providerDisplay(value: string): string {
  return providerLabels[value] ?? labelOption(value);
}

export function researchProviderDisplay(value: string): string {
  const labels: Record<string, string> = {
    firecrawl: 'Web search',
    llm: 'Unsourced report',
  };
  return labels[value] ?? labelOption(value);
}

export function runStatusDisplay(value: string): string {
  return runStatusLabels[value] ?? labelOption(value);
}

export function riskDisplay(value: string): string {
  if (!value || value === 'normal') return 'Normal sensitivity';
  if (value === 'elevated') return 'Sensitive';
  if (value === 'high') return 'High sensitivity';
  return labelOption(value);
}

export function traceStageDisplay(value: string): string {
  const labels: Record<string, string> = {
    intake: 'Start',
    context: 'Context',
    routing: 'Assistant',
    model: 'Work',
    guardrail: 'Review',
    checkpoint: 'Saved',
    step: 'Step',
  };
  return labels[value] ?? labelOption(value);
}

export function memoryTypeDisplay(value: string): string {
  return memoryTypeLabels[value] ?? labelOption(value);
}

export function memoryRelationshipDisplay(value: string): string {
  const labels: Record<string, string> = {
    has_knowledge: 'uses',
    monitors: 'tracks',
    targets: 'targets',
    runs_campaign: 'runs',
    contacts: 'contacts',
    executed: 'created',
    remembers: 'remembers',
    founded_by: 'founded by',
    at_stage: 'stage',
    operates_in: 'market',
    uses_model: 'uses',
    monetizes_with: 'revenue',
    funded_by: 'funding',
    serves: 'serves',
    solves_problem: 'solves',
    offers_solution: 'offers',
    defended_by: 'advantage',
    operates_in_region: 'region',
  };
  return labels[value] ?? value.replaceAll('_', ' ');
}

export function graphLabel(graph: KnowledgeGraphSnapshot | null, id: string): string {
  return graph?.nodes.find((node) => node.id === id)?.label ?? id;
}

export function knowledgeChunkCount(document: KnowledgeDocument): number {
  return document.chunkCount || document.chunks.length;
}

export function titleForView(view: View): string {
  if (view === 'dashboard') return 'Today';
  if (view === 'onboarding') return 'Welcome';
  if (view === 'activation') return 'License';
  if (['workspace', 'rag', 'memory', 'research'].includes(view)) return 'Company';
  if (view === 'chat') return 'Ask';
  if (view === 'outreach') return 'Customers';
  if (view === 'tools') return 'Money';
  if (view === 'settings') return 'Settings';
  return 'Plans';
}

export function subtitleForView(view: View, state: DesktopState | null): string {
  if (!state) return 'Loading Co-Op';
  if (view === 'onboarding') return 'Three steps before the first plan';
  if (view === 'activation') return 'License check for this computer';
  if (view === 'settings') return 'Assistant, web sources, email, and local connections';
  if (['workspace', 'rag', 'memory', 'research'].includes(view)) {
    return 'Profile, files, memory, and research for this business';
  }
  if (view === 'history') return 'Plans, decisions, risks, and next steps';
  if (view === 'chat') return 'Ask questions using your private business context';
  if (view === 'outreach') return 'Prospects, outreach plans, and email drafts';
  if (view === 'tools') return 'Runway, pitch reviews, ownership, and investors';
  if (state.workspace.companyName.trim()) return state.workspace.companyName;
  return 'Private business workspace';
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Unsupported file reader result.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('File read failed.'));
    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  const parts = trimmed.split('@');
  return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.');
}
