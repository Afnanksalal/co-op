'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  BookBookmark,
  Brain,
  Briefcase,
  Calculator,
  ChartLine,
  ChatsCircle,
  Database,
  Desktop,
  EnvelopeSimple,
  FlowArrow,
  HardDrives,
  Key,
  MagnifyingGlass,
  PaperPlaneTilt,
  Plugs,
  ShieldCheck,
  Sparkle,
  UsersThree,
  Warning,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  type Lead,
  type ModelSettings,
  type ModelSettingsUpdate,
  type SearchResult,
  type StartupProfile,
  type WorkflowRun,
} from '@/lib/desktop/runtime';

type View = 'activation' | 'workspace' | 'chat' | 'rag' | 'research' | 'outreach' | 'tools' | 'models' | 'history';

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
  bodyTemplate: 'Hi {{name}},\n\nI noticed {{company}} and wanted to share a specific idea.\n\nBest,',
  campaignGoal: '',
  tone: 'professional',
  callToAction: 'Book a short call',
};

export function LocalCoOpShell() {
  const [view, setView] = useState<View>('workspace');
  const [state, setState] = useState<DesktopState | null>(null);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [workspace, setWorkspace] = useState<StartupProfile | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const runtimeAvailable = isTauriRuntime();

  useEffect(() => {
    void refresh();
  }, []);

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

  async function runWithState(label: string, action: () => Promise<DesktopState>, success: string) {
    setBusyAction(label);
    setError('');
    setMessage('');
    try {
      const next = await action();
      setState(next);
      setSettings(next.modelSettings);
      setWorkspace(next.workspace);
      setMessage(success);
    } catch (error) {
      setError(errorMessage(error, 'Action failed'));
    } finally {
      setBusyAction('');
    }
  }

  const navItems = useMemo(
    () => [
      { id: 'activation' as const, label: 'Activation', icon: ShieldCheck },
      { id: 'workspace' as const, label: 'Workspace', icon: Briefcase },
      { id: 'chat' as const, label: 'Chat', icon: ChatsCircle },
      { id: 'rag' as const, label: 'RAG', icon: Database },
      { id: 'research' as const, label: 'Research', icon: MagnifyingGlass },
      { id: 'outreach' as const, label: 'Outreach', icon: EnvelopeSimple },
      { id: 'tools' as const, label: 'Tools', icon: Calculator },
      { id: 'models' as const, label: 'Models', icon: Plugs },
      { id: 'history' as const, label: 'History', icon: BookBookmark },
    ],
    [],
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="flex min-h-screen flex-col border-r border-border bg-card">
          <div className="border-b border-border px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Desktop className="h-5 w-5" weight="bold" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">Co-Op Desktop</p>
                <p className="truncate text-xs text-muted-foreground">{state?.workspace.companyName || 'Local business OS'}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 px-3 py-4">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors ${
                  view === id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-4">
            <Badge variant={state?.isUsable ? 'success' : 'warning'}>
              {state?.isUsable ? 'Licensed' : 'Activation required'}
            </Badge>
            <p className="mt-3 truncate text-xs text-muted-foreground">{state?.activation?.customerEmail ?? state?.installId ?? 'Loading'}</p>
          </div>
        </aside>

        <section className="min-w-0 bg-background">
          <header className="flex h-16 items-center justify-between border-b border-border px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">{titleForView(view)}</h1>
              <p className="text-xs text-muted-foreground">{state?.installId ?? 'Loading local state'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busyAction !== ''}>
              Refresh
            </Button>
          </header>

          <div className="space-y-5 p-6">
            {!runtimeAvailable && (
              <Notice tone="warning" text="Desktop runtime unavailable in browser preview. Build or run Tauri to execute local commands." />
            )}
            {error && <Notice tone="error" text={error} />}
            {message && <Notice tone="success" text={message} />}

            {view === 'activation' && (
              <ActivationPanel state={state} busyAction={busyAction} runWithState={runWithState} />
            )}
            {view === 'workspace' && workspace && (
              <WorkspacePanel profile={workspace} onProfileChange={setWorkspace} busyAction={busyAction} runWithState={runWithState} />
            )}
            {view === 'chat' && state && (
              <ChatPanel state={state} busyAction={busyAction} runWithState={runWithState} />
            )}
            {view === 'rag' && state && (
              <RagPanel state={state} busyAction={busyAction} runWithState={runWithState} />
            )}
            {view === 'research' && state && (
              <ResearchPanel state={state} busyAction={busyAction} refresh={refresh} setError={setError} setMessage={setMessage} setBusyAction={setBusyAction} />
            )}
            {view === 'outreach' && state && (
              <OutreachPanel state={state} busyAction={busyAction} runWithState={runWithState} />
            )}
            {view === 'tools' && state && (
              <ToolsPanel state={state} busyAction={busyAction} runWithState={runWithState} setError={setError} setMessage={setMessage} setBusyAction={setBusyAction} />
            )}
            {view === 'models' && settings && (
              <ModelsPanel settings={settings} setSettings={setSettings} busyAction={busyAction} runWithState={runWithState} />
            )}
            {view === 'history' && state && (
              <HistoryPanel state={state} setError={setError} setMessage={setMessage} setBusyAction={setBusyAction} busyAction={busyAction} refresh={refresh} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function ActivationPanel({ state, busyAction, runWithState }: { state: DesktopState | null; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  const [licenseKey, setLicenseKey] = useState('');
  return (
    <div className="grid max-w-5xl gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={event => {
          event.preventDefault();
          void runWithState('activate', () => activateLicense({ licenseKey }), 'Activation saved locally.');
        }}
      >
        <PanelTitle icon={Key} title="Activation key" />
        <Field label="License key" value={licenseKey} onChange={setLicenseKey} placeholder="COOP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
        <Button className="mt-5" type="submit" disabled={busyAction === 'activate' || !licenseKey.trim()}>
          {busyAction === 'activate' ? 'Activating...' : 'Activate'}
        </Button>
      </form>
      <section className="rounded-lg border border-border bg-card p-5">
        <PanelTitle icon={ShieldCheck} title="Entitlement" />
        <Rows
          rows={[
            ['Email', state?.activation?.customerEmail ?? 'Not activated'],
            ['Plan', state?.activation?.plan ?? 'Unavailable'],
            ['Status', state?.activation?.status ?? 'Unavailable'],
            ['Offline grace', state?.activation ? new Date(state.activation.offlineGraceEndsAt).toLocaleString() : 'Unavailable'],
          ]}
        />
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => void runWithState('heartbeat', heartbeatLicense, 'Heartbeat refreshed.')} disabled={!state?.activation || busyAction === 'heartbeat'}>
            Heartbeat
          </Button>
          <Button variant="outline" onClick={() => void runWithState('clear', clearActivation, 'Local activation cleared.')} disabled={!state?.activation || busyAction === 'clear'}>
            Clear
          </Button>
        </div>
      </section>
    </div>
  );
}

function WorkspacePanel({ profile, onProfileChange, busyAction, runWithState }: { profile: StartupProfile; onProfileChange: (profile: StartupProfile) => void; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  return (
    <form
      className="rounded-lg border border-border bg-card p-5"
      onSubmit={event => {
        event.preventDefault();
        void runWithState('workspace', () => saveWorkspaceProfile(profile), 'Workspace saved locally.');
      }}
    >
      <PanelTitle icon={Briefcase} title="Company onboarding" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Field label="Company name" value={profile.companyName} onChange={companyName => onProfileChange({ ...profile, companyName })} />
        <Field label="Website" value={profile.website} onChange={website => onProfileChange({ ...profile, website })} />
        <Field label="Industry" value={profile.industry} onChange={industry => onProfileChange({ ...profile, industry })} />
        <Field label="Location" value={profile.location} onChange={location => onProfileChange({ ...profile, location })} />
        <Field label="Team size" value={profile.teamSize} onChange={teamSize => onProfileChange({ ...profile, teamSize })} />
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select value={profile.stage} onValueChange={stage => onProfileChange({ ...profile, stage })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="idea">Idea</SelectItem>
              <SelectItem value="mvp">MVP</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="seed">Seed</SelectItem>
              <SelectItem value="growth">Growth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <TextArea label="Target customers" value={profile.targetCustomers} onChange={targetCustomers => onProfileChange({ ...profile, targetCustomers })} />
        <TextArea label="Problem" value={profile.problem} onChange={problem => onProfileChange({ ...profile, problem })} />
        <TextArea label="Solution" value={profile.solution} onChange={solution => onProfileChange({ ...profile, solution })} />
        <TextArea label="Business model" value={profile.businessModel} onChange={businessModel => onProfileChange({ ...profile, businessModel })} />
        <TextArea label="Traction" value={profile.traction} onChange={traction => onProfileChange({ ...profile, traction })} />
        <TextArea label="Goals" value={profile.goals} onChange={goals => onProfileChange({ ...profile, goals })} />
      </div>
      <Button className="mt-5" type="submit" disabled={busyAction === 'workspace'}>
        Save workspace
      </Button>
    </form>
  );
}

function ChatPanel({ state, busyAction, runWithState }: { state: DesktopState; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  const [agentType, setAgentType] = useState('operations');
  const [sessionId, setSessionId] = useState<string | null>(state.chatSessions[0]?.id ?? null);
  const [message, setMessage] = useState('');
  const [a2aEnabled, setA2aEnabled] = useState(true);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [councilMode, setCouncilMode] = useState(state.modelSettings.councilMode);
  const activeSession = state.chatSessions.find(session => session.id === sessionId) ?? state.chatSessions[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={event => {
          event.preventDefault();
          void runWithState(
            'chat',
            () => runAgentChat({ sessionId, agentType, message, a2aEnabled, ragEnabled, researchEnabled, councilMode }),
            'Agent response saved.',
          ).then(() => setMessage(''));
        }}
      >
        <PanelTitle icon={ChatsCircle} title="Agent chat" />
        <div className="space-y-4">
          <SelectField label="Agent" value={agentType} onChange={setAgentType} options={['operations', 'legal', 'finance', 'investor', 'competitor', 'sales']} />
          <SelectField label="Session" value={sessionId ?? 'new'} onChange={value => setSessionId(value === 'new' ? null : value)} options={['new', ...state.chatSessions.map(session => session.id)]} labels={{ new: 'New session' }} />
          <SelectField label="Council" value={councilMode} onChange={setCouncilMode} options={['off', 'review_only', 'high_risk_only', 'full_council']} />
          <Toggle label="A2A review" checked={a2aEnabled} onChange={setA2aEnabled} />
          <Toggle label="Local RAG" checked={ragEnabled} onChange={setRagEnabled} />
          <Toggle label="Live research" checked={researchEnabled} onChange={setResearchEnabled} />
          <TextArea label="Message" value={message} onChange={setMessage} minHeight="min-h-36" />
          <Button type="submit" disabled={busyAction === 'chat' || !message.trim()}>
            <PaperPlaneTilt className="h-4 w-4" />
            {busyAction === 'chat' ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-5">
          <h2 className="text-lg font-semibold tracking-normal">{activeSession?.title ?? 'No chat yet'}</h2>
        </div>
        <div className="max-h-[68vh] space-y-4 overflow-auto p-5">
          {activeSession?.messages.map(item => (
            <div key={item.id} className={`rounded-lg border border-border p-4 ${item.role === 'user' ? 'bg-background' : 'bg-muted/40'}`}>
              <div className="mb-2 flex items-center gap-2">
                <Badge variant={item.role === 'assistant' ? 'success' : 'secondary'}>{item.role}</Badge>
                {item.agentType && <span className="text-xs text-muted-foreground">{item.agentType}</span>}
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-6">{item.content}</pre>
            </div>
          ))}
          {!activeSession && <p className="text-sm text-muted-foreground">Start a conversation with an agent.</p>}
        </div>
      </section>
    </div>
  );
}

function RagPanel({ state, busyAction, runWithState }: { state: DesktopState; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  const [document, setDocument] = useState({ title: '', source: '', content: '' });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={event => {
          event.preventDefault();
          void runWithState('document', () => addKnowledgeDocument(document), 'Document indexed locally.').then(() => setDocument({ title: '', source: '', content: '' }));
        }}
      >
        <PanelTitle icon={Database} title="Knowledge base" />
        <Field label="Title" value={document.title} onChange={title => setDocument({ ...document, title })} />
        <Field label="Source" value={document.source} onChange={source => setDocument({ ...document, source })} />
        <TextArea label="Content" value={document.content} onChange={content => setDocument({ ...document, content })} minHeight="min-h-48" />
        <Button className="mt-5" type="submit" disabled={busyAction === 'document'}>
          Index document
        </Button>
      </form>
      <section className="rounded-lg border border-border bg-card p-5">
        <PanelTitle icon={MagnifyingGlass} title="Vector search" />
        <form
          className="flex gap-3"
          onSubmit={event => {
            event.preventDefault();
            void searchKnowledge({ query, limit: 6 }).then(setResults);
          }}
        >
          <Input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search local knowledge" />
          <Button type="submit">Search</Button>
        </form>
        <div className="mt-5 grid gap-3">
          {(results.length ? results : []).map(result => (
            <article key={result.chunkId} className="rounded-md border border-border bg-background p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-medium">{result.title}</h3>
                <Badge variant="secondary">{result.score.toFixed(2)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{result.content}</p>
            </article>
          ))}
          <DataTable title="Documents" rows={state.documents.map(doc => [doc.title, doc.source || '-', `${doc.chunks.length} chunks`])} />
        </div>
      </section>
    </div>
  );
}

function ResearchPanel({ state, busyAction, refresh, setError, setMessage, setBusyAction }: { state: DesktopState; busyAction: string; refresh: () => Promise<void>; setError: (value: string) => void; setMessage: (value: string) => void; setBusyAction: (value: string) => void }) {
  const [query, setQuery] = useState('');
  const [saveToRag, setSaveToRag] = useState(true);
  return (
    <div className="space-y-6">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={async event => {
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
        <Toggle label="Save to RAG" checked={saveToRag} onChange={setSaveToRag} />
        <Button className="mt-5" type="submit" disabled={busyAction === 'research' || !query.trim()}>
          Run research
        </Button>
      </form>
      <div className="grid gap-4">
        {state.researchRuns.map(run => (
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

function OutreachPanel({ state, busyAction, runWithState }: { state: DesktopState; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  const [discovery, setDiscovery] = useState({ query: '', leadType: 'company', maxLeads: 5 });
  const [lead, setLead] = useState(blankLead);
  const [campaign, setCampaign] = useState(blankCampaign);
  return (
    <div className="grid gap-6 2xl:grid-cols-[420px_1fr]">
      <div className="space-y-6">
        <form
          className="rounded-lg border border-border bg-card p-5"
          onSubmit={event => {
            event.preventDefault();
            void runWithState('discover', () => discoverLeads(discovery), 'Lead discovery completed.');
          }}
        >
          <PanelTitle icon={Sparkle} title="Lead discovery" />
          <TextArea label="Search brief" value={discovery.query} onChange={query => setDiscovery({ ...discovery, query })} minHeight="min-h-28" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <SelectField label="Type" value={discovery.leadType} onChange={leadType => setDiscovery({ ...discovery, leadType })} options={['company', 'person']} />
            <Field label="Max leads" type="number" value={String(discovery.maxLeads)} onChange={maxLeads => setDiscovery({ ...discovery, maxLeads: Number(maxLeads) })} />
          </div>
          <Button className="mt-5" type="submit" disabled={busyAction === 'discover'}>
            Discover
          </Button>
        </form>
        <form
          className="rounded-lg border border-border bg-card p-5"
          onSubmit={event => {
            event.preventDefault();
            void runWithState('lead', () => createLead(lead), 'Lead saved.').then(() => setLead(blankLead));
          }}
        >
          <PanelTitle icon={UsersThree} title="Manual lead" />
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Lead type" value={lead.leadType} onChange={leadType => setLead({ ...lead, leadType })} options={['company', 'person']} />
            <Field label="Email" value={lead.email} onChange={email => setLead({ ...lead, email })} />
            <Field label="Name" value={lead.name} onChange={name => setLead({ ...lead, name })} />
            <Field label="Company" value={lead.companyName} onChange={companyName => setLead({ ...lead, companyName })} />
            <Field label="Website" value={lead.website} onChange={website => setLead({ ...lead, website })} />
            <Field label="Niche" value={lead.niche} onChange={niche => setLead({ ...lead, niche })} />
          </div>
          <Button className="mt-5" type="submit">Save lead</Button>
        </form>
      </div>
      <div className="space-y-6">
        <form
          className="rounded-lg border border-border bg-card p-5"
          onSubmit={event => {
            event.preventDefault();
            void runWithState('campaign', () => createCampaign(campaign), 'Campaign saved.').then(() => setCampaign(blankCampaign));
          }}
        >
          <PanelTitle icon={EnvelopeSimple} title="Campaign" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Name" value={campaign.name} onChange={name => setCampaign({ ...campaign, name })} />
            <SelectField label="Mode" value={campaign.mode} onChange={mode => setCampaign({ ...campaign, mode })} options={['ai_personalized', 'single_template']} />
            <SelectField label="Target" value={campaign.targetLeadType} onChange={targetLeadType => setCampaign({ ...campaign, targetLeadType })} options={['company', 'person']} />
            <Field label="Tone" value={campaign.tone} onChange={tone => setCampaign({ ...campaign, tone })} />
            <Field label="Goal" value={campaign.campaignGoal} onChange={campaignGoal => setCampaign({ ...campaign, campaignGoal })} />
            <Field label="CTA" value={campaign.callToAction} onChange={callToAction => setCampaign({ ...campaign, callToAction })} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <TextArea label="Subject template" value={campaign.subjectTemplate} onChange={subjectTemplate => setCampaign({ ...campaign, subjectTemplate })} />
            <TextArea label="Body template" value={campaign.bodyTemplate} onChange={bodyTemplate => setCampaign({ ...campaign, bodyTemplate })} />
          </div>
          <Button className="mt-5" type="submit">Create campaign</Button>
        </form>
        <CampaignList campaigns={state.campaigns} busyAction={busyAction} runWithState={runWithState} />
        <DataTable title="Leads" rows={state.leads.map(item => [leadName(item), item.email || '-', item.status, String(item.leadScore)])} />
        <DataTable title="Emails" rows={state.campaignEmails.map(item => [item.to, item.subject, item.status, item.providerMessage ?? '-'])} />
      </div>
    </div>
  );
}

function ToolsPanel({ state, busyAction, runWithState, setError, setMessage, setBusyAction }: { state: DesktopState; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void>; setError: (value: string) => void; setMessage: (value: string) => void; setBusyAction: (value: string) => void }) {
  const [calculator, setCalculator] = useState({ toolType: 'runway', first: '100000', second: '20000' });
  const [calculatorResult, setCalculatorResult] = useState<BusinessToolResult | null>(null);
  const [alert, setAlert] = useState({ name: '', query: '', cadence: 'manual', enabled: true });
  const [pitch, setPitch] = useState({ title: '', deckNotes: '' });
  const [capTable, setCapTable] = useState({ name: '', founderOwnershipPercent: 70, investorOwnershipPercent: 20, optionPoolPercent: 10, postMoneyValuation: 5000000, notes: '' });
  const [investorQuery, setInvestorQuery] = useState('');
  const investors = state.investors.filter(investor => `${investor.name} ${investor.firm} ${investor.stage} ${investor.sectors.join(' ')}`.toLowerCase().includes(investorQuery.toLowerCase()));

  async function runCalc(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('calculator');
    setError('');
    setMessage('');
    try {
      const result = await runCalculator(calculator.toolType, [Number(calculator.first), Number(calculator.second)]);
      setCalculatorResult(result);
      setMessage('Calculator completed.');
    } catch (error) {
      setError(errorMessage(error, 'Calculator failed'));
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <form className="rounded-lg border border-border bg-card p-5" onSubmit={runCalc}>
        <PanelTitle icon={Calculator} title="Calculators" />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Tool" value={calculator.toolType} onChange={toolType => setCalculator({ ...calculator, toolType })} options={['runway', 'burn_rate', 'valuation', 'unit_economics']} />
          <Field label="Value 1" type="number" value={calculator.first} onChange={first => setCalculator({ ...calculator, first })} />
          <Field label="Value 2" type="number" value={calculator.second} onChange={second => setCalculator({ ...calculator, second })} />
        </div>
        <Button className="mt-5" type="submit" disabled={busyAction === 'calculator'}>Calculate</Button>
        {calculatorResult && <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm">{calculatorResult.output}</pre>}
      </form>
      <form className="rounded-lg border border-border bg-card p-5" onSubmit={event => { event.preventDefault(); void runWithState('alert', () => saveAlert(alert), 'Alert saved.'); }}>
        <PanelTitle icon={Bell} title="Competitor alerts" />
        <Field label="Name" value={alert.name} onChange={name => setAlert({ ...alert, name })} />
        <TextArea label="Query" value={alert.query} onChange={query => setAlert({ ...alert, query })} />
        <SelectField label="Cadence" value={alert.cadence} onChange={cadence => setAlert({ ...alert, cadence })} options={['manual', 'daily', 'weekly']} />
        <Button className="mt-5" type="submit">Save alert</Button>
      </form>
      <form className="rounded-lg border border-border bg-card p-5" onSubmit={event => { event.preventDefault(); void runWithState('pitch', () => analyzePitchDeck(pitch), 'Pitch deck analyzed.'); }}>
        <PanelTitle icon={ChartLine} title="Pitch deck" />
        <Field label="Title" value={pitch.title} onChange={title => setPitch({ ...pitch, title })} />
        <TextArea label="Deck notes" value={pitch.deckNotes} onChange={deckNotes => setPitch({ ...pitch, deckNotes })} minHeight="min-h-40" />
        <Button className="mt-5" type="submit" disabled={busyAction === 'pitch'}>Analyze</Button>
      </form>
      <form className="rounded-lg border border-border bg-card p-5" onSubmit={event => { event.preventDefault(); void runWithState('captable', () => saveCapTable(capTable), 'Cap table saved.'); }}>
        <PanelTitle icon={UsersThree} title="Cap table" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scenario" value={capTable.name} onChange={name => setCapTable({ ...capTable, name })} />
          <Field label="Post-money valuation" type="number" value={String(capTable.postMoneyValuation)} onChange={value => setCapTable({ ...capTable, postMoneyValuation: Number(value) })} />
          <Field label="Founder %" type="number" value={String(capTable.founderOwnershipPercent)} onChange={value => setCapTable({ ...capTable, founderOwnershipPercent: Number(value) })} />
          <Field label="Investor %" type="number" value={String(capTable.investorOwnershipPercent)} onChange={value => setCapTable({ ...capTable, investorOwnershipPercent: Number(value) })} />
          <Field label="Option pool %" type="number" value={String(capTable.optionPoolPercent)} onChange={value => setCapTable({ ...capTable, optionPoolPercent: Number(value) })} />
        </div>
        <TextArea label="Notes" value={capTable.notes} onChange={notes => setCapTable({ ...capTable, notes })} />
        <Button className="mt-5" type="submit">Save scenario</Button>
      </form>
      <section className="rounded-lg border border-border bg-card p-5 xl:col-span-2">
        <PanelTitle icon={UsersThree} title="Investor database" />
        <Input value={investorQuery} onChange={event => setInvestorQuery(event.target.value)} placeholder="Search investors" />
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {investors.slice(0, 12).map(investor => (
            <article key={investor.id} className="rounded-md border border-border bg-background p-4">
              <h3 className="font-medium">{investor.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{investor.stage} - {investor.ticketSize}</p>
              <p className="mt-2 text-xs text-muted-foreground">{investor.sectors.join(', ')}</p>
            </article>
          ))}
        </div>
      </section>
      <AlertList state={state} busyAction={busyAction} runWithState={runWithState} />
    </div>
  );
}

function ModelsPanel({ settings, setSettings, busyAction, runWithState }: { settings: ModelSettings; setSettings: (value: ModelSettings) => void; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [emailApiKey, setEmailApiKey] = useState('');
  const [integration, setIntegration] = useState({ name: '', kind: 'mcp', baseUrl: 'http://localhost:3000', enabled: true });
  const update = (patch: Partial<ModelSettings>) => setSettings({ ...settings, ...patch });
  const settingsPayload: ModelSettingsUpdate = { ...settings, openaiApiKey, firecrawlApiKey, emailApiKey };
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={event => {
          event.preventDefault();
          void runWithState('models', () => saveModelSettings(settingsPayload), 'Model and connector settings saved.');
        }}
      >
        <PanelTitle icon={HardDrives} title="Model and connectors" />
        <div className="grid gap-4 lg:grid-cols-2">
          <SelectField label="Provider" value={settings.provider} onChange={provider => update({ provider })} options={['ollama', 'openai_compatible']} />
          <SelectField label="Council" value={settings.councilMode} onChange={councilMode => update({ councilMode })} options={['off', 'review_only', 'high_risk_only', 'full_council']} />
          <Field label="Ollama URL" value={settings.ollamaBaseUrl} onChange={ollamaBaseUrl => update({ ollamaBaseUrl })} />
          <Field label="Ollama model" value={settings.ollamaModel} onChange={ollamaModel => update({ ollamaModel })} />
          <Field label="OpenAI-compatible URL" value={settings.openaiBaseUrl} onChange={openaiBaseUrl => update({ openaiBaseUrl })} />
          <Field label="OpenAI-compatible model" value={settings.openaiModel} onChange={openaiModel => update({ openaiModel })} />
          <Field label={settings.openaiApiKeySaved ? 'Replace model key' : 'Model API key'} value={openaiApiKey} type="password" onChange={setOpenaiApiKey} />
          <Field label="Max tokens" type="number" value={String(settings.maxRunTokens)} onChange={value => update({ maxRunTokens: Number(value) })} />
          <SelectField label="Research provider" value={settings.researchProvider} onChange={researchProvider => update({ researchProvider })} options={['llm', 'firecrawl']} />
          <Field label="Firecrawl URL" value={settings.firecrawlBaseUrl} onChange={firecrawlBaseUrl => update({ firecrawlBaseUrl })} />
          <Field label={settings.firecrawlApiKeySaved ? 'Replace Firecrawl key' : 'Firecrawl API key'} value={firecrawlApiKey} type="password" onChange={setFirecrawlApiKey} />
          <SelectField label="Email provider" value={settings.emailProvider} onChange={emailProvider => update({ emailProvider })} options={['none', 'resend', 'sendgrid']} />
          <Field label={settings.emailApiKeySaved ? 'Replace email key' : 'Email API key'} value={emailApiKey} type="password" onChange={setEmailApiKey} />
          <Field label="Sender email" value={settings.emailFrom} onChange={emailFrom => update({ emailFrom })} />
          <Field label="Sender name" value={settings.emailFromName} onChange={emailFromName => update({ emailFromName })} />
        </div>
        <Button className="mt-5" type="submit" disabled={busyAction === 'models'}>Save settings</Button>
      </form>
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={event => {
          event.preventDefault();
          void runWithState('integration', () => saveIntegration(integration), 'Integration saved.');
        }}
      >
        <PanelTitle icon={Plugs} title="Local integrations" />
        <Field label="Name" value={integration.name} onChange={name => setIntegration({ ...integration, name })} />
        <SelectField label="Type" value={integration.kind} onChange={kind => setIntegration({ ...integration, kind })} options={['mcp', 'webhook', 'notion', 'crm', 'custom']} />
        <Field label="Base URL" value={integration.baseUrl} onChange={baseUrl => setIntegration({ ...integration, baseUrl })} />
        <Button className="mt-5" type="submit">Save integration</Button>
      </form>
    </div>
  );
}

function HistoryPanel({ state, busyAction, refresh, setError, setMessage, setBusyAction }: { state: DesktopState; busyAction: string; refresh: () => Promise<void>; setError: (value: string) => void; setMessage: (value: string) => void; setBusyAction: (value: string) => void }) {
  const [workflowType, setWorkflowType] = useState('operations');
  const [objective, setObjective] = useState('');
  const [latestRun, setLatestRun] = useState<WorkflowRun | null>(state.workflowRuns[0] ?? null);
  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form
        className="rounded-lg border border-border bg-card p-5"
        onSubmit={async event => {
          event.preventDefault();
          setBusyAction('workflow');
          setError('');
          setMessage('');
          try {
            const run = await runBusinessWorkflow({ workflowType, objective });
            setLatestRun(run);
            await refresh();
            setMessage(run.status === 'completed' ? 'Workflow completed.' : 'Workflow finished with errors.');
          } catch (error) {
            setError(errorMessage(error, 'Workflow failed'));
          } finally {
            setBusyAction('');
          }
        }}
      >
        <PanelTitle icon={FlowArrow} title="Workflow run" />
        <SelectField label="Type" value={workflowType} onChange={setWorkflowType} options={['operations', 'finance', 'legal', 'sales', 'strategy']} />
        <TextArea label="Objective" value={objective} onChange={setObjective} minHeight="min-h-40" />
        <Button className="mt-5" type="submit" disabled={busyAction === 'workflow' || !objective.trim()}>Run workflow</Button>
      </form>
      <div className="space-y-4">
        {latestRun && <RunCard run={latestRun} />}
        {state.workflowRuns.map(run => <RunCard key={run.id} run={run} />)}
      </div>
    </div>
  );
}

function CampaignList({ campaigns, busyAction, runWithState }: { campaigns: Campaign[]; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <PanelTitle icon={EnvelopeSimple} title="Campaigns" />
      <div className="grid gap-3">
        {campaigns.map(campaign => (
          <article key={campaign.id} className="rounded-md border border-border bg-background p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-medium">{campaign.name}</h3>
                <p className="text-xs text-muted-foreground">{campaign.mode} - {campaign.status}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={busyAction === 'generate'} onClick={() => void runWithState('generate', () => generateCampaignEmails({ campaignId: campaign.id }), 'Campaign emails generated.')}>Generate</Button>
                <Button size="sm" variant="outline" disabled={busyAction === 'send'} onClick={() => void runWithState('send', () => sendCampaignEmails({ campaignId: campaign.id }), 'Campaign send attempted.')}>Send</Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AlertList({ state, busyAction, runWithState }: { state: DesktopState; busyAction: string; runWithState: (label: string, action: () => Promise<DesktopState>, success: string) => Promise<void> }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5 xl:col-span-2">
      <PanelTitle icon={Bell} title="Alerts" />
      <div className="grid gap-3 lg:grid-cols-2">
        {state.alerts.map(alert => (
          <article key={alert.id} className="rounded-md border border-border bg-background p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-medium">{alert.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{alert.query}</p>
              </div>
              <Button size="sm" variant="outline" disabled={busyAction === 'alert-run'} onClick={() => void runWithState('alert-run', () => runAlertNow(alert.id), 'Alert refreshed.')}>Run</Button>
            </div>
            {alert.lastResult && <pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">{alert.lastResult}</pre>}
          </article>
        ))}
      </div>
    </section>
  );
}

function RunCard({ run }: { run: WorkflowRun }) {
  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{run.workflowType}</h2>
        <Badge variant={run.status === 'completed' ? 'success' : 'warning'}>{run.status}</Badge>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{run.objective}</p>
      {run.output && <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">{run.output}</pre>}
      {run.error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{run.error}</p>}
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
                  <td key={`${title}-${index}-${cellIndex}`} className="max-w-72 truncate px-3 py-2">{cell}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-5 text-center text-muted-foreground">Empty</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PanelTitle({ icon: Icon, title }: { icon: typeof ShieldCheck; title: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <h2 className="text-lg font-semibold tracking-normal">{title}</h2>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: { label: string; value: string; type?: string; placeholder?: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function TextArea({ label, value, onChange, minHeight = 'min-h-28' }: { label: string; value: string; minHeight?: string; onChange: (value: string) => void }) {
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return (
    <div className="min-w-0 space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <textarea
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        className={`${minHeight} w-full resize-y rounded-lg border border-input bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20`}
      />
    </div>
  );
}

function SelectField({ label, value, onChange, options, labels = {} }: { label: string; value: string; options: string[]; labels?: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option} value={option}>{labels[option] ?? option.replaceAll('_', ' ')}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} />
    </label>
  );
}

function Notice({ tone, text }: { tone: 'warning' | 'error' | 'success'; text: string }) {
  const classes = tone === 'error'
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
        <div key={label} className="flex min-w-0 items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
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

function titleForView(view: View): string {
  if (view === 'activation') return 'Activation';
  if (view === 'workspace') return 'Startup Workspace';
  if (view === 'chat') return 'Agent Chat';
  if (view === 'rag') return 'RAG Knowledge';
  if (view === 'research') return 'Research';
  if (view === 'outreach') return 'Outreach';
  if (view === 'tools') return 'Business Tools';
  if (view === 'models') return 'Models And Connectors';
  return 'History';
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  return fallback;
}
