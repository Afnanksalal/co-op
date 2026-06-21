'use client';

import type { ReactNode } from 'react';
import { Brain, Briefcase, ChartLine, HardDrives, MagnifyingGlass } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import type { DesktopState, StartupProfile } from '@/lib/desktop/runtime';
import { EmptyState, PanelTitle } from '../shared';
import { MarkdownOutput, markdownToPlainText } from '../markdown';
import { formatProfileUpdated, workspaceCompletion } from '../utils';

export function CompanyOverview({
  state,
  profile,
  onOpenProfile,
  onOpenFiles,
  onOpenMemory,
  onOpenResearch,
}: {
  state: DesktopState;
  profile: StartupProfile;
  onOpenProfile: () => void;
  onOpenFiles: () => void;
  onOpenMemory: () => void;
  onOpenResearch: () => void;
}) {
  const latestResearch = state.researchRuns[0];
  const latestMemory = state.memories[0];
  const latestFile = state.documents[0];

  return (
    <div className="coop-scrollbar h-full min-h-0 overflow-y-auto pr-1">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-lg border border-border/50 bg-card p-5">
          <PanelTitle icon={Briefcase} title="Business snapshot" compact />
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <SnapshotItem label="Customer" value={profile.targetCustomers || 'Not set'} />
            <SnapshotItem label="Problem" value={profile.problem || 'Not set'} />
            <SnapshotItem label="Offer" value={profile.solution || 'Not set'} />
            <SnapshotItem label="Updated" value={formatProfileUpdated(profile.updatedAt)} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button size="sm" onClick={onOpenProfile}>
              Complete profile
            </Button>
            <Button size="sm" variant="outline" onClick={onOpenFiles}>
              Add company file
            </Button>
            <Button size="sm" variant="outline" onClick={onOpenMemory}>
              Save memory
            </Button>
          </div>
        </section>

        <section className="rounded-lg border border-border/50 bg-card p-5">
          <PanelTitle icon={ChartLine} title="Context health" compact />
          <div className="mt-5 space-y-3">
            <HealthRow label="Profile" value={`${workspaceCompletion(profile)}%`} />
            <HealthRow label="Files" value={String(state.documents.length)} />
            <HealthRow label="Memory" value={String(state.memories.length)} />
            <HealthRow label="Research" value={String(state.researchRuns.length)} />
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <RecentCard icon={HardDrives} title="Latest file" action="Files" onAction={onOpenFiles}>
          {latestFile ? (
            <>
              <h3 className="truncate font-medium">{latestFile.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {latestFile.source || 'Saved locally'}
              </p>
            </>
          ) : (
            <EmptyState
              icon={HardDrives}
              title="No files yet"
              text="Add notes, decks, policies, research, or customer calls."
            />
          )}
        </RecentCard>

        <RecentCard icon={Brain} title="Latest memory" action="Memory" onAction={onOpenMemory}>
          {latestMemory ? (
            <>
              <h3 className="truncate font-medium">{latestMemory.title}</h3>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {latestMemory.content}
              </p>
            </>
          ) : (
            <EmptyState
              icon={Brain}
              title="No memory yet"
              text="Save decisions, risks, preferences, and customer notes."
            />
          )}
        </RecentCard>

        <RecentCard
          icon={MagnifyingGlass}
          title="Latest research"
          action="Research"
          onAction={onOpenResearch}
        >
          {latestResearch ? (
            <>
              <h3 className="truncate font-medium">{latestResearch.query}</h3>
              <MarkdownOutput
                text={markdownToPlainText(latestResearch.summary)}
                className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground"
              />
            </>
          ) : (
            <EmptyState
              icon={MagnifyingGlass}
              title="No research yet"
              text="Run a competitor, market, pricing, or customer brief."
            />
          )}
        </RecentCard>
      </div>
    </div>
  );
}

function SnapshotItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border/50 bg-background p-3">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 line-clamp-2 text-sm font-medium">{value}</p>
    </div>
  );
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/50 pb-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function RecentCard({
  icon: Icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: typeof Briefcase;
  title: string;
  action: string;
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/50 bg-card p-5">
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
