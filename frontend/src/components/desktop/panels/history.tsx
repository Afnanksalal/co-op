'use client';

import { type FormEvent, useState } from 'react';

import { FlowArrow } from '@phosphor-icons/react';

import { Badge } from '@/components/ui/badge';

import { Button } from '@/components/ui/button';

import { runBusinessWorkflow, type DesktopState, type WorkflowRun } from '@/lib/desktop/runtime';

import { roleLabels } from '../constants';

import { DesktopPage, EmptyState, PanelTitle, SelectField, TextArea } from '../shared';

import { MarkdownOutput, markdownToPlainText } from '../markdown';

import {
  advisorDisplay,
  errorMessage,
  providerDisplay,
  riskDisplay,
  runStatusDisplay,
  traceStageDisplay,
} from '../utils';

export function HistoryPanel({
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
    <DesktopPage>
      <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <form
          className="rounded-lg border border-border bg-card p-5 xl:sticky xl:top-0"
          onSubmit={async (event) => {
            event.preventDefault();

            setBusyAction('workflow');

            setError('');

            setMessage('');

            try {
              const run = await runBusinessWorkflow({ workflowType, objective });

              setLatestRun(run);

              await refresh();

              setMessage(run.status === 'completed' ? 'Plan completed.' : 'Plan needs attention.');
            } catch (error) {
              setError(errorMessage(error, 'Plan failed'));
            } finally {
              setBusyAction('');
            }
          }}
        >
          <PanelTitle icon={FlowArrow} title="Start a plan" />

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
            Start plan
          </Button>
        </form>

        <section className="min-w-0 space-y-4">
          {latestRun && <RunCard run={latestRun} />}

          {visibleRuns.map((run) => (
            <RunCard key={run.id} run={run} />
          ))}

          {!latestRun && visibleRuns.length === 0 && (
            <EmptyState
              icon={FlowArrow}
              title="No plans yet"
              text="Start with a decision, plan, review, or operating question."
            />
          )}
        </section>
      </div>
    </DesktopPage>
  );
}

export function RunCard({ run, compact = false }: { run: WorkflowRun; compact?: boolean }) {
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

  const completedSteps = trace.filter((event) => event.status === 'completed').length;

  const skippedSteps = trace.filter((event) => event.status === 'skipped').length;

  if (compact) {
    return (
      <article className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-semibold">{advisorDisplay(run.workflowType)} plan</h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {riskDisplay(run.riskLevel)} - {trace.length} checks
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {run.approvalRequired && <Badge variant="warning">Needs approval</Badge>}

            <Badge variant={run.status === 'completed' ? 'success' : 'warning'}>
              {runStatusDisplay(run.status)}
            </Badge>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">{run.objective}</p>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <CompactRunStat label="Done" value={String(completedSteps)} />

          <CompactRunStat label="Skipped" value={String(skippedSteps)} />

          <CompactRunStat
            label="Updated"
            value={new Date(run.completedAt ?? run.createdAt).toLocaleDateString()}
          />
        </div>

        {run.output && (
          <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">
            {markdownToPlainText(run.output)}
          </p>
        )}
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">{advisorDisplay(run.workflowType)} plan</h2>

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
        <MarkdownOutput
          text={run.output}
          className="coop-scrollbar mt-4 max-h-72 overflow-auto rounded-md border border-border bg-background p-4"
        />
      )}

      {run.error && (
        <p className="mt-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {run.error}
        </p>
      )}
    </article>
  );
}

function CompactRunStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/50 bg-muted/35 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>

      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
