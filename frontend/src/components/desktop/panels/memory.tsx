'use client';

import { useMemo, useState } from 'react';
import { Brain, MagnifyingGlass, PushPinSimple, Sparkle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  isTauriRuntime,
  saveBusinessMemory,
  searchBusinessMemory,
  type BusinessMemory,
  type DesktopState,
  type MemoryRequest,
  type MemorySearchResult,
} from '@/lib/desktop/runtime';
import { EmptyState, Field, Notice, PanelTitle, SelectField, TextArea, Toggle } from '../shared';
import { errorMessage, memoryTypeDisplay } from '../utils';

const memoryTypes = [
  'decision',
  'risk',
  'preference',
  'customer',
  'research',
  'plan',
  'profile',
  'note',
];

const blankMemory: MemoryRequest = {
  memoryType: 'decision',
  title: '',
  content: '',
  source: 'manual',
  pinned: false,
  confidence: 0.82,
};

export function MemoryPanel({
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
  const [memory, setMemory] = useState<MemoryRequest>(blankMemory);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const runtimeAvailable = isTauriRuntime();
  const shownMemories = results.length > 0 ? results : state.memories;
  const pinnedCount = state.memories.filter((item) => item.pinned).length;

  const grouped = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of state.memories) {
      counts.set(item.memoryType, (counts.get(item.memoryType) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1]);
  }, [state.memories]);

  async function runSearch() {
    const trimmed = query.trim();
    setSearchError('');
    if (!trimmed) {
      setResults([]);
      return;
    }
    if (!runtimeAvailable) {
      setResults(filterPreviewMemories(state.memories, trimmed));
      return;
    }
    try {
      setResults(await searchBusinessMemory({ query: trimmed, limit: 12 }));
    } catch (error) {
      setSearchError(errorMessage(error, 'Memory search failed'));
    }
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-5 overflow-hidden xl:grid-cols-[380px_minmax(0,1fr)] xl:grid-rows-1">
      <section className="coop-scrollbar max-h-96 overflow-y-auto rounded-lg border border-border bg-card p-5 xl:max-h-none">
        <PanelTitle icon={Brain} title="Memory" />
        <p className="text-sm leading-6 text-muted-foreground">
          Save decisions, preferences, risks, and customer notes that Co-Op should consider later.
        </p>

        <form
          className="mt-5 space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void runWithState('memory', () => saveBusinessMemory(memory), 'Memory saved.').then(
              (saved) => {
                if (saved) setMemory(blankMemory);
              }
            );
          }}
        >
          <SelectField
            label="Kind"
            value={memory.memoryType}
            options={memoryTypes}
            onChange={(memoryType) => setMemory((current) => ({ ...current, memoryType }))}
          />
          <Field
            label="Title"
            value={memory.title}
            placeholder="Example: Pricing decision"
            onChange={(title) => setMemory((current) => ({ ...current, title }))}
          />
          <TextArea
            label="What should Co-Op remember?"
            value={memory.content}
            minHeight="min-h-36"
            placeholder="Write the decision, preference, customer detail, risk, or useful context."
            onChange={(content) => setMemory((current) => ({ ...current, content }))}
          />
          <Field
            label="Source"
            value={memory.source}
            placeholder="Manual note, call, plan, research"
            onChange={(source) => setMemory((current) => ({ ...current, source }))}
          />
          <Toggle
            label="Keep near the top"
            checked={Boolean(memory.pinned)}
            onChange={(pinned) => setMemory((current) => ({ ...current, pinned }))}
          />
          <Button
            type="submit"
            disabled={
              busyAction === 'memory' ||
              memory.title.trim().length < 2 ||
              memory.content.trim().length < 10
            }
          >
            Save memory
          </Button>
        </form>
      </section>

      <div className="coop-scrollbar min-h-0 space-y-5 overflow-y-auto pr-1">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <PanelTitle icon={MagnifyingGlass} title="Find what Co-Op remembers" compact />
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Search saved business context before asking for a plan or answer.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{state.memories.length} saved</Badge>
              {pinnedCount > 0 && <Badge variant="secondary">{pinnedCount} kept near top</Badge>}
            </div>
          </div>

          <form
            className="mt-5 flex flex-col gap-3 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search decisions, customers, plans, or preferences"
              className="min-h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
            />
            <Button type="submit">Search</Button>
          </form>
          {searchError && <Notice tone="error" text={searchError} />}

          {grouped.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {grouped.map(([type, count]) => (
                <Badge key={type} variant="outline">
                  {memoryTypeDisplay(type)} - {count}
                </Badge>
              ))}
            </div>
          )}
        </section>

        <section className="grid gap-3">
          {shownMemories.map((item) => (
            <MemoryCard key={item.id} memory={item} />
          ))}
          {shownMemories.length === 0 && (
            <EmptyState
              icon={Sparkle}
              title="No saved memory yet"
              text="Co-Op will build memory from saved company details, plans, research, and notes you add here."
            />
          )}
        </section>
      </div>
    </div>
  );
}

function MemoryCard({ memory }: { memory: BusinessMemory | MemorySearchResult }) {
  const score = 'score' in memory ? memory.score : null;

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={memory.pinned ? 'default' : 'secondary'}>
              {memoryTypeDisplay(memory.memoryType)}
            </Badge>
            {memory.pinned && (
              <Badge variant="outline">
                <PushPinSimple className="mr-1 h-3 w-3" weight="fill" />
                Kept
              </Badge>
            )}
            {score !== null && <Badge variant="outline">{Math.round(score * 100)}% match</Badge>}
          </div>
          <h3 className="mt-3 text-base font-semibold">{memory.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {memory.source || 'Saved memory'} - {formatDate(memory.updatedAt || memory.createdAt)}
          </p>
        </div>
        <Badge variant="secondary">{Math.round(memory.confidence * 100)}%</Badge>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
        {memory.content}
      </p>
    </article>
  );
}

function filterPreviewMemories(memories: BusinessMemory[], query: string): MemorySearchResult[] {
  const terms = query
    .toLowerCase()
    .split(/\W+/)
    .filter((term) => term.length > 2);
  return memories
    .map((memory) => {
      const haystack =
        `${memory.title} ${memory.content} ${memory.memoryType} ${memory.source}`.toLowerCase();
      const matches = terms.filter((term) => haystack.includes(term)).length;
      return { ...memory, score: terms.length ? matches / terms.length : 0 };
    })
    .filter((memory) => memory.score > 0)
    .sort((left, right) => right.score - left.score);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Recently';
  return date.toLocaleDateString();
}
