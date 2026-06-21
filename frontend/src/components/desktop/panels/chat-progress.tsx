'use client';

import { CheckCircle, Circle, DotsThreeCircle } from '@phosphor-icons/react';
import type { ChatProgressEvent } from '@/lib/desktop/runtime';
import { advisorDisplay, reviewModeDisplay } from '../utils';

export type PendingChat = {
  sessionId: string;
  prompt: string;
  agentType: string;
  a2aEnabled: boolean;
  ragEnabled: boolean;
  researchEnabled: boolean;
  councilMode: string;
  startedAt: number;
};

type ProgressRow = {
  sequence: number;
  title: string;
  detail: string;
  status: 'done' | 'active' | 'queued';
};

export function mergeChatProgressEvent(
  events: ChatProgressEvent[],
  event: ChatProgressEvent
): ChatProgressEvent[] {
  const next = events.filter((item) => item.sequence !== event.sequence);
  next.push(event);
  return next.sort((a, b) => a.sequence - b.sequence);
}

export function ChatWorkPanel({
  pending,
  events,
  tick,
}: {
  pending: PendingChat;
  events: ChatProgressEvent[];
  tick: number;
}) {
  const rows = progressRows(pending, events, tick);
  const completed = rows.filter((row) => row.status === 'done').length;
  const progress = Math.max(12, Math.round((completed / Math.max(rows.length, 1)) * 100));

  return (
    <div className="flex justify-start gap-3">
      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <DotsThreeCircle className="h-4 w-4 animate-pulse" weight="bold" />
      </div>
      <article className="w-full max-w-3xl rounded-lg border border-border/60 bg-background p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Working through it</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Co-Op is checking context, sources, and review gates before answering.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
              {advisorDisplay(pending.agentType)}
            </span>
            {pending.researchEnabled && (
              <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-primary">
                Sources on
              </span>
            )}
            {pending.ragEnabled && (
              <span className="rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
                Files on
              </span>
            )}
            <span className="rounded-full border border-border/70 px-2.5 py-1 text-muted-foreground">
              {reviewModeDisplay(pending.councilMode)}
            </span>
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className="mt-4 space-y-2">
          {rows.map((row) => (
            <li
              key={`${row.sequence}-${row.title}`}
              className={`grid grid-cols-[1.25rem_minmax(0,1fr)] gap-3 rounded-md border px-3 py-2.5 ${
                row.status === 'active'
                  ? 'border-primary/25 bg-primary/5'
                  : 'border-border/40 bg-card/50'
              }`}
            >
              <ProgressIcon status={row.status} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {row.detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}

function ProgressIcon({ status }: { status: ProgressRow['status'] }) {
  if (status === 'done') {
    return <CheckCircle className="mt-0.5 h-5 w-5 text-primary" weight="fill" />;
  }
  if (status === 'active') {
    return <DotsThreeCircle className="mt-0.5 h-5 w-5 animate-pulse text-primary" weight="bold" />;
  }
  return <Circle className="mt-0.5 h-5 w-5 text-muted-foreground/50" />;
}

function progressRows(
  pending: PendingChat,
  events: ChatProgressEvent[],
  tick: number
): ProgressRow[] {
  if (events.length > 0) {
    return events.map((event, index) => ({
      sequence: event.sequence,
      title: event.title,
      detail: event.detail,
      status: index === events.length - 1 ? 'active' : 'done',
    }));
  }

  const planned = fallbackRows(pending);
  const activeIndex = Math.min(planned.length - 1, Math.floor(tick / 2));
  return planned.map((row, index) => ({
    ...row,
    status: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'queued',
  }));
}

function fallbackRows(pending: PendingChat): Omit<ProgressRow, 'status'>[] {
  const rows: Omit<ProgressRow, 'status'>[] = [
    {
      sequence: 1,
      title: 'Understanding the request',
      detail: 'Classifying the business area and what kind of evidence is needed.',
    },
    {
      sequence: 2,
      title: 'Loading company context',
      detail: 'Using the saved profile, recent work, and local business memory.',
    },
  ];

  if (pending.ragEnabled) {
    rows.push({
      sequence: 3,
      title: 'Checking saved files',
      detail: 'Looking for private documents that match this question.',
    });
  }

  rows.push({
    sequence: 4,
    title: 'Checking remembered facts',
    detail: 'Finding useful local notes without exposing prompts, keys, or hidden settings.',
  });

  if (pending.researchEnabled) {
    rows.push(
      {
        sequence: 5,
        title: 'Searching live sources',
        detail: 'Finding current sources and filtering unrelated results.',
      },
      {
        sequence: 6,
        title: 'Parsing source fit',
        detail: 'Keeping sources that match the company and the question.',
      }
    );
  }

  rows.push({
    sequence: 7,
    title: 'Preparing the answer',
    detail: `Combining context with ${advisorDisplay(pending.agentType).toLowerCase()} guidance.`,
  });

  if (pending.a2aEnabled) {
    rows.push({
      sequence: 8,
      title: 'Running an extra check',
      detail: 'Looking for important cross-functional gaps without repeating the answer.',
    });
  }

  if (['review_only', 'full_council'].includes(pending.councilMode)) {
    rows.push({
      sequence: 9,
      title: 'Reviewing risk',
      detail: 'Checking missing facts, decisions, and next actions.',
    });
  }

  rows.push({
    sequence: 10,
    title: 'Saving the response',
    detail: 'Recording the answer locally so the next chat has useful context.',
  });

  return rows;
}
