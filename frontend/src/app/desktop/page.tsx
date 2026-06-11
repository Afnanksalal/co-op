'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Brain,
  CheckCircle,
  Database,
  Desktop,
  FlowArrow,
  HardDrives,
  Plugs,
  ShieldCheck,
  Warning,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  activateLicense,
  clearActivation,
  getActivationState,
  heartbeatLicense,
  isTauriRuntime,
  runBusinessWorkflow,
  saveModelSettings,
  type DesktopState,
  type ModelSettings,
  type WorkflowRun,
} from '@/lib/desktop/runtime';

type View = 'operations' | 'activation' | 'models' | 'history';

export default function DesktopPage() {
  const [view, setView] = useState<View>('operations');
  const [state, setState] = useState<DesktopState | null>(null);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [workflowType, setWorkflowType] = useState('operations');
  const [objective, setObjective] = useState('');
  const [latestRun, setLatestRun] = useState<WorkflowRun | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [busyAction, setBusyAction] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const runtimeAvailable = isTauriRuntime();

  useEffect(() => {
    void loadState();
  }, []);

  const navItems = useMemo(
    () => [
      { id: 'operations' as const, label: 'Operations', icon: FlowArrow },
      { id: 'activation' as const, label: 'Activation', icon: ShieldCheck },
      { id: 'models' as const, label: 'Models', icon: Plugs },
      { id: 'history' as const, label: 'History', icon: Database },
    ],
    [],
  );

  async function loadState() {
    setError('');
    try {
      const nextState = await getActivationState();
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setLatestRun(nextState.workflowRuns[0] ?? null);
      if (!nextState.activation) setView('activation');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load desktop state');
    }
  }

  async function handleActivation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('activate');
    setError('');
    setMessage('');

    try {
      const nextState = await activateLicense({
        licenseKey: licenseKey.trim(),
      });
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setLicenseKey('');
      setMessage('Activation saved locally.');
      setView('operations');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Activation failed');
    } finally {
      setBusyAction('');
    }
  }

  async function runHeartbeat() {
    setBusyAction('heartbeat');
    setError('');
    setMessage('');
    try {
      const nextState = await heartbeatLicense();
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setMessage('Heartbeat refreshed.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Heartbeat failed');
    } finally {
      setBusyAction('');
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
    setBusyAction('settings');
    setError('');
    setMessage('');

    try {
      const nextState = await saveModelSettings({
        ...settings,
        openaiApiKey: apiKeyInput.trim() ? apiKeyInput.trim() : undefined,
      });
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setMessage('Model routing saved locally.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Saving settings failed');
    } finally {
      setBusyAction('');
    }
  }

  async function clearLocalActivation() {
    setBusyAction('clear');
    setError('');
    setMessage('');

    try {
      const nextState = await clearActivation();
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setLatestRun(nextState.workflowRuns[0] ?? null);
      setMessage('Local activation cleared.');
      setView('activation');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not clear activation');
    } finally {
      setBusyAction('');
    }
  }

  async function runWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyAction('workflow');
    setError('');
    setMessage('');

    try {
      const run = await runBusinessWorkflow({ workflowType, objective });
      setLatestRun(run);
      const nextState = await getActivationState();
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setMessage(run.status === 'completed' ? 'Workflow completed.' : 'Workflow finished with errors.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Workflow failed');
    } finally {
      setBusyAction('');
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="grid min-h-screen grid-cols-[248px_1fr]">
        <aside className="flex min-h-screen flex-col border-r border-border bg-card">
          <div className="border-b border-border px-5 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Desktop className="h-5 w-5" weight="bold" />
              </div>
              <div>
                <p className="text-base font-semibold">Co-Op Desktop</p>
                <p className="text-xs text-muted-foreground">Local runtime</p>
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
                  view === id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          <div className="border-t border-border p-4">
            <Badge className={state?.isUsable ? 'badge-success' : 'badge-warning'}>
              {state?.isUsable ? 'Licensed' : 'Activation required'}
            </Badge>
            <p className="mt-3 truncate text-xs text-muted-foreground">
              {state?.activation?.customerEmail ?? state?.installId ?? 'Loading'}
            </p>
          </div>
        </aside>

        <section className="min-w-0 bg-background">
          <header className="flex h-16 items-center justify-between border-b border-border px-6">
            <div>
              <h1 className="text-xl font-semibold tracking-normal">{titleForView(view)}</h1>
              <p className="text-xs text-muted-foreground">{state?.installId ?? 'Loading local state'}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void loadState()} disabled={busyAction !== ''}>
              Refresh
            </Button>
          </header>

          <div className="p-6">
            {!runtimeAvailable && (
              <div className="mb-5 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
                <Warning weight="fill" className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Desktop runtime unavailable in browser preview.</p>
              </div>
            )}

            {view === 'operations' && (
              <OperationsView
                state={state}
                settings={settings}
                workflowType={workflowType}
                objective={objective}
                latestRun={latestRun}
                busyAction={busyAction}
                onWorkflowTypeChange={setWorkflowType}
                onObjectiveChange={setObjective}
                onRunWorkflow={runWorkflow}
                onActivate={() => setView('activation')}
              />
            )}

            {view === 'activation' && (
              <ActivationView
                state={state}
                licenseKey={licenseKey}
                busyAction={busyAction}
                runtimeAvailable={runtimeAvailable}
                onLicenseKeyChange={setLicenseKey}
                onActivate={handleActivation}
                onHeartbeat={runHeartbeat}
                onClearActivation={clearLocalActivation}
              />
            )}

            {view === 'models' && (
              <ModelsView
                settings={settings}
                apiKeyInput={apiKeyInput}
                busyAction={busyAction}
                onSettingsChange={setSettings}
                onApiKeyChange={setApiKeyInput}
                onSave={saveSettings}
              />
            )}

            {view === 'history' && <HistoryView runs={state?.workflowRuns ?? []} />}

            {(message || error) && (
              <p className={`mt-5 rounded-md p-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
                {error || message}
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function OperationsView({
  state,
  settings,
  workflowType,
  objective,
  latestRun,
  busyAction,
  onWorkflowTypeChange,
  onObjectiveChange,
  onRunWorkflow,
  onActivate,
}: {
  state: DesktopState | null;
  settings: ModelSettings | null;
  workflowType: string;
  objective: string;
  latestRun: WorkflowRun | null;
  busyAction: string;
  onWorkflowTypeChange: (value: string) => void;
  onObjectiveChange: (value: string) => void;
  onRunWorkflow: (event: FormEvent<HTMLFormElement>) => void;
  onActivate: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-4">
        <StatusCard label="License" value={state?.activation?.plan ?? 'Not activated'} icon={ShieldCheck} />
        <StatusCard label="Data plane" value="Local" icon={Database} />
        <StatusCard label="Provider" value={settings?.provider ?? 'ollama'} icon={Plugs} />
        <StatusCard label="Review gate" value={settings?.councilMode ?? 'review_only'} icon={Brain} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <form onSubmit={onRunWorkflow} className="min-w-0 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-normal">
            <FlowArrow className="h-5 w-5" />
            Workflow
          </h2>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={workflowType} onValueChange={onWorkflowTypeChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="strategy">Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desktop-objective">Objective</Label>
              <textarea
                id="desktop-objective"
                value={objective}
                onChange={event => onObjectiveChange(event.target.value)}
                className="min-h-32 w-full resize-y rounded-lg border border-input bg-card/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-200 focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Summarize overdue invoices and draft follow-up actions."
                required
              />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={!state?.isUsable || busyAction === 'workflow' || !objective.trim()}>
              {busyAction === 'workflow' ? 'Running...' : 'Run workflow'}
            </Button>
            {!state?.activation && (
              <Button type="button" variant="outline" onClick={onActivate}>
                Activate
              </Button>
            )}
          </div>
        </form>

        <LatestRun run={latestRun} />
      </div>
    </div>
  );
}

function ActivationView({
  state,
  licenseKey,
  busyAction,
  runtimeAvailable,
  onLicenseKeyChange,
  onActivate,
  onHeartbeat,
  onClearActivation,
}: {
  state: DesktopState | null;
  licenseKey: string;
  busyAction: string;
  runtimeAvailable: boolean;
  onLicenseKeyChange: (value: string) => void;
  onActivate: (event: FormEvent<HTMLFormElement>) => void;
  onHeartbeat: () => void;
  onClearActivation: () => void;
}) {
  return (
    <div className="grid max-w-3xl gap-6 2xl:max-w-none 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.75fr)]">
      <section className="order-2 min-w-0 rounded-lg border border-border bg-card p-5 2xl:order-1">
        <h2 className="text-lg font-semibold tracking-normal">Entitlement</h2>
        <div className="mt-4 space-y-3 text-sm">
          <Row label="Email" value={state?.activation?.customerEmail ?? 'Not activated'} />
          <Row label="Plan" value={state?.activation?.plan ?? 'Unavailable'} />
          <Row label="Status" value={state?.activation?.status ?? 'Unavailable'} />
          <Row label="Install ID" value={state?.installId ?? 'Loading'} />
          <Row
            label="Offline grace"
            value={state?.activation ? new Date(state.activation.offlineGraceEndsAt).toLocaleString() : 'Unavailable'}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={onHeartbeat} disabled={!state?.activation || !runtimeAvailable || busyAction === 'heartbeat'}>
            {busyAction === 'heartbeat' ? 'Refreshing...' : 'Heartbeat'}
          </Button>
          <Button variant="outline" onClick={onClearActivation} disabled={!state?.activation || busyAction === 'clear'}>
            Clear local activation
          </Button>
        </div>
      </section>

      <form onSubmit={onActivate} className="order-1 min-w-0 rounded-lg border border-border bg-card p-5 2xl:order-2">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-normal">
          <ShieldCheck className="h-5 w-5" />
          Activate
        </h2>
        <div className="grid gap-4">
          <Field label="License key" value={licenseKey} placeholder="COOP-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" onChange={onLicenseKeyChange} />
        </div>
        <Button type="submit" className="mt-5" disabled={!runtimeAvailable || busyAction === 'activate' || !licenseKey.trim()}>
          {busyAction === 'activate' ? 'Activating...' : 'Activate this install'}
        </Button>
      </form>
    </div>
  );
}

function ModelsView({
  settings,
  apiKeyInput,
  busyAction,
  onSettingsChange,
  onApiKeyChange,
  onSave,
}: {
  settings: ModelSettings | null;
  apiKeyInput: string;
  busyAction: string;
  onSettingsChange: (settings: ModelSettings) => void;
  onApiKeyChange: (value: string) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!settings) {
    return <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">Loading model settings.</p>;
  }

  return (
    <form onSubmit={onSave} className="min-w-0 rounded-lg border border-border bg-card p-5">
      <div className="mb-5 flex items-center gap-3">
        <HardDrives className="h-6 w-6 text-muted-foreground" />
        <h2 className="text-lg font-semibold tracking-normal">Model routing</h2>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label>Primary provider</Label>
          <Select value={settings.provider} onValueChange={provider => onSettingsChange({ ...settings, provider })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ollama">Ollama local</SelectItem>
              <SelectItem value="openai_compatible">OpenAI-compatible BYOK</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Review gate</Label>
          <Select value={settings.councilMode} onValueChange={councilMode => onSettingsChange({ ...settings, councilMode })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="off">Off</SelectItem>
              <SelectItem value="review_only">Review only</SelectItem>
              <SelectItem value="high_risk_only">High-risk only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Field label="Ollama URL" value={settings.ollamaBaseUrl} onChange={ollamaBaseUrl => onSettingsChange({ ...settings, ollamaBaseUrl })} />
        <Field label="Ollama model" value={settings.ollamaModel} onChange={ollamaModel => onSettingsChange({ ...settings, ollamaModel })} />
        <Field label="OpenAI-compatible URL" value={settings.openaiBaseUrl} onChange={openaiBaseUrl => onSettingsChange({ ...settings, openaiBaseUrl })} />
        <Field label="OpenAI-compatible model" value={settings.openaiModel} onChange={openaiModel => onSettingsChange({ ...settings, openaiModel })} />
        <Field
          label={settings.openaiApiKeySaved ? 'Replace provider API key' : 'Provider API key'}
          value={apiKeyInput}
          type="password"
          placeholder={settings.openaiApiKeySaved ? 'Saved locally' : 'Required for BYOK'}
          onChange={onApiKeyChange}
        />
        <Field
          label="Max tokens per run"
          value={String(settings.maxRunTokens)}
          type="number"
          onChange={maxRunTokens => onSettingsChange({ ...settings, maxRunTokens: Number(maxRunTokens) })}
        />
      </div>

      <Button
        type="submit"
        className="mt-5"
        disabled={busyAction === 'settings' || (settings.provider === 'openai_compatible' && !settings.openaiApiKeySaved && !apiKeyInput.trim())}
      >
        {busyAction === 'settings' ? 'Saving...' : 'Save model routing'}
      </Button>
    </form>
  );
}

function HistoryView({ runs }: { runs: WorkflowRun[] }) {
  if (runs.length === 0) {
    return <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">No workflow runs yet.</p>;
  }

  return (
    <div className="space-y-4">
      {runs.map(run => (
    <section key={run.id} className="min-w-0 rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-normal">{run.workflowType}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(run.createdAt).toLocaleString()} via {run.provider}</p>
            </div>
            <Badge className={run.status === 'completed' ? 'badge-success' : 'badge-warning'}>{run.status}</Badge>
          </div>
          <p className="mt-4 line-clamp-2 text-sm text-muted-foreground">{run.objective}</p>
          {run.output && <pre className="mt-4 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">{run.output}</pre>}
          {run.error && <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">{run.error}</p>}
        </section>
      ))}
    </div>
  );
}

function LatestRun({ run }: { run: WorkflowRun | null }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5">
      <h2 className="text-lg font-semibold tracking-normal">Latest run</h2>
      {run ? (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={run.status === 'completed' ? 'badge-success' : 'badge-warning'}>{run.status}</Badge>
            <span className="text-sm text-muted-foreground">{run.workflowType} via {run.provider}</span>
          </div>
          <div className="grid gap-2">
            {run.steps.map(step => (
              <div key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 text-green-500" />
                <span>{step}</span>
              </div>
            ))}
          </div>
          {run.output && <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">{run.output}</pre>}
          {run.error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{run.error}</p>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No workflow runs yet.</p>
      )}
    </section>
  );
}

function StatusCard({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
  return (
    <section className="min-w-0 rounded-lg border border-border bg-card p-5">
      <Icon className="mb-5 h-6 w-6 text-muted-foreground" />
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-base font-semibold">{value}</p>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 max-w-[68%] truncate text-right font-medium">{value}</span>
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
      <Input id={id} type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </div>
  );
}

function titleForView(view: View): string {
  if (view === 'activation') return 'Activation';
  if (view === 'models') return 'Model Routing';
  if (view === 'history') return 'Run History';
  return 'Operations';
}
