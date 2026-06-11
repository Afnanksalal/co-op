'use client';

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookBookmark,
  Brain,
  Briefcase,
  CaretLeft,
  CaretRight,
  Calculator,
  ChartBar,
  ChartLine,
  ChatsCircle,
  CircleNotch,
  Database,
  Diamond,
  EnvelopeSimple,
  FlowArrow,
  HardDrives,
  House,
  Key,
  Lightning,
  List,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plugs,
  Robot,
  ShieldCheck,
  Sparkle,
  UserCircle,
  UsersThree,
  Warning,
  X,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  activateLicense,
  addKnowledgeDocument,
  analyzePitchDeck,
  clearActivation,
  createCampaign,
  createLead,
  discoverLeads,
  generateCampaignEmails,
  getActivationState,
  getKnowledgeGraph,
  heartbeatLicense,
  isTauriRuntime,
  runAgentChat,
  runAlertNow,
  runBusinessWorkflow,
  runCalculator,
  runResearchQuery,
  saveAlert,
  saveCapTable,
  saveIntegration,
  saveModelSettings,
  saveWorkspaceProfile,
  searchKnowledge,
  sendCampaignEmails,
  type BusinessToolResult,
  type Campaign,
  type DesktopState,
  type KnowledgeGraphSnapshot,
  type KnowledgeDocument,
  type Lead,
  type ModelSettings,
  type ModelSettingsUpdate,
  type SearchResult,
  type StartupProfile,
  type WorkflowRun,
} from '@/lib/desktop/runtime';

type View =
  | 'dashboard'
  | 'activation'
  | 'workspace'
  | 'chat'
  | 'rag'
  | 'research'
  | 'outreach'
  | 'tools'
  | 'settings'
  | 'history';
type NavItem = { id: View; label: string; icon: typeof ShieldCheck };

const blankLead = {
  leadType: 'company',
  name: '',
  companyName: '',
  email: '',
  website: '',
  profileUrl: '',
  platform: '',
  niche: '',
  location: '',
  description: '',
  leadScore: 50,
  status: 'new',
  source: 'manual',
};

const blankCampaign = {
  name: '',
  mode: 'ai_personalized',
  targetLeadType: 'company',
  subjectTemplate: 'Quick idea for {{company}}',
  bodyTemplate:
    'Hi {{name}},\n\nI noticed {{company}} and wanted to share a specific idea.\n\nBest,',
  campaignGoal: '',
  tone: 'professional',
  callToAction: 'Book a short call',
};

const founderRoles = ['founder', 'cofounder', 'ceo', 'cto', 'coo', 'cfo', 'cpo'];
const startupStages = ['idea', 'prototype', 'mvp', 'beta', 'launched', 'growth', 'scale'];
const teamSizes = ['1-5', '6-20', '21-50', '51-200', '200+'];
const businessModels = [
  'b2b',
  'b2c',
  'b2b2c',
  'marketplace',
  'd2c',
  'enterprise',
  'smb',
  'consumer',
  'platform',
  'api',
  'other',
];
const revenueModels = [
  'subscription',
  'transaction_fee',
  'freemium',
  'usage_based',
  'licensing',
  'advertising',
  'commission',
  'one_time',
  'hybrid',
  'not_yet',
];
const fundingStages = [
  'bootstrapped',
  'pre_seed',
  'seed',
  'series_a',
  'series_b',
  'series_c_plus',
  'profitable',
];
const revenueStatuses = ['pre_revenue', 'no', 'yes'];
const sectors = [
  'saas',
  'ai_ml',
  'developer_tools',
  'cybersecurity',
  'cloud_infrastructure',
  'data_analytics',
  'fintech',
  'payments',
  'healthtech',
  'ecommerce',
  'marketplace',
  'climate_tech',
  'edtech',
  'hrtech',
  'legaltech',
  'logistics',
  'hardware',
  'other',
];
const optionLabels: Record<string, string> = {
  ai_ml: 'AI / ML',
  b2b: 'B2B',
  b2c: 'B2C',
  b2b2c: 'B2B2C',
  d2c: 'D2C',
  pre_seed: 'Pre-seed',
  series_a: 'Series A',
  series_b: 'Series B',
  series_c_plus: 'Series C+',
  pre_revenue: 'Pre-revenue',
  not_yet: 'Not yet',
  transaction_fee: 'Transaction fee',
  usage_based: 'Usage based',
  one_time: 'One-time',
  developer_tools: 'Developer tools',
  cloud_infrastructure: 'Cloud infrastructure',
  data_analytics: 'Data analytics',
  climate_tech: 'Climate tech',
};

const roleLabels: Record<string, string> = {
  operations: 'Operations',
  legal: 'Legal',
  finance: 'Finance',
  investor: 'Investor',
  competitor: 'Market',
  sales: 'Sales',
  strategy: 'Strategy',
};

const reviewModeLabels: Record<string, string> = {
  off: 'No extra review',
  review_only: 'Standard review',
  high_risk_only: 'Sensitive work only',
  full_council: 'Full review',
};

const providerLabels: Record<string, string> = {
  ollama: 'Local AI',
  openai_compatible: 'Private AI key',
};

const runStatusLabels: Record<string, string> = {
  completed: 'Done',
  running: 'Running',
  failed: 'Needs attention',
};

const memoryTypeLabels: Record<string, string> = {
  company: 'Company',
  founder: 'Founder',
  stage: 'Stage',
  sector: 'Market',
  business_model: 'Business model',
  revenue_model: 'Revenue model',
  funding: 'Funding',
  customer: 'Customer',
  problem: 'Problem',
  solution: 'Solution',
  advantage: 'Advantage',
  region: 'Region',
  document: 'File',
  research: 'Research',
  lead: 'Lead',
  campaign: 'Campaign',
  workflow: 'Work',
};

export function LocalCoOpShell() {
  const [view, setView] = useState<View>('dashboard');
  const [state, setState] = useState<DesktopState | null>(null);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [workspace, setWorkspace] = useState<StartupProfile | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const runtimeAvailable = isTauriRuntime();
  const lockedView =
    runtimeAvailable &&
    state !== null &&
    !state.isUsable &&
    view !== 'activation' &&
    view !== 'settings' &&
    view !== 'dashboard';

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('coop-desktop-shell');
    return () => {
      document.documentElement.classList.remove('coop-desktop-shell');
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  async function refresh() {
    setError('');
    try {
      const next = await getActivationState();
      setState(next);
      setSettings(next.modelSettings);
      setWorkspace(next.workspace);
      if (!next.activation && runtimeAvailable) setView('activation');
    } catch (error) {
      setError(errorMessage(error, 'Failed to load Co-Op Desktop'));
    }
  }

  async function runWithState(
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ): Promise<boolean> {
    setBusyAction(label);
    setError('');
    setMessage('');
    try {
      const next = await action();
      setState(next);
      setSettings(next.modelSettings);
      setWorkspace(next.workspace);
      setMessage(success);
      return true;
    } catch (error) {
      setError(errorMessage(error, 'Action failed'));
      return false;
    } finally {
      setBusyAction('');
    }
  }

  const navGroups = useMemo(
    (): { label: string; items: NavItem[] }[] => [
      {
        label: 'Home',
        items: [
          { id: 'dashboard', label: 'Overview', icon: House },
          { id: 'chat', label: 'Ask Co-Op', icon: ChatsCircle },
          { id: 'history', label: 'Work', icon: FlowArrow },
        ],
      },
      {
        label: 'Company',
        items: [
          { id: 'workspace', label: 'Profile', icon: Briefcase },
          { id: 'rag', label: 'Files', icon: HardDrives },
          { id: 'research', label: 'Research', icon: MagnifyingGlass },
          { id: 'outreach', label: 'Outreach', icon: EnvelopeSimple },
        ],
      },
      {
        label: 'Operations',
        items: [
          { id: 'tools', label: 'Tools', icon: Calculator },
          { id: 'settings', label: 'Setup', icon: Plugs },
          { id: 'activation', label: 'License', icon: ShieldCheck },
        ],
      },
    ],
    []
  );

  function openView(nextView: View) {
    setView(nextView);
    setMobileMenuOpen(false);
  }

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <nav
        className={`scrollbar-none flex-1 overflow-y-auto overflow-x-hidden px-3 ${collapsed ? 'py-3' : 'py-5'}`}
      >
        <div className={collapsed ? 'space-y-4' : 'space-y-7'}>
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {!collapsed && (
                <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = view === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`desktop-nav-${id}`}
                      onClick={() => openView(id)}
                      title={collapsed ? label : undefined}
                      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-all ${
                        active
                          ? 'bg-primary/10 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className="h-5 w-5 shrink-0" weight={active ? 'fill' : 'regular'} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      <div className="border-t border-border/40 p-3">
        <div
          className={`rounded-lg border border-border/50 bg-muted/30 p-3 ${collapsed ? 'flex justify-center' : ''}`}
        >
          {collapsed ? (
            <ShieldCheck
              className={`h-5 w-5 ${state?.isUsable ? 'text-green-600 dark:text-green-300' : 'text-amber-600 dark:text-amber-300'}`}
            />
          ) : (
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Badge variant={state?.isUsable ? 'success' : 'warning'}>
                  {state?.isUsable ? 'Licensed' : 'Activation required'}
                </Badge>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Local
                </span>
              </div>
              <p className="mt-2 truncate text-xs text-muted-foreground">
                {state?.activation?.customerEmail ?? state?.installId ?? 'Loading local state'}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation"
        >
          <List className="h-5 w-5" weight="bold" />
        </Button>
        <button
          type="button"
          onClick={() => openView('dashboard')}
          className="font-serif text-lg font-semibold"
        >
          Co-Op
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          disabled={busyAction !== ''}
          aria-label="Refresh"
        >
          <CircleNotch className={`h-5 w-5 ${busyAction ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] max-w-[86vw] flex-col border-r border-border/40 bg-background shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
              <span className="font-serif text-lg font-semibold">Co-Op</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" weight="bold" />
              </Button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-border/40 bg-background transition-[width] duration-300 md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/40 px-4">
          <button
            type="button"
            onClick={() => openView('dashboard')}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Diamond className="h-5 w-5" weight="fill" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 text-left">
                <p className="truncate font-serif text-lg font-semibold tracking-normal">Co-Op</p>
                <p className="truncate text-xs text-muted-foreground">
                  {state?.workspace.companyName || 'Private business workspace'}
                </p>
              </div>
            )}
          </button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <CaretRight className="h-4 w-4" weight="bold" />
            ) : (
              <CaretLeft className="h-4 w-4" weight="bold" />
            )}
          </Button>
        </div>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      <section
        className={`min-h-screen min-w-0 pt-14 transition-[padding] duration-300 md:pt-0 ${sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'}`}
      >
        <header className="sticky top-14 z-30 flex min-h-16 items-center justify-between gap-4 border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur md:top-0 md:px-8">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl font-semibold tracking-normal sm:text-2xl">
              {titleForView(view)}
            </h1>
            <p className="truncate text-xs text-muted-foreground">
              {state?.installId ?? 'Loading local state'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={state?.isUsable ? 'success' : 'warning'}
              className="hidden sm:inline-flex"
            >
              {state?.isUsable ? 'Licensed' : 'Activation required'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={busyAction !== ''}
            >
              Refresh
            </Button>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 sm:px-6 md:px-8 md:py-7">
          {!runtimeAvailable && (
            <Notice
              tone="warning"
              text="This preview can show the interface. Install or run Co-Op Desktop to use local business tools."
            />
          )}
          {error && <Notice tone="error" text={error} />}
          {message && <Notice tone="success" text={message} />}

          {lockedView && <LockedPanel onActivate={() => openView('activation')} />}
          {!lockedView && view === 'dashboard' && state && (
            <DashboardPanel state={state} onNavigate={openView} />
          )}
          {!lockedView && view === 'activation' && (
            <ActivationPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'workspace' && workspace && (
            <WorkspacePanel
              profile={workspace}
              onProfileChange={setWorkspace}
              busyAction={busyAction}
              runWithState={runWithState}
            />
          )}
          {!lockedView && view === 'chat' && state && (
            <ChatPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'rag' && state && (
            <RagPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'research' && state && (
            <ResearchPanel
              state={state}
              busyAction={busyAction}
              refresh={refresh}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
            />
          )}
          {!lockedView && view === 'outreach' && state && (
            <OutreachPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'tools' && state && (
            <ToolsPanel
              state={state}
              busyAction={busyAction}
              runWithState={runWithState}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
            />
          )}
          {!lockedView && view === 'settings' && settings && (
            <SettingsPanel
              settings={settings}
              setSettings={setSettings}
              busyAction={busyAction}
              runWithState={runWithState}
            />
          )}
          {!lockedView && view === 'history' && state && (
            <HistoryPanel
              state={state}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
              busyAction={busyAction}
              refresh={refresh}
            />
          )}
          {!state && <LoadingWorkbench />}
        </div>
      </section>
    </main>
  );
}

function DashboardPanel({
  state,
  onNavigate,
}: {
  state: DesktopState;
  onNavigate: (view: View) => void;
}) {
  const workspaceScore = workspaceCompletion(state.workspace);
  const latestRun = state.workflowRuns[0];
  const latestResearch = state.researchRuns[0];
  const modelName =
    state.modelSettings.provider === 'ollama'
      ? state.modelSettings.ollamaModel
      : state.modelSettings.openaiModel;
  const metrics = [
    {
      label: 'Files',
      value: state.documents.length,
      icon: HardDrives,
      tone: 'text-blue-600 dark:text-blue-300',
      view: 'rag' as const,
    },
    {
      label: 'Leads',
      value: state.leads.length,
      icon: UsersThree,
      tone: 'text-green-600 dark:text-green-300',
      view: 'outreach' as const,
    },
    {
      label: 'Campaigns',
      value: state.campaigns.length,
      icon: EnvelopeSimple,
      tone: 'text-purple-600 dark:text-purple-300',
      view: 'outreach' as const,
    },
    {
      label: 'Work',
      value: state.workflowRuns.length,
      icon: FlowArrow,
      tone: 'text-amber-600 dark:text-amber-300',
      view: 'history' as const,
    },
  ];

  const advisors = [
    {
      label: 'Operations',
      type: 'operations',
      icon: Briefcase,
      text: 'SOPs, execution, hiring, internal systems',
    },
    {
      label: 'Finance',
      type: 'finance',
      icon: ChartLine,
      text: 'Runway, pricing, valuation, unit economics',
    },
    {
      label: 'Risk',
      type: 'legal',
      icon: ShieldCheck,
      text: 'Contracts, risk, compliance, company structure',
    },
    {
      label: 'Sales',
      type: 'sales',
      icon: EnvelopeSimple,
      text: 'Pipeline, outreach, positioning, follow-ups',
    },
  ];
  const actionItems = [
    {
      label: 'Company profile',
      detail: workspaceScore >= 70 ? 'Context ready' : 'Add market, customer, problem, and goals',
      status: workspaceScore >= 70 ? 'ready' : 'attention',
      view: 'workspace' as const,
    },
    {
      label: 'Company files',
      detail:
        state.documents.length > 0
          ? `${state.documents.length} files ready for answers`
          : 'Add docs, notes, policies, or decks',
      status: state.documents.length > 0 ? 'ready' : 'attention',
      view: 'rag' as const,
    },
    {
      label: 'Model routing',
      detail:
        state.modelSettings.provider === 'ollama'
          ? `Local AI: ${modelName}`
          : `Private AI key: ${modelName}`,
      status: 'ready',
      view: 'settings' as const,
    },
    {
      label: 'Outreach pipeline',
      detail:
        state.leads.length > 0
          ? `${state.leads.length} leads, ${state.campaigns.length} campaigns`
          : 'No local leads yet',
      status: state.leads.length > 0 ? 'ready' : 'attention',
      view: 'outreach' as const,
    },
  ];

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="rounded-lg border border-border/50 bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={state.isUsable ? 'success' : 'warning'}>
                  {state.isUsable ? 'Licensed' : 'Activation required'}
                </Badge>
                <Badge variant="outline">{providerDisplay(state.modelSettings.provider)}</Badge>
                <Badge variant="secondary">
                  {reviewModeDisplay(state.modelSettings.councilMode)}
                </Badge>
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-normal">
                {state.workspace.companyName || 'Business command center'}
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OperationalStatus label="Readiness" value={`${workspaceScore}%`} />
                <OperationalStatus label="AI" value={modelName} />
                <OperationalStatus label="Files" value={String(state.documents.length)} />
                <OperationalStatus label="Work" value={String(state.workflowRuns.length)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate('chat')}>
                <Sparkle className="h-4 w-4" weight="fill" />
                Chat
              </Button>
              <Button variant="outline" onClick={() => onNavigate('history')}>
                <FlowArrow className="h-4 w-4" />
                Start work
              </Button>
            </div>
          </div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${workspaceScore}%` }}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border/50 bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <PanelTitle icon={ChartBar} title="Priority queue" compact />
            <Badge variant={workspaceScore >= 70 ? 'success' : 'warning'}>
              {workspaceScore >= 70 ? 'steady' : 'setup'}
            </Badge>
          </div>
          <div className="space-y-2">
            {actionItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.view)}
                className="flex w-full items-center justify-between gap-3 rounded-md border border-border/50 bg-background px-3 py-2 text-left transition-colors hover:bg-muted/40"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{item.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {item.detail}
                  </span>
                </span>
                <Badge variant={item.status === 'ready' ? 'success' : 'warning'}>
                  {item.status}
                </Badge>
              </button>
            ))}
          </div>
        </section>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <button
            key={metric.label}
            type="button"
            onClick={() => onNavigate(metric.view)}
            className="rounded-lg border border-border/50 bg-card p-4 text-left transition-colors hover:border-border hover:bg-muted/30"
          >
            <div className="flex items-center justify-between gap-3">
              <metric.icon className={`h-5 w-5 ${metric.tone}`} />
              <span className="text-2xl font-semibold">{metric.value}</span>
            </div>
            <p className="mt-3 text-xs uppercase tracking-wider text-muted-foreground">
              {metric.label}
            </p>
          </button>
        ))}
      </section>

      <section className="rounded-lg border border-border/50 bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <PanelTitle icon={Brain} title="Advisors" compact />
          <Button variant="ghost" size="sm" onClick={() => onNavigate('chat')}>
            Ask Co-Op
          </Button>
        </div>
        <div className="grid gap-3 lg:grid-cols-4">
          {advisors.map((advisor) => (
            <button
              key={advisor.type}
              type="button"
              onClick={() => onNavigate('chat')}
              className="rounded-md border border-border/50 bg-background p-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center gap-3">
                <advisor.icon className="h-5 w-5 text-muted-foreground" weight="light" />
                <h3 className="font-medium">{advisor.label}</h3>
              </div>
              <p className="mt-3 text-xs leading-5 text-muted-foreground">{advisor.text}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <DashboardActivityCard
          icon={FlowArrow}
          title="Latest work"
          action="All work"
          onAction={() => onNavigate('history')}
        >
          {latestRun ? (
            <RunCard run={latestRun} />
          ) : (
            <EmptyState
              icon={FlowArrow}
              title="No work started"
              text="Start a structured plan when a decision needs owners, risks, and next steps."
              action="Start work"
              onAction={() => onNavigate('history')}
            />
          )}
        </DashboardActivityCard>

        <DashboardActivityCard
          icon={MagnifyingGlass}
          title="Latest research"
          action="Research"
          onAction={() => onNavigate('research')}
        >
          {latestResearch ? (
            <article>
              <div className="flex items-center justify-between gap-3">
                <h3 className="min-w-0 truncate font-medium">{latestResearch.query}</h3>
                <Badge variant="secondary">{latestResearch.provider}</Badge>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {latestResearch.summary}
              </p>
            </article>
          ) : (
            <EmptyState
              icon={MagnifyingGlass}
              title="No research yet"
              text="Run market, competitor, or lead research from local settings."
              action="Start research"
              onAction={() => onNavigate('research')}
            />
          )}
        </DashboardActivityCard>
      </section>
    </div>
  );
}

function OperationalStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/50 bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border/50 bg-background p-4">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function DashboardActivityCard({
  icon: Icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: typeof ShieldCheck;
  title: string;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border/50 bg-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <PanelTitle icon={Icon} title={title} compact />
        <Button variant="ghost" size="sm" onClick={onAction}>
          {action}
        </Button>
      </div>
      {children}
    </section>
  );
}

function LoadingWorkbench() {
  return (
    <div className="space-y-4">
      <div className="h-32 animate-pulse rounded-lg bg-muted/70" />
      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="h-24 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    </div>
  );
}

function LockedPanel({ onActivate }: { onActivate: () => void }) {
  return (
    <section className="mx-auto max-w-3xl rounded-lg border border-border bg-card p-6 text-center shadow-sm">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <ShieldCheck className="h-6 w-6" weight="fill" />
      </div>
      <h2 className="mt-5 font-serif text-2xl font-semibold tracking-normal">
        Activation required
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
        Enter the license key from your Co-Op account center to unlock your private business
        workspace on this machine.
      </p>
      <Button className="mt-6" onClick={onActivate}>
        <Key className="h-4 w-4" weight="bold" />
        Activate Co-Op Desktop
      </Button>
    </section>
  );
}

function ActivationPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState | null;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [licenseKey, setLicenseKey] = useState('');
  return (
    <div className="grid max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState(
            'activate',
            () => activateLicense({ licenseKey }),
            'Activation saved locally.'
          );
        }}
      >
        <PanelTitle icon={Key} title="Activation key" />
        <Field
          label="License key"
          value={licenseKey}
          onChange={setLicenseKey}
          placeholder="COOP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
        />
        <Button
          className="mt-5"
          type="submit"
          disabled={busyAction === 'activate' || !licenseKey.trim()}
        >
          {busyAction === 'activate' ? 'Activating...' : 'Activate'}
        </Button>
      </form>
      <section className="rounded-lg border border-border bg-card p-5">
        <PanelTitle icon={ShieldCheck} title="Entitlement" />
        <Rows
          rows={[
            ['Email', state?.activation?.customerEmail ?? 'Not activated'],
            ['Plan', state?.activation?.plan ?? 'Not activated'],
            ['Status', state?.activation?.status ?? 'Not activated'],
            [
              'Offline grace',
              state?.activation
                ? new Date(state.activation.offlineGraceEndsAt).toLocaleString()
                : 'Not activated',
            ],
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => void runWithState('heartbeat', heartbeatLicense, 'Heartbeat refreshed.')}
            disabled={!state?.activation || busyAction === 'heartbeat'}
          >
            Heartbeat
          </Button>
          <Button
            variant="outline"
            onClick={() => void runWithState('clear', clearActivation, 'Local activation cleared.')}
            disabled={!state?.activation || busyAction === 'clear'}
          >
            Clear
          </Button>
        </div>
      </section>
    </div>
  );
}

function WorkspacePanel({
  profile,
  onProfileChange,
  busyAction,
  runWithState,
}: {
  profile: StartupProfile;
  onProfileChange: (profile: StartupProfile) => void;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const journey = ['idea', 'prototype'].includes(profile.stage) ? 'idea' : 'scale';
  const update = <Key extends keyof StartupProfile>(key: Key, value: StartupProfile[Key]) =>
    onProfileChange({ ...profile, [key]: value });
  const setJourney = (value: string) => {
    update('stage', value === 'idea' ? 'idea' : profile.stage === 'idea' ? 'mvp' : profile.stage);
  };

  return (
    <form
      className="space-y-6 rounded-lg border border-border bg-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void runWithState(
          'workspace',
          () => saveWorkspaceProfile(profile),
          'Workspace saved locally.'
        );
      }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <PanelTitle icon={Briefcase} title="Company onboarding" compact />
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Private business context used by chat, work plans, saved files, outreach, and memory.
          </p>
        </div>
        <SegmentedControl
          value={journey}
          onChange={setJourney}
          options={[
            { id: 'idea', label: 'Idea to startup' },
            { id: 'scale', label: 'Startup to scale' },
          ]}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <section className="space-y-4 border-t border-border pt-5">
            <SectionHeading
              title="Founder and company"
              detail="Identity, category, and core narrative"
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <Field
                label="Founder name"
                value={profile.founderName}
                onChange={(founderName) => update('founderName', founderName)}
              />
              <SelectField
                label="Founder role"
                value={profile.founderRole}
                onChange={(founderRole) => update('founderRole', founderRole)}
                options={founderRoles}
                labels={optionLabels}
              />
              <Field
                label="Company name"
                value={profile.companyName}
                onChange={(companyName) => update('companyName', companyName)}
              />
              <Field
                label="Tagline"
                value={profile.tagline}
                onChange={(tagline) => update('tagline', tagline)}
              />
              <Field
                label="Website"
                value={profile.website}
                onChange={(website) => update('website', website)}
              />
              <SelectField
                label="Stage"
                value={profile.stage}
                onChange={(stage) => update('stage', stage)}
                options={startupStages}
                labels={optionLabels}
              />
            </div>
            <TextArea
              label="Company description"
              value={profile.description}
              onChange={(description) => update('description', description)}
              minHeight="min-h-24"
            />
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionHeading
              title="Market and model"
              detail="How the company earns and where it competes"
            />
            <div className="grid gap-4 lg:grid-cols-3">
              <Field
                label="Industry"
                value={profile.industry}
                onChange={(industry) => update('industry', industry)}
              />
              <SelectField
                label="Market category"
                value={profile.sector}
                onChange={(sector) => update('sector', sector)}
                options={sectors}
                labels={optionLabels}
              />
              <SelectField
                label="Business model"
                value={profile.businessModel}
                onChange={(businessModel) => update('businessModel', businessModel)}
                options={businessModels}
                labels={optionLabels}
              />
              <SelectField
                label="Revenue model"
                value={profile.revenueModel}
                onChange={(revenueModel) => update('revenueModel', revenueModel)}
                options={revenueModels}
                labels={optionLabels}
              />
              <SelectField
                label="Revenue status"
                value={profile.isRevenue}
                onChange={(isRevenue) => update('isRevenue', isRevenue)}
                options={revenueStatuses}
                labels={optionLabels}
              />
              <Field
                label="Target customers"
                value={profile.targetCustomers}
                onChange={(targetCustomers) => update('targetCustomers', targetCustomers)}
              />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <TextArea
                label="Problem"
                value={profile.problem}
                onChange={(problem) => update('problem', problem)}
              />
              <TextArea
                label="Solution"
                value={profile.solution}
                onChange={(solution) => update('solution', solution)}
              />
              <TextArea
                label="Competitive advantage"
                value={profile.competitiveAdvantage}
                onChange={(competitiveAdvantage) =>
                  update('competitiveAdvantage', competitiveAdvantage)
                }
              />
              <TextArea
                label="Goals"
                value={profile.goals}
                onChange={(goals) => update('goals', goals)}
              />
            </div>
          </section>

          <section className="space-y-4 border-t border-border pt-5">
            <SectionHeading
              title="Operating context"
              detail="Team, geography, traction, and funding"
            />
            <div className="grid gap-4 lg:grid-cols-4">
              <SelectField
                label="Team size"
                value={profile.teamSize}
                onChange={(teamSize) => update('teamSize', teamSize)}
                options={teamSizes}
              />
              <Field
                label="Co-founder count"
                type="number"
                value={numberToInput(profile.cofounderCount)}
                onChange={(value) => update('cofounderCount', optionalIntegerFromInput(value))}
              />
              <Field
                label="Founded year"
                type="number"
                value={numberToInput(profile.foundedYear)}
                onChange={(value) => update('foundedYear', optionalIntegerFromInput(value))}
              />
              <Field
                label="Launch date"
                type="date"
                value={profile.launchDate}
                onChange={(launchDate) => update('launchDate', launchDate)}
              />
              <Field
                label="Country"
                value={profile.country}
                onChange={(country) => update('country', country)}
              />
              <Field label="City" value={profile.city} onChange={(city) => update('city', city)} />
              <Field
                label="Location"
                value={profile.location}
                onChange={(location) => update('location', location)}
              />
              <Field
                label="Operating regions"
                value={profile.operatingRegions}
                onChange={(operatingRegions) => update('operatingRegions', operatingRegions)}
              />
              <SelectField
                label="Funding stage"
                value={profile.fundingStage}
                onChange={(fundingStage) => update('fundingStage', fundingStage)}
                options={fundingStages}
                labels={optionLabels}
              />
              <Field
                label="Total raised"
                type="number"
                value={numberToInput(profile.totalRaised)}
                onChange={(value) => update('totalRaised', optionalNumberFromInput(value))}
              />
              <Field
                label="Monthly revenue"
                type="number"
                value={numberToInput(profile.monthlyRevenue)}
                onChange={(value) => update('monthlyRevenue', optionalNumberFromInput(value))}
              />
            </div>
            <TextArea
              label="Traction"
              value={profile.traction}
              onChange={(traction) => update('traction', traction)}
              minHeight="min-h-24"
            />
          </section>
        </div>

        <aside className="h-fit rounded-lg border border-border/50 bg-background p-4">
          <PanelTitle icon={ChartBar} title="Readiness" compact />
          <div className="mt-4">
            <div className="flex items-end justify-between gap-3">
              <span className="text-sm text-muted-foreground">Workspace completion</span>
              <span className="text-2xl font-semibold">{workspaceCompletion(profile)}%</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${workspaceCompletion(profile)}%` }}
              />
            </div>
          </div>
          <Rows
            rows={[
              ['Journey', journey === 'idea' ? 'Idea to startup' : 'Startup to scale'],
              ['Stage', labelOption(profile.stage)],
              ['Sector', labelOption(profile.sector)],
              ['Model', labelOption(profile.businessModel) || '-'],
              ['Updated', new Date(profile.updatedAt).toLocaleDateString()],
            ]}
          />
          <Button className="mt-5 w-full" type="submit" disabled={busyAction === 'workspace'}>
            Save workspace
          </Button>
        </aside>
      </div>
    </form>
  );
}

function ChatPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [agentType, setAgentType] = useState('operations');
  const [sessionId, setSessionId] = useState<string | null>(state.chatSessions[0]?.id ?? null);
  const [message, setMessage] = useState('');
  const [a2aEnabled, setA2aEnabled] = useState(true);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [councilMode, setCouncilMode] = useState(state.modelSettings.councilMode);
  const activeSession =
    state.chatSessions.find((session) => session.id === sessionId) ?? state.chatSessions[0];
  const hasMessages = Boolean(activeSession?.messages.length);
  const suggestions = [
    'Build a 30 day operating plan for my company',
    'Review my current risks and next best actions',
    'Draft a personalized outreach angle for my ICP',
    'Compare pricing options and runway impact',
  ];

  useEffect(() => {
    if (!sessionId && state.chatSessions[0]?.id) setSessionId(state.chatSessions[0].id);
  }, [sessionId, state.chatSessions]);

  function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = message.trim();
    if (!prompt) return;
    void runWithState(
      'chat',
      () =>
        runAgentChat({
          sessionId,
          agentType,
          message: prompt,
          a2aEnabled,
          ragEnabled,
          researchEnabled,
          councilMode,
        }),
      'Response saved.'
    ).then(() => setMessage(''));
  }

  return (
    <div className="grid min-h-[calc(100vh-11rem)] gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-border/50 bg-card p-3">
        <div className="mb-3 flex items-center justify-between gap-2 px-1">
          <div>
            <h2 className="font-serif text-lg font-semibold tracking-normal">Sessions</h2>
            <p className="text-xs text-muted-foreground">
              {state.chatSessions.length} private conversations
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => setSessionId(null)}>
            New
          </Button>
        </div>
        <div className="space-y-2">
          {state.chatSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => setSessionId(session.id)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                activeSession?.id === session.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/50 bg-background hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 truncate text-sm font-medium">
                  {session.title || 'Untitled chat'}
                </h3>
                <Badge variant="secondary">{session.messages.length}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {advisorDisplay(session.agentType)} -{' '}
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {state.chatSessions.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No local chats yet.
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-[calc(100vh-11rem)] flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <div className="border-b border-border/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-muted-foreground" />
                <h2 className="truncate font-serif text-xl font-semibold tracking-normal">
                  {activeSession?.title ?? 'New conversation'}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask for plans, reviews, drafts, risks, or decisions using your private company
                context.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger className="h-9 min-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['operations', 'legal', 'finance', 'investor', 'competitor', 'sales'].map(
                    (option) => (
                      <SelectItem key={option} value={option}>
                        {advisorDisplay(option)}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
              <Select value={councilMode} onValueChange={setCouncilMode}>
                <SelectTrigger className="h-9 min-w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['off', 'review_only', 'high_risk_only', 'full_council'].map((option) => (
                    <SelectItem key={option} value={option}>
                      {reviewModeDisplay(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <TogglePill label="Second look" checked={a2aEnabled} onChange={setA2aEnabled} />
            <TogglePill label="Use company files" checked={ragEnabled} onChange={setRagEnabled} />
            <TogglePill
              label="Use web research"
              checked={researchEnabled}
              onChange={setResearchEnabled}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {hasMessages ? (
            <div className="mx-auto max-w-3xl space-y-5">
              {activeSession?.messages.map((item) => {
                const isUser = item.role === 'user';
                const Icon = isUser ? UserCircle : Robot;
                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <article
                      className={`max-w-[86%] rounded-lg border p-4 ${isUser ? 'border-primary/20 bg-primary/10' : 'border-border/50 bg-background'}`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={isUser ? 'secondary' : 'success'}>
                          {isUser ? 'You' : advisorDisplay(item.agentType || 'operations')}
                        </Badge>
                        {!isUser && a2aEnabled && (
                          <span className="text-xs text-muted-foreground">
                            Second look included
                          </span>
                        )}
                      </div>
                      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6">
                        {item.content}
                      </pre>
                    </article>
                    {isUser && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-12">
              <div className="text-center">
                <Brain className="mx-auto h-10 w-10 text-muted-foreground" weight="light" />
                <h3 className="mt-4 font-serif text-2xl font-semibold tracking-normal">
                  Ask Co-Op
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start with a decision, customer question, operating plan, or investor review.
                </p>
              </div>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => setMessage(suggestion)}
                    className="rounded-lg border border-border/50 bg-background p-3 text-left text-sm transition-colors hover:bg-muted/40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form className="border-t border-border/50 p-4" onSubmit={submitChat}>
          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <textarea
                aria-label="Message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder={`Ask ${advisorDisplay(agentType).toLowerCase()}...`}
                className="max-h-40 min-h-16 w-full resize-none rounded-lg border border-input bg-background px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button
                type="submit"
                size="icon"
                className="absolute bottom-3 right-3 h-9 w-9"
                disabled={busyAction === 'chat' || !message.trim()}
                aria-label="Send message"
              >
                {busyAction === 'chat' ? (
                  <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <PaperPlaneTilt className="h-4 w-4" weight="fill" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}

function RagPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [document, setDocument] = useState({ title: '', source: '', content: '' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [graph, setGraph] = useState<KnowledgeGraphSnapshot | null>(null);
  const [graphError, setGraphError] = useState('');

  useEffect(() => {
    let mounted = true;
    void getKnowledgeGraph()
      .then((snapshot) => {
        if (mounted) setGraph(snapshot);
      })
      .catch((error) => {
        if (mounted) setGraphError(errorMessage(error, 'Business memory could not be loaded'));
      });
    return () => {
      mounted = false;
    };
  }, [
    state.documents.length,
    state.leads.length,
    state.campaigns.length,
    state.workflowRuns.length,
  ]);

  const refreshGraph = () => {
    setGraphError('');
    void getKnowledgeGraph()
      .then(setGraph)
      .catch((error) => setGraphError(errorMessage(error, 'Business memory could not be loaded')));
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[400px_1fr]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState(
            'document',
            () => addKnowledgeDocument(document),
            'File added to company knowledge.'
          ).then(() => setDocument({ title: '', source: '', content: '' }));
        }}
      >
        <PanelTitle icon={HardDrives} title="Add company file" />
        <Field
          label="Title"
          value={document.title}
          onChange={(title) => setDocument({ ...document, title })}
        />
        <Field
          label="Source"
          value={document.source}
          onChange={(source) => setDocument({ ...document, source })}
        />
        <TextArea
          label="Content"
          value={document.content}
          onChange={(content) => setDocument({ ...document, content })}
          minHeight="min-h-48"
        />
        <Button className="mt-5" type="submit" disabled={busyAction === 'document'}>
          Add file
        </Button>
      </form>

      <div className="space-y-5">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <PanelTitle icon={MagnifyingGlass} title="Find answers" compact />
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Search your saved company files without uploading them to Co-Op cloud.
              </p>
            </div>
            <Badge variant="secondary">{state.documents.length} files</Badge>
          </div>
          <form
            className="mt-5 flex gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              void searchKnowledge({ query, limit: 6 }).then(setResults);
            }}
          >
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search company files"
            />
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-5 grid gap-3">
            {results.map((result) => (
              <article
                key={result.chunkId}
                className="rounded-md border border-border bg-background p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{result.title}</h3>
                  <Badge variant="secondary">Match</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.content}</p>
              </article>
            ))}
            {results.length === 0 && (
              <EmptyState
                icon={Database}
                title="No search results yet"
                text="Add files, notes, research, or pitch material, then search here."
              />
            )}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <PanelTitle icon={Brain} title="Business memory" compact />
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Co-Op connects your company profile, files, leads, campaigns, research, and work
                history so answers stay grounded.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={refreshGraph}>
              Refresh memory
            </Button>
          </div>
          {graphError && <Notice tone="error" text={graphError} />}
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <MetricCard
              icon={Database}
              label="Items remembered"
              value={String(graph?.nodes.length ?? 0)}
            />
            <MetricCard
              icon={FlowArrow}
              label="Connections"
              value={String(graph?.edges.length ?? 0)}
            />
            <MetricCard
              icon={Brain}
              label="Status"
              value={graph && graph.nodes.length > 0 ? 'Ready' : 'Needs profile'}
            />
          </div>
          <div className="mt-5 grid gap-4 2xl:grid-cols-2">
            <InlineDataTable
              title="What Co-Op remembers"
              rows={(graph?.nodes ?? [])
                .slice(0, 8)
                .map((node) => [node.label, memoryTypeDisplay(node.nodeType), node.summary || '-'])}
            />
            <InlineDataTable
              title="Useful links"
              rows={(graph?.edges ?? [])
                .slice(0, 8)
                .map((edge) => [
                  graphLabel(graph, edge.source),
                  memoryRelationshipDisplay(edge.relationship),
                  graphLabel(graph, edge.target),
                ])}
            />
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <PanelTitle icon={HardDrives} title="Saved files" />
          <div className="grid gap-3">
            {state.documents.map((doc) => (
              <article key={doc.id} className="rounded-md border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium">{doc.title}</h3>
                  <Badge variant="secondary">{knowledgeChunkCount(doc)} sections</Badge>
                </div>
                <p className="mt-2 truncate text-sm text-muted-foreground">{doc.source || '-'}</p>
              </article>
            ))}
            {state.documents.length === 0 && (
              <EmptyState
                icon={HardDrives}
                title="No files added"
                text="Add company docs, research notes, policies, call notes, or pitch content."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function ResearchPanel({
  state,
  busyAction,
  refresh,
  setError,
  setMessage,
  setBusyAction,
}: {
  state: DesktopState;
  busyAction: string;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setBusyAction: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [saveToRag, setSaveToRag] = useState(true);
  return (
    <div className="space-y-6">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusyAction('research');
          setError('');
          setMessage('');
          try {
            await runResearchQuery({ query, saveToRag });
            await refresh();
            setMessage('Research completed.');
            setQuery('');
          } catch (error) {
            setError(errorMessage(error, 'Research failed'));
          } finally {
            setBusyAction('');
          }
        }}
      >
        <PanelTitle icon={MagnifyingGlass} title="Research" />
        <TextArea label="Query" value={query} onChange={setQuery} minHeight="min-h-28" />
        <Toggle label="Save to company files" checked={saveToRag} onChange={setSaveToRag} />
        <Button
          className="mt-5"
          type="submit"
          disabled={busyAction === 'research' || !query.trim()}
        >
          Run research
        </Button>
      </form>
      <div className="grid gap-4">
        {state.researchRuns.map((run) => (
          <article key={run.id} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-semibold">{run.query}</h2>
              <Badge variant="secondary">{run.provider}</Badge>
            </div>
            <pre className="whitespace-pre-wrap text-sm leading-6">{run.summary}</pre>
          </article>
        ))}
      </div>
    </div>
  );
}

function OutreachPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState('leads');
  const [discovery, setDiscovery] = useState({ query: '', leadType: 'company', maxLeads: 5 });
  const [lead, setLead] = useState(blankLead);
  const [campaign, setCampaign] = useState(blankCampaign);
  const tabs = [
    { id: 'leads', label: `Leads (${state.leads.length})` },
    { id: 'campaigns', label: `Campaigns (${state.campaigns.length})` },
    { id: 'emails', label: `Emails (${state.campaignEmails.length})` },
  ];

  return (
    <div className="space-y-4">
      <SegmentedControl value={activeTab} onChange={setActiveTab} options={tabs} />

      {activeTab === 'leads' && (
        <div className="grid gap-5 2xl:grid-cols-[420px_1fr]">
          <div className="space-y-5">
            <form
              className="rounded-lg border border-border/50 bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState(
                  'discover',
                  () => discoverLeads(discovery),
                  'Lead discovery completed.'
                );
              }}
            >
              <PanelTitle icon={Sparkle} title="Lead discovery" />
              <TextArea
                label="Search brief"
                value={discovery.query}
                onChange={(query) => setDiscovery({ ...discovery, query })}
                minHeight="min-h-28"
              />
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Type"
                  value={discovery.leadType}
                  onChange={(leadType) => setDiscovery({ ...discovery, leadType })}
                  options={['company', 'person']}
                />
                <Field
                  label="Max leads"
                  type="number"
                  value={String(discovery.maxLeads)}
                  onChange={(maxLeads) =>
                    setDiscovery({ ...discovery, maxLeads: Number(maxLeads) })
                  }
                />
              </div>
              <Button className="mt-5" type="submit" disabled={busyAction === 'discover'}>
                Discover
              </Button>
            </form>
            <form
              className="rounded-lg border border-border/50 bg-card p-5"
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState('lead', () => createLead(lead), 'Lead saved.').then(() =>
                  setLead(blankLead)
                );
              }}
            >
              <PanelTitle icon={UsersThree} title="Manual lead" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Lead type"
                  value={lead.leadType}
                  onChange={(leadType) => setLead({ ...lead, leadType })}
                  options={['company', 'person']}
                />
                <Field
                  label="Email"
                  value={lead.email}
                  onChange={(email) => setLead({ ...lead, email })}
                />
                <Field
                  label="Name"
                  value={lead.name}
                  onChange={(name) => setLead({ ...lead, name })}
                />
                <Field
                  label="Company"
                  value={lead.companyName}
                  onChange={(companyName) => setLead({ ...lead, companyName })}
                />
                <Field
                  label="Website"
                  value={lead.website}
                  onChange={(website) => setLead({ ...lead, website })}
                />
                <Field
                  label="Niche"
                  value={lead.niche}
                  onChange={(niche) => setLead({ ...lead, niche })}
                />
              </div>
              <Button className="mt-5" type="submit">
                Save lead
              </Button>
            </form>
          </div>
          <section className="rounded-lg border border-border/50 bg-card p-5">
            <PanelTitle icon={UsersThree} title="Lead pipeline" />
            <div className="grid gap-3">
              {state.leads.map((item) => (
                <article
                  key={item.id}
                  className="rounded-lg border border-border/50 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate font-medium">{leadName(item)}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.email || item.website || item.profileUrl || 'No contact yet'}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {[item.platform, item.niche, item.location].filter(Boolean).join(' - ')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Badge variant="outline">{item.status}</Badge>
                      <Badge variant={item.leadScore >= 70 ? 'success' : 'secondary'}>
                        {item.leadScore}% fit
                      </Badge>
                    </div>
                  </div>
                </article>
              ))}
              {state.leads.length === 0 && (
                <EmptyState
                  icon={UsersThree}
                  title="No leads yet"
                  text="Discover or add leads locally, then turn them into campaign emails."
                />
              )}
            </div>
          </section>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <form
            className="rounded-lg border border-border/50 bg-card p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void runWithState('campaign', () => createCampaign(campaign), 'Campaign saved.').then(
                () => setCampaign(blankCampaign)
              );
            }}
          >
            <PanelTitle icon={EnvelopeSimple} title="Campaign builder" />
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Name"
                value={campaign.name}
                onChange={(name) => setCampaign({ ...campaign, name })}
              />
              <SelectField
                label="Mode"
                value={campaign.mode}
                onChange={(mode) => setCampaign({ ...campaign, mode })}
                options={['ai_personalized', 'single_template']}
              />
              <SelectField
                label="Target"
                value={campaign.targetLeadType}
                onChange={(targetLeadType) => setCampaign({ ...campaign, targetLeadType })}
                options={['company', 'person']}
              />
              <Field
                label="Tone"
                value={campaign.tone}
                onChange={(tone) => setCampaign({ ...campaign, tone })}
              />
              <Field
                label="Goal"
                value={campaign.campaignGoal}
                onChange={(campaignGoal) => setCampaign({ ...campaign, campaignGoal })}
              />
              <Field
                label="CTA"
                value={campaign.callToAction}
                onChange={(callToAction) => setCampaign({ ...campaign, callToAction })}
              />
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <TextArea
                label="Subject template"
                value={campaign.subjectTemplate}
                onChange={(subjectTemplate) => setCampaign({ ...campaign, subjectTemplate })}
              />
              <TextArea
                label="Body template"
                value={campaign.bodyTemplate}
                onChange={(bodyTemplate) => setCampaign({ ...campaign, bodyTemplate })}
              />
            </div>
            <Button className="mt-5" type="submit">
              Create campaign
            </Button>
          </form>
          <CampaignList
            campaigns={state.campaigns}
            busyAction={busyAction}
            runWithState={runWithState}
          />
        </div>
      )}

      {activeTab === 'emails' && (
        <section className="rounded-lg border border-border/50 bg-card p-5">
          <PanelTitle icon={EnvelopeSimple} title="Generated emails" />
          <div className="grid gap-3">
            {state.campaignEmails.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-border/50 bg-background p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{item.subject}</h3>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{item.to}</p>
                  </div>
                  <Badge
                    variant={
                      item.status === 'sent'
                        ? 'success'
                        : item.status === 'failed'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {item.status}
                  </Badge>
                </div>
                <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm leading-6">
                  {item.body}
                </pre>
                {item.providerMessage && (
                  <p className="mt-3 text-xs text-muted-foreground">{item.providerMessage}</p>
                )}
              </article>
            ))}
            {state.campaignEmails.length === 0 && (
              <EmptyState
                icon={EnvelopeSimple}
                title="No generated emails"
                text="Create a campaign, generate drafts, then send through the configured provider."
              />
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function ToolsPanel({
  state,
  busyAction,
  runWithState,
  setError,
  setMessage,
  setBusyAction,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setBusyAction: (value: string) => void;
}) {
  const [toolTab, setToolTab] = useState('calculators');
  const [calculator, setCalculator] = useState({
    toolType: 'runway',
    first: '100000',
    second: '20000',
  });
  const [calculatorResult, setCalculatorResult] = useState<BusinessToolResult | null>(null);
  const [alert, setAlert] = useState({ name: '', query: '', cadence: 'manual', enabled: true });
  const [pitch, setPitch] = useState<{
    title: string;
    deckNotes: string;
    fileName: string | null;
    fileMimeType: string | null;
    fileDataBase64: string | null;
  }>({
    title: '',
    deckNotes: '',
    fileName: null,
    fileMimeType: null,
    fileDataBase64: null,
  });
  const [pitchFileMeta, setPitchFileMeta] = useState<{ name: string; size: string } | null>(null);
  const [pitchFileError, setPitchFileError] = useState('');
  const [capTable, setCapTable] = useState({
    name: '',
    founderOwnershipPercent: 70,
    investorOwnershipPercent: 20,
    optionPoolPercent: 10,
    postMoneyValuation: 5000000,
    notes: '',
  });
  const [investorQuery, setInvestorQuery] = useState('');
  const investors = state.investors.filter((investor) =>
    `${investor.name} ${investor.firm} ${investor.stage} ${investor.sectors.join(' ')}`
      .toLowerCase()
      .includes(investorQuery.toLowerCase())
  );
  const calculatorSpecs: Record<
    string,
    { label: string; first: string; second: string; formula: string }
  > = {
    runway: {
      label: 'Runway',
      first: 'Cash balance',
      second: 'Monthly net burn',
      formula: 'Cash balance divided by monthly net burn',
    },
    burn_rate: {
      label: 'Burn rate',
      first: 'Starting cash',
      second: 'Ending cash',
      formula: 'Starting cash minus ending cash',
    },
    valuation: {
      label: 'Valuation',
      first: 'Annual revenue',
      second: 'Revenue multiple',
      formula: 'Annual revenue multiplied by selected multiple',
    },
    unit_economics: {
      label: 'Unit economics',
      first: 'Customer LTV',
      second: 'Customer CAC',
      formula: 'Lifetime value divided by acquisition cost',
    },
  };
  const calculatorSpec = calculatorSpecs[calculator.toolType] ?? calculatorSpecs.runway;
  const toolTabs = [
    { id: 'calculators', label: 'Calculators', icon: Calculator, meta: 'Runway, burn, valuation' },
    { id: 'alerts', label: 'Alerts', icon: Bell, meta: `${state.alerts.length} saved` },
    {
      id: 'pitch',
      label: 'Pitch Deck',
      icon: ChartLine,
      meta: `${state.pitchDecks.length} analyses`,
    },
    {
      id: 'captable',
      label: 'Cap Table',
      icon: UsersThree,
      meta: `${state.capTables.length} scenarios`,
    },
    {
      id: 'investors',
      label: 'Investors',
      icon: Briefcase,
      meta: `${state.investors.length} records`,
    },
  ];

  async function runCalc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('calculator');
    setError('');
    setMessage('');
    try {
      const result = await runCalculator(calculator.toolType, [
        Number(calculator.first),
        Number(calculator.second),
      ]);
      setCalculatorResult(result);
      setMessage('Calculator completed.');
    } catch (error) {
      setError(errorMessage(error, 'Calculator failed'));
    } finally {
      setBusyAction('');
    }
  }

  async function handlePitchFile(file: File | null) {
    setPitchFileError('');
    if (!file) {
      setPitch((current) => ({
        ...current,
        fileName: null,
        fileMimeType: null,
        fileDataBase64: null,
      }));
      setPitchFileMeta(null);
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setPitchFileError('Deck upload must be 25MB or smaller.');
      return;
    }
    try {
      const fileDataBase64 = await fileToDataUrl(file);
      setPitch((current) => ({
        ...current,
        fileName: file.name,
        fileMimeType: file.type || null,
        fileDataBase64,
      }));
      setPitchFileMeta({ name: file.name, size: formatBytes(file.size) });
    } catch (error) {
      setPitchFileError(errorMessage(error, 'Could not read the selected deck.'));
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[280px_1fr]">
      <aside className="rounded-lg border border-border/50 bg-card p-3">
        <div className="mb-3 px-1">
          <h2 className="font-serif text-lg font-semibold tracking-normal">Toolbox</h2>
          <p className="text-xs text-muted-foreground">Focused local operating surfaces</p>
        </div>
        <div className="space-y-2">
          {toolTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              data-testid={`tool-tab-${tab.id}`}
              onClick={() => setToolTab(tab.id)}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                toolTab === tab.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/50 bg-background hover:bg-muted/40'
              }`}
            >
              <tab.icon className="h-5 w-5 text-muted-foreground" />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{tab.label}</span>
                <span className="block truncate text-xs text-muted-foreground">{tab.meta}</span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="min-w-0 rounded-lg border border-border/50 bg-card p-5">
        {toolTab === 'calculators' && (
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <form onSubmit={runCalc}>
              <PanelTitle icon={Calculator} title="Calculators" />
              <div className="grid gap-4 sm:grid-cols-3">
                <SelectField
                  label="Tool"
                  value={calculator.toolType}
                  onChange={(toolType) => setCalculator({ ...calculator, toolType })}
                  options={['runway', 'burn_rate', 'valuation', 'unit_economics']}
                  labels={Object.fromEntries(
                    Object.entries(calculatorSpecs).map(([key, spec]) => [key, spec.label])
                  )}
                />
                <Field
                  label={calculatorSpec.first}
                  type="number"
                  value={calculator.first}
                  onChange={(first) => setCalculator({ ...calculator, first })}
                />
                <Field
                  label={calculatorSpec.second}
                  type="number"
                  value={calculator.second}
                  onChange={(second) => setCalculator({ ...calculator, second })}
                />
              </div>
              <Button className="mt-5" type="submit" disabled={busyAction === 'calculator'}>
                Calculate
              </Button>
              {calculatorResult && (
                <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm">
                  {calculatorResult.output}
                </pre>
              )}
            </form>
            <div className="rounded-lg border border-border/50 bg-background p-4">
              <h3 className="font-serif text-lg font-medium">{calculatorSpec.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {calculatorSpec.formula}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                <Rows
                  rows={[
                    ['Runway', 'Cash / monthly burn'],
                    ['Burn rate', 'Spend minus revenue'],
                    ['Valuation', 'Revenue x multiple'],
                    ['Unit economics', 'LTV / CAC'],
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {toolTab === 'alerts' && (
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState('alert', () => saveAlert(alert), 'Alert saved.');
              }}
            >
              <PanelTitle icon={Bell} title="Competitor alerts" />
              <Field
                label="Name"
                value={alert.name}
                onChange={(name) => setAlert({ ...alert, name })}
              />
              <TextArea
                label="Query"
                value={alert.query}
                onChange={(query) => setAlert({ ...alert, query })}
              />
              <SelectField
                label="Cadence"
                value={alert.cadence}
                onChange={(cadence) => setAlert({ ...alert, cadence })}
                options={['manual', 'daily', 'weekly']}
              />
              <Button className="mt-5" type="submit">
                Save alert
              </Button>
            </form>
            <AlertList
              state={state}
              busyAction={busyAction}
              runWithState={runWithState}
              framed={false}
            />
          </div>
        )}

        {toolTab === 'pitch' && (
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState('pitch', () => analyzePitchDeck(pitch), 'Pitch deck analyzed.');
              }}
            >
              <PanelTitle icon={ChartLine} title="Pitch deck analyzer" />
              <Field
                label="Title"
                value={pitch.title}
                onChange={(title) => setPitch({ ...pitch, title })}
              />
              <div className="mt-4 space-y-2">
                <Label htmlFor="pitch-deck-file">Deck file</Label>
                <label
                  htmlFor="pitch-deck-file"
                  className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <BookBookmark className="h-8 w-8 text-muted-foreground" weight="light" />
                  <span className="mt-3 text-sm font-medium">
                    Upload PDF, PPTX, TXT, or Markdown
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Parsed locally before the selected model reviews it
                  </span>
                </label>
                <input
                  id="pitch-deck-file"
                  type="file"
                  accept=".pdf,.pptx,.txt,.md,.markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                  className="sr-only"
                  onChange={(event) => {
                    void handlePitchFile(event.target.files?.[0] ?? null);
                    event.currentTarget.value = '';
                  }}
                />
                {pitchFileMeta && (
                  <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
                    <span className="min-w-0 truncate">
                      {pitchFileMeta.name} - {pitchFileMeta.size}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPitch((current) => ({
                          ...current,
                          fileName: null,
                          fileMimeType: null,
                          fileDataBase64: null,
                        }));
                        setPitchFileMeta(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {pitchFileError && <p className="text-sm text-destructive">{pitchFileError}</p>}
              </div>
              <TextArea
                label="Notes or missing slide context"
                value={pitch.deckNotes}
                onChange={(deckNotes) => setPitch({ ...pitch, deckNotes })}
                minHeight="min-h-32"
              />
              <Button
                className="mt-5"
                type="submit"
                disabled={
                  busyAction === 'pitch' ||
                  !pitch.title.trim() ||
                  (!pitch.deckNotes.trim() && !pitch.fileDataBase64)
                }
              >
                Analyze
              </Button>
            </form>
            <div className="space-y-3">
              {state.pitchDecks.map((deck) => (
                <article
                  key={deck.id}
                  className="rounded-lg border border-border/50 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{deck.title}</h3>
                    <Badge variant={deck.score >= 75 ? 'success' : 'warning'}>
                      {deck.score}/100
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {deck.sourceFileName && (
                      <span className="rounded-full border border-border px-2 py-1">
                        {deck.sourceFileName}
                      </span>
                    )}
                    {deck.slideCount > 0 && (
                      <span className="rounded-full border border-border px-2 py-1">
                        {deck.slideCount} slides/pages
                      </span>
                    )}
                  </div>
                  <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm leading-6 text-muted-foreground">
                    {deck.analysis}
                  </pre>
                </article>
              ))}
              {state.pitchDecks.length === 0 && (
                <EmptyState
                  icon={ChartLine}
                  title="No pitch analysis"
                  text="Upload a deck or add notes to get a local investor-readiness review."
                />
              )}
            </div>
          </div>
        )}

        {toolTab === 'captable' && (
          <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void runWithState('captable', () => saveCapTable(capTable), 'Cap table saved.');
              }}
            >
              <PanelTitle icon={UsersThree} title="Cap table" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Scenario"
                  value={capTable.name}
                  onChange={(name) => setCapTable({ ...capTable, name })}
                />
                <Field
                  label="Post-money valuation"
                  type="number"
                  value={String(capTable.postMoneyValuation)}
                  onChange={(value) =>
                    setCapTable({ ...capTable, postMoneyValuation: Number(value) })
                  }
                />
                <Field
                  label="Founder %"
                  type="number"
                  value={String(capTable.founderOwnershipPercent)}
                  onChange={(value) =>
                    setCapTable({ ...capTable, founderOwnershipPercent: Number(value) })
                  }
                />
                <Field
                  label="Investor %"
                  type="number"
                  value={String(capTable.investorOwnershipPercent)}
                  onChange={(value) =>
                    setCapTable({ ...capTable, investorOwnershipPercent: Number(value) })
                  }
                />
                <Field
                  label="Option pool %"
                  type="number"
                  value={String(capTable.optionPoolPercent)}
                  onChange={(value) =>
                    setCapTable({ ...capTable, optionPoolPercent: Number(value) })
                  }
                />
              </div>
              <TextArea
                label="Notes"
                value={capTable.notes}
                onChange={(notes) => setCapTable({ ...capTable, notes })}
              />
              <Button className="mt-5" type="submit">
                Save scenario
              </Button>
            </form>
            <div className="space-y-3">
              {state.capTables.map((scenario) => (
                <article
                  key={scenario.id}
                  className="rounded-lg border border-border/50 bg-background p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{scenario.name}</h3>
                    <Badge variant="secondary">
                      ${scenario.postMoneyValuation.toLocaleString()}
                    </Badge>
                  </div>
                  <Rows
                    rows={[
                      ['Founder', `${scenario.founderOwnershipPercent}%`],
                      ['Investor', `${scenario.investorOwnershipPercent}%`],
                      ['Option pool', `${scenario.optionPoolPercent}%`],
                    ]}
                  />
                  {scenario.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">{scenario.notes}</p>
                  )}
                </article>
              ))}
              {state.capTables.length === 0 && (
                <EmptyState
                  icon={UsersThree}
                  title="No scenarios"
                  text="Model founder, investor, and option-pool ownership before a round."
                />
              )}
            </div>
          </div>
        )}

        {toolTab === 'investors' && (
          <div>
            <PanelTitle icon={Briefcase} title="Investor database" />
            <Input
              value={investorQuery}
              onChange={(event) => setInvestorQuery(event.target.value)}
              placeholder="Search investors by firm, stage, sector, geography"
            />
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {investors.slice(0, 16).map((investor) => (
                <article
                  key={investor.id}
                  className="rounded-lg border border-border/50 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{investor.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {investor.stage} - {investor.ticketSize}
                      </p>
                    </div>
                    <Badge variant="outline">{investor.geography}</Badge>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {investor.sectors.join(', ')}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SettingsPanel({
  settings,
  setSettings,
  busyAction,
  runWithState,
}: {
  settings: ModelSettings;
  setSettings: (value: ModelSettings) => void;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [settingsTab, setSettingsTab] = useState('model');
  const [integration, setIntegration] = useState({
    name: '',
    kind: 'mcp',
    baseUrl: '',
    enabled: true,
  });
  const update = (patch: Partial<ModelSettings>) => setSettings({ ...settings, ...patch });
  const settingsPayload: ModelSettingsUpdate = {
    ...settings,
    openaiApiKey,
    firecrawlApiKey,
    emailApiKey,
  };
  const integrationReady =
    integration.name.trim().length >= 2 && integration.baseUrl.trim().length > 0;
  const needsModelKey = settings.provider === 'openai_compatible' && !settings.openaiApiKeySaved;
  const needsFirecrawlKey =
    settings.researchProvider === 'firecrawl' && !settings.firecrawlApiKeySaved;
  const needsEmailKey = settings.emailProvider !== 'none' && !settings.emailApiKeySaved;
  const modelReady =
    settings.provider !== 'openai_compatible' ||
    settings.openaiApiKeySaved ||
    openaiApiKey.trim().length > 0;
  const researchReady =
    settings.researchProvider !== 'firecrawl' ||
    settings.firecrawlApiKeySaved ||
    firecrawlApiKey.trim().length > 0;
  const emailReady =
    settings.emailProvider === 'none' ||
    ((settings.emailApiKeySaved || emailApiKey.trim().length > 0) &&
      looksLikeEmail(settings.emailFrom));
  const settingsReady = modelReady && researchReady && emailReady;

  async function saveSettings() {
    const saved = await runWithState(
      'settings',
      () => saveModelSettings(settingsPayload),
      'Settings saved.'
    );
    if (saved) {
      setOpenaiApiKey('');
      setFirecrawlApiKey('');
      setEmailApiKey('');
    }
  }

  const settingTabs = [
    { id: 'model', label: 'Model' },
    { id: 'research', label: 'Research' },
    { id: 'email', label: 'Email' },
    { id: 'integrations', label: 'Integrations' },
  ];

  const saveLabel =
    settingsTab === 'model'
      ? 'Save model settings'
      : settingsTab === 'research'
        ? 'Save research settings'
        : 'Save email settings';

  if (settingsTab === 'integrations') {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <SettingsHeader
          currentTab={settingsTab}
          onTabChange={setSettingsTab}
          options={settingTabs}
        />
        <form
          className="rounded-lg border border-border bg-card p-5"
          onSubmit={(event) => {
            event.preventDefault();
            void runWithState(
              'integration',
              () => saveIntegration(integration),
              'Integration saved.'
            );
          }}
        >
          <PanelTitle icon={Plugs} title="Local integrations" />
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              label="Name"
              value={integration.name}
              onChange={(name) => setIntegration({ ...integration, name })}
            />
            <SelectField
              label="Type"
              value={integration.kind}
              onChange={(kind) => setIntegration({ ...integration, kind })}
              options={['mcp', 'webhook', 'notion', 'crm', 'custom']}
            />
            <div className="md:col-span-2">
              <Field
                label="Base URL"
                value={integration.baseUrl}
                onChange={(baseUrl) => setIntegration({ ...integration, baseUrl })}
                placeholder="http://localhost:8787"
              />
            </div>
          </div>
          <Button
            className="mt-5"
            type="submit"
            disabled={busyAction === 'integration' || !integrationReady}
          >
            Save integration
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <SettingsHeader currentTab={settingsTab} onTabChange={setSettingsTab} options={settingTabs} />
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={(event) => {
          event.preventDefault();
          void saveSettings();
        }}
      >
        {settingsTab === 'model' && (
          <div className="space-y-5">
            <PanelTitle icon={HardDrives} title="AI provider" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="AI source"
                value={settings.provider}
                onChange={(provider) => update({ provider })}
                options={['ollama', 'openai_compatible']}
                labels={{
                  ollama: 'Local AI on this computer',
                  openai_compatible: 'Private API key',
                }}
              />
              <SelectField
                label="Review level"
                value={settings.councilMode}
                onChange={(councilMode) => update({ councilMode })}
                options={['off', 'review_only', 'high_risk_only', 'full_council']}
                labels={reviewModeLabels}
              />
              {settings.provider === 'ollama' ? (
                <>
                  <Field
                    label="Local AI address"
                    value={settings.ollamaBaseUrl}
                    onChange={(ollamaBaseUrl) => update({ ollamaBaseUrl })}
                  />
                  <Field
                    label="Local AI model"
                    value={settings.ollamaModel}
                    onChange={(ollamaModel) => update({ ollamaModel })}
                  />
                </>
              ) : (
                <>
                  <Field
                    label="AI service address"
                    value={settings.openaiBaseUrl}
                    onChange={(openaiBaseUrl) => update({ openaiBaseUrl })}
                  />
                  <Field
                    label="AI model"
                    value={settings.openaiModel}
                    onChange={(openaiModel) => update({ openaiModel })}
                  />
                  <div className="md:col-span-2">
                    <Field
                      label={settings.openaiApiKeySaved ? 'Replace API key' : 'API key'}
                      value={openaiApiKey}
                      type="password"
                      onChange={setOpenaiApiKey}
                    />
                    <SecretStatus
                      saved={settings.openaiApiKeySaved}
                      pending={openaiApiKey.trim().length > 0}
                      required={needsModelKey}
                    />
                  </div>
                </>
              )}
              <Field
                label="Answer budget"
                type="number"
                value={String(settings.maxRunTokens)}
                onChange={(value) => update({ maxRunTokens: Number(value) })}
              />
            </div>
          </div>
        )}

        {settingsTab === 'research' && (
          <div className="space-y-5">
            <PanelTitle icon={MagnifyingGlass} title="Research" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Research source"
                value={settings.researchProvider}
                onChange={(researchProvider) => update({ researchProvider })}
                options={['llm', 'firecrawl']}
                labels={{ llm: 'AI summary only', firecrawl: 'Web search with Firecrawl' }}
              />
              {settings.researchProvider === 'firecrawl' && (
                <>
                  <Field
                    label="Research service address"
                    value={settings.firecrawlBaseUrl}
                    onChange={(firecrawlBaseUrl) => update({ firecrawlBaseUrl })}
                  />
                  <div className="md:col-span-2">
                    <Field
                      label={
                        settings.firecrawlApiKeySaved ? 'Replace Firecrawl key' : 'Firecrawl key'
                      }
                      value={firecrawlApiKey}
                      type="password"
                      onChange={setFirecrawlApiKey}
                    />
                    <SecretStatus
                      saved={settings.firecrawlApiKeySaved}
                      pending={firecrawlApiKey.trim().length > 0}
                      required={needsFirecrawlKey}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {settingsTab === 'email' && (
          <div className="space-y-5">
            <PanelTitle icon={EnvelopeSimple} title="Email" />
            <div className="grid gap-4 md:grid-cols-2">
              <SelectField
                label="Email sender"
                value={settings.emailProvider}
                onChange={(emailProvider) => update({ emailProvider })}
                options={['none', 'resend', 'sendgrid']}
                labels={{ none: 'None', resend: 'Resend', sendgrid: 'SendGrid' }}
              />
              {settings.emailProvider !== 'none' && (
                <>
                  <Field
                    label={settings.emailApiKeySaved ? 'Replace email key' : 'Email API key'}
                    value={emailApiKey}
                    type="password"
                    onChange={setEmailApiKey}
                  />
                  <SecretStatus
                    saved={settings.emailApiKeySaved}
                    pending={emailApiKey.trim().length > 0}
                    required={needsEmailKey}
                  />
                  <Field
                    label="Sender email"
                    value={settings.emailFrom}
                    onChange={(emailFrom) => update({ emailFrom })}
                  />
                  <Field
                    label="Sender name"
                    value={settings.emailFromName}
                    onChange={(emailFromName) => update({ emailFromName })}
                  />
                </>
              )}
            </div>
          </div>
        )}

        <Button
          className="mt-6"
          type="submit"
          disabled={busyAction === 'settings' || !settingsReady}
        >
          {saveLabel}
        </Button>
      </form>
    </div>
  );
}

function SettingsHeader({
  currentTab,
  onTabChange,
  options,
}: {
  currentTab: string;
  onTabChange: (value: string) => void;
  options: { id: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold tracking-normal">Settings</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Private keys stay on this computer in the operating system credential store.
        </p>
      </div>
      <SegmentedControl value={currentTab} options={options} onChange={onTabChange} />
    </div>
  );
}

function SecretStatus({
  saved,
  pending,
  required,
}: {
  saved: boolean;
  pending: boolean;
  required: boolean;
}) {
  const text = pending
    ? 'New key ready to save'
    : saved
      ? 'Key saved'
      : required
        ? 'Key required'
        : 'No key saved';
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <span
        className={`h-2 w-2 rounded-full ${
          pending || saved ? 'bg-green-500' : required ? 'bg-amber-500' : 'bg-muted-foreground/50'
        }`}
      />
      <span>{text}</span>
    </div>
  );
}

function HistoryPanel({
  state,
  busyAction,
  refresh,
  setError,
  setMessage,
  setBusyAction,
}: {
  state: DesktopState;
  busyAction: string;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setBusyAction: (value: string) => void;
}) {
  const [workflowType, setWorkflowType] = useState('operations');
  const [objective, setObjective] = useState('');
  const [latestRun, setLatestRun] = useState<WorkflowRun | null>(state.workflowRuns[0] ?? null);
  const visibleRuns = latestRun
    ? state.workflowRuns.filter((run) => run.id !== latestRun.id)
    : state.workflowRuns;
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusyAction('workflow');
          setError('');
          setMessage('');
          try {
            const run = await runBusinessWorkflow({ workflowType, objective });
            setLatestRun(run);
            await refresh();
            setMessage(
              run.status === 'completed' ? 'Work plan completed.' : 'Work plan needs attention.'
            );
          } catch (error) {
            setError(errorMessage(error, 'Work plan failed'));
          } finally {
            setBusyAction('');
          }
        }}
      >
        <PanelTitle icon={FlowArrow} title="Start structured work" />
        <SelectField
          label="Area"
          value={workflowType}
          onChange={setWorkflowType}
          options={['operations', 'finance', 'legal', 'sales', 'strategy']}
          labels={roleLabels}
        />
        <TextArea
          label="What needs to be done?"
          value={objective}
          onChange={setObjective}
          minHeight="min-h-40"
        />
        <Button
          className="mt-5"
          type="submit"
          disabled={busyAction === 'workflow' || !objective.trim()}
        >
          Start work
        </Button>
      </form>
      <div className="space-y-4">
        {latestRun && <RunCard run={latestRun} />}
        {visibleRuns.map((run) => (
          <RunCard key={run.id} run={run} />
        ))}
        {!latestRun && visibleRuns.length === 0 && (
          <EmptyState
            icon={FlowArrow}
            title="No work plans yet"
            text="Start with a decision, plan, review, or operating question."
          />
        )}
      </div>
    </div>
  );
}

function CampaignList({
  campaigns,
  busyAction,
  runWithState,
}: {
  campaigns: Campaign[];
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <PanelTitle icon={EnvelopeSimple} title="Campaigns" />
      <div className="grid gap-3">
        {campaigns.map((campaign) => (
          <article key={campaign.id} className="rounded-md border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">{campaign.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {campaign.mode} - {campaign.status}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyAction === 'generate'}
                  onClick={() =>
                    void runWithState(
                      'generate',
                      () => generateCampaignEmails({ campaignId: campaign.id }),
                      'Campaign emails generated.'
                    )
                  }
                >
                  Generate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busyAction === 'send'}
                  onClick={() =>
                    void runWithState(
                      'send',
                      () => sendCampaignEmails({ campaignId: campaign.id }),
                      'Campaign send attempted.'
                    )
                  }
                >
                  Send
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AlertList({
  state,
  busyAction,
  runWithState,
  framed = true,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
  framed?: boolean;
}) {
  const content = (
    <>
      <PanelTitle icon={Bell} title="Alerts" compact={!framed} />
      <div className="grid gap-3 lg:grid-cols-2">
        {state.alerts.map((alert) => (
          <article key={alert.id} className="rounded-md border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{alert.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{alert.query}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={busyAction === 'alert-run'}
                onClick={() =>
                  void runWithState('alert-run', () => runAlertNow(alert.id), 'Alert refreshed.')
                }
              >
                Run
              </Button>
            </div>
            {alert.lastResult && (
              <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                {alert.lastResult}
              </pre>
            )}
          </article>
        ))}
        {state.alerts.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No alerts"
            text="Save competitor or market watch queries and run them when needed."
          />
        )}
      </div>
    </>
  );

  if (!framed) return <div>{content}</div>;

  return (
    <section className="rounded-lg border border-border bg-card p-5 xl:col-span-2">
      {content}
    </section>
  );
}

function RunCard({ run }: { run: WorkflowRun }) {
  const trace = run.trace?.length
    ? run.trace
    : run.steps.map((step, index) => ({
        id: `${run.id}-step-${index}`,
        stage: 'step',
        label: step,
        status: 'completed',
        detail: '',
        createdAt: run.createdAt,
      }));
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{advisorDisplay(run.workflowType)} work</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {providerDisplay(run.provider)} - {riskDisplay(run.riskLevel)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {run.approvalRequired && <Badge variant="warning">Needs approval</Badge>}
          <Badge variant={run.status === 'completed' ? 'success' : 'warning'}>
            {runStatusDisplay(run.status)}
          </Badge>
        </div>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{run.objective}</p>
      {trace.length > 0 && (
        <div className="mt-4 grid gap-2">
          {trace.map((event) => (
            <div
              key={event.id}
              className="grid gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm sm:grid-cols-[120px_1fr_auto]"
            >
              <span className="font-medium text-muted-foreground">
                {traceStageDisplay(event.stage)}
              </span>
              <span className="min-w-0">
                <span className="block font-medium">{event.label}</span>
                {event.detail && (
                  <span className="block text-xs leading-5 text-muted-foreground">
                    {event.detail}
                  </span>
                )}
              </span>
              <Badge
                variant={
                  event.status === 'completed'
                    ? 'success'
                    : event.status === 'failed'
                      ? 'destructive'
                      : event.status === 'skipped'
                        ? 'secondary'
                        : 'outline'
                }
              >
                {runStatusDisplay(event.status)}
              </Badge>
            </div>
          ))}
        </div>
      )}
      {run.output && (
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">
          {run.output}
        </pre>
      )}
      {run.error && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {run.error}
        </p>
      )}
    </article>
  );
}

function DataTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="mb-4 text-base font-semibold">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-t border-border first:border-t-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${title}-${index}-${cellIndex}`}
                    className="max-w-72 truncate px-3 py-2"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-5 text-center text-muted-foreground">Empty</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function InlineDataTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${title}-${index}`} className="border-t border-border first:border-t-0">
                {row.map((cell, cellIndex) => (
                  <td
                    key={`${title}-${index}-${cellIndex}`}
                    className="max-w-56 truncate px-3 py-2"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-5 text-center text-muted-foreground">Empty</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
  compact = false,
}: {
  icon: typeof ShieldCheck;
  title: string;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? 'mb-0' : 'mb-5'} flex items-center gap-3`}>
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function SectionHeading({ title, detail }: { title: string; detail: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
  action,
  onAction,
}: {
  icon: typeof ShieldCheck;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <Icon className="mx-auto h-8 w-8 text-muted-foreground" weight="light" />
      <h3 className="mt-4 font-serif text-lg font-medium">{title}</h3>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">{text}</p>
      {action && onAction && (
        <Button className="mt-5" size="sm" variant="outline" onClick={onAction}>
          {action}
        </Button>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  type?: string;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  minHeight = 'min-h-28',
}: {
  label: string;
  value: string;
  minHeight?: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`${minHeight} w-full resize-y rounded-lg border border-input bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20`}
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  labels = {},
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {labels[option] ?? option.replaceAll('_', ' ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
    </label>
  );
}

function TogglePill({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        checked
          ? 'border-primary/20 bg-primary/10 text-foreground'
          : 'border-border bg-background text-muted-foreground hover:text-foreground'
      }`}
    >
      {label}: {checked ? 'on' : 'off'}
    </button>
  );
}

function SegmentedControl({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-lg bg-muted/70 p-1">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          data-testid={`segment-${option.id}`}
          onClick={() => onChange(option.id)}
          className={`h-9 whitespace-nowrap rounded-md px-3 text-sm font-medium transition-colors ${
            value === option.id
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Notice({ tone, text }: { tone: 'warning' | 'error' | 'success'; text: string }) {
  const classes =
    tone === 'error'
      ? 'border-destructive/30 bg-destructive/10 text-destructive'
      : tone === 'success'
        ? 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300';
  return (
    <div className={`flex gap-3 rounded-lg border p-4 text-sm ${classes}`}>
      <Warning className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{text}</p>
    </div>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex min-w-0 items-center justify-between gap-4 border-b border-border pb-2 last:border-0"
        >
          <span className="text-muted-foreground">{label}</span>
          <span className="min-w-0 max-w-[68%] truncate text-right font-medium">{value}</span>
        </div>
      ))}
    </div>
  );
}

function leadName(lead: Lead): string {
  return lead.name || lead.companyName || lead.website || 'Untitled lead';
}

function workspaceCompletion(profile: StartupProfile): number {
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

function numberToInput(value: number | null): string {
  return value === null || Number.isNaN(value) ? '' : String(value);
}

function optionalNumberFromInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function optionalIntegerFromInput(value: string): number | null {
  const parsed = optionalNumberFromInput(value);
  return parsed === null ? null : Math.trunc(parsed);
}

function labelOption(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';
  return optionLabels[trimmed] ?? trimmed.replaceAll('_', ' ');
}

function advisorDisplay(value: string): string {
  return roleLabels[value] ?? labelOption(value);
}

function reviewModeDisplay(value: string): string {
  return reviewModeLabels[value] ?? labelOption(value);
}

function providerDisplay(value: string): string {
  return providerLabels[value] ?? labelOption(value);
}

function runStatusDisplay(value: string): string {
  return runStatusLabels[value] ?? labelOption(value);
}

function riskDisplay(value: string): string {
  if (!value || value === 'normal') return 'Normal sensitivity';
  if (value === 'elevated') return 'Sensitive';
  if (value === 'high') return 'High sensitivity';
  return labelOption(value);
}

function traceStageDisplay(value: string): string {
  const labels: Record<string, string> = {
    intake: 'Start',
    context: 'Context',
    routing: 'AI',
    model: 'Work',
    guardrail: 'Review',
    checkpoint: 'Saved',
    step: 'Step',
  };
  return labels[value] ?? labelOption(value);
}

function memoryTypeDisplay(value: string): string {
  return memoryTypeLabels[value] ?? labelOption(value);
}

function memoryRelationshipDisplay(value: string): string {
  const labels: Record<string, string> = {
    has_knowledge: 'uses',
    monitors: 'tracks',
    targets: 'targets',
    runs_campaign: 'runs',
    contacts: 'contacts',
    executed: 'created',
    founded_by: 'founded by',
    at_stage: 'stage',
    operates_in: 'market',
    uses_model: 'model',
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

function graphLabel(graph: KnowledgeGraphSnapshot | null, id: string): string {
  return graph?.nodes.find((node) => node.id === id)?.label ?? id;
}

function knowledgeChunkCount(document: KnowledgeDocument): number {
  return document.chunkCount || document.chunks.length;
}

function titleForView(view: View): string {
  if (view === 'dashboard') return 'Overview';
  if (view === 'activation') return 'License';
  if (view === 'workspace') return 'Company Profile';
  if (view === 'chat') return 'Ask Co-Op';
  if (view === 'rag') return 'Company Files';
  if (view === 'research') return 'Research';
  if (view === 'outreach') return 'Outreach';
  if (view === 'tools') return 'Business Tools';
  if (view === 'settings') return 'Setup';
  return 'Work';
}

function fileToDataUrl(file: File): Promise<string> {
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}

function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim();
  const parts = trimmed.split('@');
  return (
    parts.length === 2 &&
    parts[0].length > 0 &&
    parts[1].includes('.') &&
    !parts[1].startsWith('.') &&
    !parts[1].endsWith('.')
  );
}
