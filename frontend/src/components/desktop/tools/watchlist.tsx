'use client';

import { Bell } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { runAlertNow, saveAlert, type DesktopState } from '@/lib/desktop/runtime';
import { EmptyState, Field, PanelTitle, SelectField, TextArea } from '../shared';
import { MarkdownOutput } from '../markdown';
import type { RunWithState, WatchlistSurfaceProps } from './types';

export function WatchlistSurface({
  state,
  alert,
  busyAction,
  runWithState,
  onAlertChange,
}: WatchlistSurfaceProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState('alert', () => saveAlert(alert), 'Alert saved.');
        }}
      >
        <PanelTitle icon={Bell} title="Watchlist" />
        <Field
          label="Name"
          value={alert.name}
          onChange={(name) => onAlertChange({ ...alert, name })}
        />
        <TextArea
          label="Query"
          value={alert.query}
          onChange={(query) => onAlertChange({ ...alert, query })}
        />
        <SelectField
          label="Cadence"
          value={alert.cadence}
          onChange={(cadence) => onAlertChange({ ...alert, cadence })}
          options={['manual', 'daily', 'weekly']}
        />
        <Button className="mt-5" type="submit">
          Save alert
        </Button>
      </form>
      <AlertList state={state} busyAction={busyAction} runWithState={runWithState} framed={false} />
    </div>
  );
}

export function AlertList({
  state,
  busyAction,
  runWithState,
  framed = true,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: RunWithState;
  framed?: boolean;
}) {
  const content = (
    <>
      <PanelTitle icon={Bell} title="Watchlist" compact={!framed} />
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
              <MarkdownOutput
                text={alert.lastResult}
                compact
                className="coop-scrollbar mt-3 max-h-44 overflow-auto rounded-md bg-muted p-3 text-xs"
              />
            )}
          </article>
        ))}
        {state.alerts.length === 0 && (
          <EmptyState
            icon={Bell}
            title="No saved watch items"
            text="Save competitor or market questions and run them when needed."
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
