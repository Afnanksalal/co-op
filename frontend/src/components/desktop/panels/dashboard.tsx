'use client';

import type { ReactNode } from 'react';
import { Brain, Briefcase, ChartBar, ChartLine, EnvelopeSimple, FlowArrow, HardDrives, Key, MagnifyingGlass, ShieldCheck, Sparkle, UsersThree } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DesktopState } from '@/lib/desktop/runtime';
import type { View } from '../shell-types';
import { EmptyState, PanelTitle } from '../shared';
import { MarkdownOutput, markdownToPlainText } from '../markdown';
import { providerDisplay, researchProviderDisplay, reviewModeDisplay, workspaceCompletion } from '../utils';
import { RunCard } from './history';

export function DashboardPanel({
  state,
  onNavigate,
}: {
  state: DesktopState;
  onNavigate: (view: View) => void;
}) {
  const workspaceScore = workspaceCompletion(state.workspace);
  const latestRun = state.workflowRuns[0];
  const latestResearch = state.researchRuns[0];
  const nextBestAction =
    workspaceScore < 70
      ? {
          label: 'Finish the company profile',
          detail: 'Co-Op gives better answers when it knows your customer, offer, and goals.',
          view: 'workspace' as const,
          button: 'Finish profile',
        }
      : state.documents.length === 0
        ? {
            label: 'Add your first company file',
            detail:
              'Upload notes, policies, decks, call notes, or research so answers use real context.',
            view: 'rag' as const,
            button: 'Add a file',
          }
        : state.workflowRuns.length === 0
          ? {
              label: 'Start a simple plan',
              detail: 'Turn one messy decision into owners, risks, and next steps.',
              view: 'history' as const,
              button: 'Start a plan',
            }
          : {
              label: 'Ask Co-Op what to do next',
              detail: 'Use your saved company context to review priorities or draft the next move.',
              view: 'chat' as const,
              button: 'Ask now',
            };
  const metrics = [
    {
      label: 'Files',
      value: state.documents.length,
      icon: HardDrives,
      tone: 'text-blue-600 dark:text-blue-300',
      view: 'rag' as const,
    },
    {
      label: 'Customers',
      value: state.leads.length,
      icon: UsersThree,
      tone: 'text-green-600 dark:text-green-300',
      view: 'outreach' as const,
    },
    {
      label: 'Outreach',
      value: state.campaigns.length,
      icon: EnvelopeSimple,
      tone: 'text-purple-600 dark:text-purple-300',
      view: 'outreach' as const,
    },
    {
      label: 'Plans',
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
      text: 'Priorities, hiring, follow-ups, and internal systems',
    },
    {
      label: 'Finance',
      type: 'finance',
      icon: ChartLine,
      text: 'Cash, pricing, runway, and funding decisions',
    },
    {
      label: 'Legal and risk',
      type: 'legal',
      icon: ShieldCheck,
      text: 'Contracts, compliance, policies, and approvals',
    },
    {
      label: 'Sales',
      type: 'sales',
      icon: EnvelopeSimple,
      text: 'Customers, outreach, pipeline, and replies',
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
      label: 'Assistant setup',
      detail:
        state.modelSettings.provider === 'ollama'
          ? 'Runs on this computer'
          : 'Uses your private key',
      status: 'ready',
      view: 'settings' as const,
    },
    {
      label: 'Customers',
      detail:
        state.leads.length > 0
          ? `${state.leads.length} leads, ${state.campaigns.length} campaigns`
          : 'No prospects saved yet',
      status: state.leads.length > 0 ? 'ready' : 'attention',
      view: 'outreach' as const,
    },
  ];
  const hasSetupWork = workspaceScore < 100 || actionItems.some((item) => item.status !== 'ready');

  return (
    <div className="space-y-5">
      <section className={`grid gap-4 ${hasSetupWork ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}>
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
              <h2 className="mt-4 text-2xl font-semibold tracking-normal">
                {state.workspace.companyName || 'Your business today'}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                One private place for company context, plans, research, customer outreach, and
                practical decisions.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OperationalStatus label="Profile" value={`${workspaceScore}%`} />
                <OperationalStatus
                  label="Assistant"
                  value={providerDisplay(state.modelSettings.provider)}
                />
                <OperationalStatus label="Files" value={String(state.documents.length)} />
                <OperationalStatus label="Plans" value={String(state.workflowRuns.length)} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate('chat')}>
                <Sparkle className="h-4 w-4" weight="fill" />
                Ask
              </Button>
              <Button variant="outline" onClick={() => onNavigate('history')}>
                <FlowArrow className="h-4 w-4" />
                Start plan
              </Button>
            </div>
          </div>
        </section>

        {hasSetupWork && (
          <section className="rounded-lg border border-border/50 bg-card p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <PanelTitle icon={ChartBar} title="Best next step" compact />
              <Badge variant={workspaceScore >= 70 ? 'success' : 'warning'}>
                {workspaceScore >= 70 ? 'Ready' : 'Needs setup'}
              </Badge>
            </div>
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h3 className="font-medium">{nextBestAction.label}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {nextBestAction.detail}
              </p>
              <Button className="mt-4" size="sm" onClick={() => onNavigate(nextBestAction.view)}>
                {nextBestAction.button}
              </Button>
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
                    {item.status === 'ready' ? 'Ready' : 'To do'}
                  </Badge>
                </button>
              ))}
            </div>
          </section>
        )}
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
          <PanelTitle icon={Brain} title="Ask by business area" compact />
          <Button variant="ghost" size="sm" onClick={() => onNavigate('chat')}>
            Ask
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
          title="Latest plan"
          action="All plans"
          onAction={() => onNavigate('history')}
        >
          {latestRun ? (
            <RunCard run={latestRun} compact />
          ) : (
            <EmptyState
              icon={FlowArrow}
              title="No plans yet"
              text="Start with a decision, review, launch, or operating question."
              action="Start plan"
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
                <Badge variant="secondary">
                  {researchProviderDisplay(latestResearch.provider)}
                </Badge>
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {markdownToPlainText(latestResearch.summary)}
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

export function LoadingWorkbench() {
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

export function LockedPanel({ onActivate }: { onActivate: () => void }) {
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
