'use client';

import { type FormEvent, useState } from 'react';
import { BookBookmark, MagnifyingGlass } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  runResearchQuery,
  type DesktopState,
  type ResearchRun,
  type StartupProfile,
} from '@/lib/desktop/runtime';
import type { View } from '../shell-types';
import { EmptyState, PanelTitle, SegmentedControl, TextArea } from '../shared';
import { MarkdownOutput } from '../markdown';
import { errorMessage, labelOption, researchProviderDisplay } from '../utils';

export function ResearchPanel({
  state,
  busyAction,
  refresh,
  setError,
  setMessage,
  setBusyAction,
  onNavigate,
}: {
  state: DesktopState;
  busyAction: string;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setBusyAction: (value: string) => void;
  onNavigate: (view: View) => void;
}) {
  const [query, setQuery] = useState('');
  const [researchType, setResearchType] = useState('market_scan');
  const [depth, setDepth] = useState('standard');
  const activePlaybook =
    researchPlaybooks.find((playbook) => playbook.id === researchType) ?? researchPlaybooks[0];
  const providerBlocked = !state.modelSettings.firecrawlApiKeySaved;
  const webSourcesReady = state.modelSettings.firecrawlApiKeySaved;
  const providerLabel = webSourcesReady ? 'Web sources ready' : 'Needs web key';
  const sourceTotal = state.researchRuns.reduce((total, run) => total + run.sources.length, 0);
  const suggestions = researchSuggestions(researchType, state.workspace);
  const canResearch = query.trim().length > 0 && !providerBlocked && busyAction !== 'research';
  const selectedSources = [
    'Live web',
    state.documents.length > 0 ? 'Company files' : null,
    state.memories.length > 0 ? 'Memory' : null,
    state.leads.length > 0 ? 'Customers' : null,
  ].filter(Boolean) as string[];

  async function submitResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canResearch) return;
    setBusyAction('research');
    setError('');
    setMessage('');
    try {
      await runResearchQuery({
        query: query.trim(),
        researchType,
        depth,
        saveToRag: true,
      });
      await refresh();
      setMessage('Research completed.');
      setQuery('');
    } catch (error) {
      setError(errorMessage(error, 'Research failed'));
    } finally {
      setBusyAction('');
    }
  }

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[400px_minmax(0,1fr)]">
      <form
        className="rounded-lg border border-border/50 bg-card p-5 xl:sticky xl:top-28"
        onSubmit={submitResearch}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PanelTitle icon={MagnifyingGlass} title="New research" compact />
          <Badge variant={webSourcesReady ? 'success' : providerBlocked ? 'warning' : 'secondary'}>
            {providerLabel}
          </Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Ask one focused question. Co-Op searches the web, uses saved company context when useful,
          and keeps the finished brief in your company library.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {researchPlaybooks.map((playbook) => (
            <button
              key={playbook.id}
              type="button"
              onClick={() => setResearchType(playbook.id)}
              className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                researchType === playbook.id
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/60 bg-background hover:bg-muted/40'
              }`}
            >
              {playbook.label}
            </button>
          ))}
        </div>

        <TextArea
          label="Brief"
          value={query}
          onChange={setQuery}
          minHeight="min-h-28"
          placeholder={activePlaybook.placeholder}
        />
        <div className="mt-4 space-y-3 rounded-lg border border-border/60 bg-background p-3">
          <div>
            <Label>Depth</Label>
            <SegmentedControl
              value={depth}
              onChange={setDepth}
              options={[
                { id: 'quick', label: 'Quick' },
                { id: 'standard', label: 'Standard' },
                { id: 'deep', label: 'Deep' },
              ]}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedSources.map((source) => (
              <span
                key={source}
                className="rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium text-muted-foreground"
              >
                {source}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/60 bg-card/60 p-3 text-xs leading-5 text-muted-foreground">
            <span>
              {webSourcesReady
                ? 'Briefs are saved locally after the research is complete.'
                : 'Add a web search key before running source-backed research.'}
            </span>
            {!webSourcesReady && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onNavigate('settings')}
              >
                Set up web sources
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setQuery(suggestion)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
        <Button
          className="mt-5"
          type="submit"
          disabled={!canResearch}
          loading={busyAction === 'research'}
        >
          Research this
        </Button>
      </form>

      <section className="min-w-0 space-y-4">
        <div className="rounded-lg border border-border/50 bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <PanelTitle icon={BookBookmark} title="Research library" compact />
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{state.researchRuns.length} reports</Badge>
              <Badge variant="outline">{sourceTotal} sources</Badge>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <ResearchStat label="Source mode" value={providerLabel} />
            <ResearchStat label="Default depth" value={labelOption(depth)} />
            <ResearchStat label="Saved locally" value="On" />
          </div>
        </div>

        <div className="grid gap-4">
          {state.researchRuns.map((run) => (
            <ResearchRunCard key={run.id} run={run} onReuse={() => setQuery(run.query)} />
          ))}
          {state.researchRuns.length === 0 && (
            <EmptyState
              icon={MagnifyingGlass}
              title="No research yet"
              text="Start with one question about your market, competitors, customers, pricing, investors, or risks."
            />
          )}
        </div>
      </section>
    </div>
  );
}

const researchPlaybooks = [
  {
    id: 'market_scan',
    label: 'Market scan',
    description: 'Trends, demand signals, categories, and openings.',
    placeholder: 'Example: What is changing in robotics software for mid-market manufacturers?',
  },
  {
    id: 'competitors',
    label: 'Competitors',
    description: 'Alternatives, positioning, gaps, and wedge opportunities.',
    placeholder:
      'Example: Compare AI scheduling tools for dental clinics and where we can stand out.',
  },
  {
    id: 'customer',
    label: 'Customers',
    description: 'Buyer pains, triggers, objections, and outreach angles.',
    placeholder:
      'Example: What do operations leaders complain about before buying workflow software?',
  },
  {
    id: 'pricing',
    label: 'Pricing',
    description: 'Packaging, value metrics, pricing models, and willingness to pay.',
    placeholder: 'Example: How do B2B SaaS products price usage-based analytics tools?',
  },
  {
    id: 'investor',
    label: 'Investor brief',
    description: 'Funding signals, market story, and diligence questions.',
    placeholder: 'Example: What would seed investors ask about a robotics workflow platform?',
  },
  {
    id: 'risk',
    label: 'Risk check',
    description: 'Market, legal, security, operating, and execution risks.',
    placeholder: 'Example: What risks should we handle before selling AI tools to hospitals?',
  },
];

function ResearchStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-background px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function ResearchRunCard({ run, onReuse }: { run: ResearchRun; onReuse: () => void }) {
  const sources = run.sources.slice(0, 4);
  const hiddenSources = Math.max(0, run.sources.length - sources.length);

  return (
    <article className="rounded-lg border border-border/50 bg-card p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{researchProviderDisplay(run.provider)}</Badge>
            <Badge variant="outline">{formatResearchDate(run.createdAt)}</Badge>
            <Badge variant={run.sources.length > 0 ? 'success' : 'outline'}>
              {run.sources.length > 0 ? `${run.sources.length} sources` : 'No live sources'}
            </Badge>
          </div>
          <h2 className="mt-3 break-words font-serif text-lg font-semibold tracking-normal">
            {run.query}
          </h2>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onReuse}>
          Reuse brief
        </Button>
      </div>

      <MarkdownOutput text={run.summary} className="mt-4 text-muted-foreground" />

      {sources.length > 0 ? (
        <div className="mt-5 border-t border-border/60 pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Sources</h3>
            {hiddenSources > 0 && (
              <span className="text-xs text-muted-foreground">+{hiddenSources} more</span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {sources.map((source) => (
              <a
                key={`${run.id}-${source.url}`}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 rounded-md border border-border/60 bg-background p-3 transition-colors hover:bg-muted/40"
              >
                <span className="block truncate text-sm font-medium">{source.title}</span>
                <span className="mt-1 block truncate text-xs text-primary">
                  {sourceHost(source.url)}
                </span>
                <span className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {source.description || source.content}
                </span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-md border border-border/60 bg-background p-3 text-xs leading-5 text-muted-foreground">
          This older report has no saved web sources. New research requires web sources before it
          runs.
        </p>
      )}
    </article>
  );
}

function researchSuggestions(type: string, profile: StartupProfile): string[] {
  const company = profile.companyName.trim() || 'my company';
  const market =
    profile.sector && profile.sector !== 'other' ? labelOption(profile.sector) : 'our market';
  const customer = profile.targetCustomers.trim() || 'our target customers';

  if (type === 'competitors') {
    return [
      `Find direct and indirect competitors for ${company}`,
      `Compare pricing and positioning in ${market}`,
      `Where are competitors weak for ${customer}?`,
    ];
  }
  if (type === 'customer') {
    return [
      `What pains push ${customer} to buy?`,
      `What objections would ${customer} raise?`,
      `What outreach angle should ${company} test first?`,
    ];
  }
  if (type === 'pricing') {
    return [
      `What pricing model fits ${company}?`,
      `What value metric should we charge on?`,
      `Compare entry, pro, and business packages in ${market}`,
    ];
  }
  if (type === 'investor') {
    return [
      `What investor story fits ${company}?`,
      `What diligence questions should we prepare for?`,
      `Which market proof points matter most in ${market}?`,
    ];
  }
  if (type === 'risk') {
    return [
      `What risks should ${company} address this quarter?`,
      `What could block adoption by ${customer}?`,
      `What compliance or security concerns matter in ${market}?`,
    ];
  }
  return [
    `What is changing in ${market}?`,
    `What opportunities should ${company} pursue first?`,
    `What trends matter most for ${customer}?`,
  ];
}

function formatResearchDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return 'Recent';
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function sourceHost(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return value;
  }
}
