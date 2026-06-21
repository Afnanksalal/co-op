'use client';

import { Sparkle } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DesktopState, StartupProfile } from '@/lib/desktop/runtime';
import type { View } from '../shell-types';
import { DesktopPage, SegmentedControl } from '../shared';
import { workspaceCompletion } from '../utils';
import { CompanyOverview } from './company-overview';
import { RagPanel } from './files';
import { MemoryPanel } from './memory';
import { ResearchPanel } from './research';
import { WorkspacePanel } from './workspace';

type CompanyTab = 'overview' | 'profile' | 'files' | 'memory' | 'research';

const viewToTab: Partial<Record<View, CompanyTab>> = {
  workspace: 'overview',
  rag: 'files',
  memory: 'memory',
  research: 'research',
};

const tabToView: Record<CompanyTab, View> = {
  overview: 'workspace',
  profile: 'workspace',
  files: 'rag',
  memory: 'memory',
  research: 'research',
};

export function CompanyPanel({
  state,
  activeView,
  profile,
  onProfileChange,
  busyAction,
  runWithState,
  refresh,
  setError,
  setMessage,
  setBusyAction,
  onNavigate,
}: {
  state: DesktopState;
  activeView: View;
  profile: StartupProfile;
  onProfileChange: (profile: StartupProfile) => void;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  setError: (value: string) => void;
  setMessage: (value: string) => void;
  setBusyAction: (value: string) => void;
  onNavigate: (view: View) => void;
}) {
  const [localTab, setLocalTab] = useState<CompanyTab>('overview');
  const routedTab = viewToTab[activeView] ?? 'overview';
  const activeTab = activeView === 'workspace' ? localTab : routedTab;
  const completion = workspaceCompletion(profile);

  useEffect(() => {
    if (activeView !== 'workspace') {
      setLocalTab(routedTab);
    }
  }, [activeView, routedTab]);

  function openTab(tab: string) {
    const nextTab = tab as CompanyTab;
    setLocalTab(nextTab);
    onNavigate(tabToView[nextTab] ?? 'workspace');
  }

  return (
    <DesktopPage className="space-y-4">
      <section className="sticky top-0 z-20 -mx-1 bg-background/95 px-1 pb-3 backdrop-blur">
        <div className="rounded-lg border border-border/50 bg-card p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={completion >= 70 ? 'success' : 'warning'}>
                  {completion >= 70 ? 'Ready' : 'Needs context'}
                </Badge>
                <Badge variant="outline">{state.documents.length} files</Badge>
                <Badge variant="outline">{state.memories.length} memories</Badge>
                <Badge variant="outline">{state.researchRuns.length} research notes</Badge>
              </div>
              <h2 className="mt-3 text-xl font-semibold tracking-normal sm:text-2xl">
                {profile.companyName || 'Company'}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                Business context, files, memory, and research in one workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => onNavigate('chat')}>
                <Sparkle className="h-4 w-4" weight="fill" />
                Ask
              </Button>
              <Button variant="outline" onClick={() => openTab('files')}>
                Add file
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <SegmentedControl
              value={activeTab}
              onChange={openTab}
              options={[
                { id: 'overview', label: 'Overview' },
                { id: 'profile', label: 'Profile' },
                { id: 'files', label: 'Files' },
                { id: 'memory', label: 'Memory' },
                { id: 'research', label: 'Research' },
              ]}
            />
          </div>
        </div>
      </section>

      <div className="min-w-0">
        {activeTab === 'overview' && (
          <CompanyOverview
            state={state}
            profile={profile}
            onOpenProfile={() => openTab('profile')}
            onOpenFiles={() => openTab('files')}
            onOpenMemory={() => openTab('memory')}
            onOpenResearch={() => openTab('research')}
          />
        )}
        {activeTab === 'profile' && (
          <WorkspacePanel
            profile={profile}
            onProfileChange={onProfileChange}
            busyAction={busyAction}
            runWithState={runWithState}
          />
        )}
        {activeTab === 'files' && (
          <RagPanel state={state} busyAction={busyAction} runWithState={runWithState} />
        )}
        {activeTab === 'memory' && (
          <MemoryPanel state={state} busyAction={busyAction} runWithState={runWithState} />
        )}
        {activeTab === 'research' && (
          <ResearchPanel
            state={state}
            busyAction={busyAction}
            refresh={refresh}
            setError={setError}
            setMessage={setMessage}
            setBusyAction={setBusyAction}
            onNavigate={onNavigate}
          />
        )}
      </div>
    </DesktopPage>
  );
}
