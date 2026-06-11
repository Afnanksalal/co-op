'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Brain, CheckCircle, Database, FlowArrow, HardDrives, Plugs, ShieldCheck, Warning } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clearActivation, getActivationState, heartbeatLicense, isTauriRuntime, runBusinessWorkflow, saveModelSettings, type DesktopState, type ModelSettings, type WorkflowRun } from '@/lib/desktop/runtime';

export default function LocalConsolePage() {
  const [state, setState] = useState<DesktopState | null>(null);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [workflowType, setWorkflowType] = useState('operations');
  const [objective, setObjective] = useState('');
  const [latestRun, setLatestRun] = useState<WorkflowRun | null>(null);
  const [isRunningWorkflow, setIsRunningWorkflow] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getActivationState()
      .then(nextState => {
        setState(nextState);
        setSettings(nextState.modelSettings);
        setApiKeyInput('');
        setLatestRun(nextState.workflowRuns[0] ?? null);
      })
      .catch(error => setError(String(error)));
  }, []);

  async function runHeartbeat() {
    setError('');
    setMessage('');
    try {
      const nextState = await heartbeatLicense();
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setMessage('License heartbeat refreshed.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Heartbeat failed');
    }
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!settings) return;
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
      setMessage('Model routing settings saved locally.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Saving settings failed');
    }
  }

  async function logoutLocal() {
    const nextState = await clearActivation();
    setState(nextState);
    setSettings(nextState.modelSettings);
    setApiKeyInput('');
    setLatestRun(nextState.workflowRuns[0] ?? null);
  }

  async function runWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsRunningWorkflow(true);

    try {
      const run = await runBusinessWorkflow({ workflowType, objective });
      setLatestRun(run);
      const nextState = await getActivationState();
      setState(nextState);
      setSettings(nextState.modelSettings);
      setApiKeyInput('');
      setMessage(run.status === 'completed' ? 'Workflow completed locally.' : 'Workflow run finished with errors.');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Workflow failed');
    } finally {
      setIsRunningWorkflow(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Co-Op
        </Link>

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-4">Local operations console</Badge>
            <h1 className="text-4xl font-semibold tracking-normal">Co-Op Desktop Runtime</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Configure the local AI data plane, provider routing, and license heartbeat for this installed machine.
            </p>
          </div>
          <Badge className={state?.isUsable ? 'badge-success' : 'badge-warning'}>
            {state?.isUsable ? 'Licensed' : 'Activation required'}
          </Badge>
        </div>

        {!isTauriRuntime() && (
          <div className="mb-6 flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700 dark:text-amber-300">
            <Warning weight="fill" className="mt-0.5 h-5 w-5 shrink-0" />
            <p>This console is in browser preview mode. Local state commands are available only in the installed desktop app.</p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-4">
          {[
            { label: 'License', value: state?.activation?.plan ?? 'Not activated', icon: ShieldCheck },
            { label: 'Data plane', value: 'Local first', icon: Database },
            { label: 'Model router', value: settings?.provider ?? 'ollama', icon: Plugs },
            { label: 'Council mode', value: settings?.councilMode ?? 'review_only', icon: Brain },
          ].map(({ label, value, icon: Icon }) => (
            <section key={label} className="rounded-lg border border-border bg-card p-5">
              <Icon className="mb-5 h-6 w-6 text-muted-foreground" />
              <p className="text-xs uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-base font-semibold">{value}</p>
            </section>
          ))}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <section className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-xl font-semibold">Entitlement</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Row label="Email" value={state?.activation?.customerEmail ?? 'Not activated'} />
              <Row label="Install id" value={state?.installId ?? 'Loading'} />
              <Row label="Offline grace" value={state?.activation ? new Date(state.activation.offlineGraceEndsAt).toLocaleString() : 'Unavailable'} />
              <Row label="Cloud URL" value={state?.activation?.cloudBaseUrl ?? 'Not connected'} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={runHeartbeat} disabled={!state?.activation || !isTauriRuntime()}>
                Refresh heartbeat
              </Button>
              <Button variant="outline" onClick={logoutLocal} disabled={!state?.activation}>
                Clear local activation
              </Button>
              {!state?.activation && (
                <Link href="/activate">
                  <Button variant="outline">Activate</Button>
                </Link>
              )}
            </div>
          </section>

          <form onSubmit={saveSettings} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-5 flex items-center gap-3">
              <HardDrives className="h-6 w-6 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">Model routing</h2>
                <p className="text-sm text-muted-foreground">Saved locally on this desktop install.</p>
              </div>
            </div>

            {settings && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Primary provider</Label>
                  <Select value={settings.provider} onValueChange={provider => setSettings({ ...settings, provider })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Ollama local</SelectItem>
                      <SelectItem value="openai_compatible">OpenAI-compatible BYOK</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Council mode</Label>
                  <Select value={settings.councilMode} onValueChange={councilMode => setSettings({ ...settings, councilMode })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="review_only">Review only</SelectItem>
                      <SelectItem value="high_risk_only">High-risk only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Field label="Ollama URL" value={settings.ollamaBaseUrl} onChange={ollamaBaseUrl => setSettings({ ...settings, ollamaBaseUrl })} />
                <Field label="Ollama model" value={settings.ollamaModel} onChange={ollamaModel => setSettings({ ...settings, ollamaModel })} />
                <Field label="OpenAI-compatible URL" value={settings.openaiBaseUrl} onChange={openaiBaseUrl => setSettings({ ...settings, openaiBaseUrl })} />
                <Field label="OpenAI-compatible model" value={settings.openaiModel} onChange={openaiModel => setSettings({ ...settings, openaiModel })} />
                <Field
                  label={settings.openaiApiKeySaved ? 'Replace provider API key' : 'Provider API key'}
                  value={apiKeyInput}
                  type="password"
                  placeholder={settings.openaiApiKeySaved ? 'Saved locally; enter a new key to replace' : 'Required for OpenAI-compatible BYOK'}
                  onChange={setApiKeyInput}
                />
                <Field label="Max tokens per run" value={String(settings.maxRunTokens)} type="number" onChange={maxRunTokens => setSettings({ ...settings, maxRunTokens: Number(maxRunTokens) })} />
              </div>
            )}

            <Button
              type="submit"
              className="mt-5"
              disabled={!settings || (settings.provider === 'openai_compatible' && !settings.openaiApiKeySaved && !apiKeyInput.trim())}
            >
              Save local settings
            </Button>
          </form>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <form onSubmit={runWorkflow} className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <FlowArrow className="h-5 w-5" />
              Run local workflow
            </h2>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Workflow type</Label>
                <Select value={workflowType} onValueChange={setWorkflowType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="legal">Legal review</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="strategy">Strategy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="objective">Objective</Label>
                <Input
                  id="objective"
                  value={objective}
                  onChange={event => setObjective(event.target.value)}
                  placeholder="Review this week's customer escalation risks and suggest next actions"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="mt-5" disabled={!state?.isUsable || isRunningWorkflow || !objective.trim()}>
              {isRunningWorkflow ? 'Running locally...' : 'Run workflow'}
            </Button>
          </form>

          <section className="rounded-lg border border-border bg-muted/30 p-5">
            <h2 className="text-xl font-semibold">Latest run</h2>
            {latestRun ? (
              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className={latestRun.status === 'completed' ? 'badge-success' : 'badge-warning'}>{latestRun.status}</Badge>
                  <span className="text-sm text-muted-foreground">{latestRun.workflowType} via {latestRun.provider}</span>
                </div>
                <div className="grid gap-2">
                  {latestRun.steps.map(step => (
                    <div key={step} className="flex items-start gap-3 text-sm text-muted-foreground">
                      <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 text-green-500" />
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
                {latestRun.output && (
                  <pre className="max-h-80 whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-6">{latestRun.output}</pre>
                )}
                {latestRun.error && <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{latestRun.error}</p>}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No workflow runs yet.</p>
            )}
          </section>
        </div>

        {(message || error) && (
          <p className={`mt-5 rounded-md p-3 text-sm ${error ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700 dark:text-green-300'}`}>
            {error || message}
          </p>
        )}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-4 border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value}</span>
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
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </div>
  );
}
