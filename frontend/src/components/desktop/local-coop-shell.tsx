'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  getActivationState,
  isTauriRuntime,
  type DesktopState,
  type ModelSettings,
  type StartupProfile,
} from '@/lib/desktop/runtime';
import type { View } from './shell-types';
import { DesktopHeader } from './desktop-header';
import { DesktopMobileNav, DesktopSidebar } from './desktop-sidebar';
import { Notice } from './shared';
import { ActivationPanel } from './panels/activation';
import { ChatPanel } from './panels/chat';
import { CompanyPanel } from './panels/company';
import { DashboardPanel, LoadingWorkbench, LockedPanel } from './panels/dashboard';
import { HistoryPanel } from './panels/history';
import { OnboardingPanel } from './panels/onboarding';
import { OutreachPanel } from './panels/customers';
import { SettingsPanel } from './panels/settings';
import { ToolsPanel } from './panels/tools';
import { errorMessage, nextViewForState, onboardingRequired, successToastText } from './utils';

const COMPANY_VIEWS: View[] = ['workspace', 'rag', 'memory', 'research'];
const FIXED_WORKBENCH_VIEWS: View[] = [
  'chat',
  'history',
  'workspace',
  'rag',
  'memory',
  'research',
  'outreach',
  'tools',
  'settings',
];

export function LocalCoOpShell() {
  const [view, setView] = useState<View>('dashboard');
  const [state, setState] = useState<DesktopState | null>(null);
  const [settings, setSettings] = useState<ModelSettings | null>(null);
  const [workspace, setWorkspace] = useState<StartupProfile | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [error, setError] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [screenshotMode, setScreenshotMode] = useState(false);
  const runtimeAvailable = isTauriRuntime();

  const lockedView =
    runtimeAvailable &&
    state !== null &&
    !state.isUsable &&
    view !== 'activation' &&
    view !== 'settings' &&
    view !== 'dashboard';
  const fixedWorkbench = !lockedView && FIXED_WORKBENCH_VIEWS.includes(view);
  const companyView = useMemo(() => COMPANY_VIEWS.includes(view), [view]);

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    const shouldForceScreenshotTheme =
      new URLSearchParams(window.location.search).get('screenshot') === '1';
    setScreenshotMode(shouldForceScreenshotTheme);
    if (shouldForceScreenshotTheme) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.add('coop-desktop-shell');
    return () => {
      document.documentElement.classList.remove('coop-desktop-shell');
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  function setMessage(value: string) {
    const text = successToastText(value);
    if (!text) {
      toast.dismiss('desktop-success');
      return;
    }
    toast.success(text, {
      id: 'desktop-success',
      duration: 1800,
    });
  }

  async function refresh() {
    setError('');
    try {
      const next = await getActivationState();
      setState(next);
      setSettings(next.modelSettings);
      setWorkspace(next.workspace);
      const redirect = nextViewForState(next, view, runtimeAvailable);
      if (redirect) setView(redirect);
    } catch (error) {
      setError(errorMessage(error, 'Failed to load Co-Op Desktop'));
    }
  }

  async function runWithState(
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ): Promise<boolean> {
    setBusyAction(label);
    setError('');
    setMessage('');
    try {
      const next = await action();
      setState(next);
      setSettings(next.modelSettings);
      setWorkspace(next.workspace);
      setMessage(success);
      const redirect = nextViewForState(next, view, runtimeAvailable);
      if (redirect) setView(redirect);
      return true;
    } catch (error) {
      setError(errorMessage(error, 'Action failed'));
      return false;
    } finally {
      setBusyAction('');
    }
  }

  function openView(nextView: View) {
    const guardedView =
      state?.isUsable &&
      onboardingRequired(state.workspace) &&
      !['activation', 'settings', 'onboarding'].includes(nextView)
        ? 'onboarding'
        : nextView;
    setView(guardedView);
    setMobileMenuOpen(false);
  }

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <DesktopMobileNav
        open={mobileMenuOpen}
        activeView={view}
        state={state}
        screenshotMode={screenshotMode}
        onClose={() => setMobileMenuOpen(false)}
        onOpenView={openView}
      />

      <DesktopSidebar
        activeView={view}
        state={state}
        collapsed={sidebarCollapsed}
        screenshotMode={screenshotMode}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onOpenView={openView}
      />

      <section
        className={`flex h-dvh min-w-0 flex-col overflow-hidden pt-14 transition-[padding] duration-300 md:pt-0 ${sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'}`}
      >
        <DesktopHeader
          view={view}
          state={state}
          busyAction={busyAction}
          onRefresh={() => void refresh()}
          onOpenMobileNav={() => setMobileMenuOpen(true)}
          onOpenView={openView}
        />

        <div
          className={`mx-auto flex min-h-0 w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 md:px-8 md:py-7 ${
            fixedWorkbench
              ? 'flex-col gap-4 overflow-hidden'
              : 'coop-page-scroll coop-scrollbar flex-col gap-5'
          }`}
        >
          {!runtimeAvailable && !screenshotMode && (
            <Notice
              tone="warning"
              text="This preview can show the interface. Install or run Co-Op Desktop to use local business tools."
            />
          )}
          {error && <Notice tone="error" text={error} />}

          {lockedView && <LockedPanel onActivate={() => openView('activation')} />}
          {!lockedView && view === 'onboarding' && state && workspace && (
            <OnboardingPanel
              profile={workspace}
              onProfileChange={setWorkspace}
              busyAction={busyAction}
              runWithState={runWithState}
              onComplete={() => openView('dashboard')}
            />
          )}
          {!lockedView && view === 'dashboard' && state && (
            <DashboardPanel state={state} onNavigate={openView} />
          )}
          {!lockedView && view === 'activation' && (
            <ActivationPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && companyView && state && workspace && (
            <CompanyPanel
              state={state}
              activeView={view}
              profile={workspace}
              onProfileChange={setWorkspace}
              busyAction={busyAction}
              runWithState={runWithState}
              refresh={refresh}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
              onNavigate={openView}
            />
          )}
          {!lockedView && view === 'chat' && state && (
            <ChatPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'outreach' && state && (
            <OutreachPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'tools' && state && (
            <ToolsPanel
              state={state}
              busyAction={busyAction}
              runWithState={runWithState}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
            />
          )}
          {!lockedView && view === 'settings' && settings && (
            <SettingsPanel
              settings={settings}
              setSettings={setSettings}
              busyAction={busyAction}
              runWithState={runWithState}
            />
          )}
          {!lockedView && view === 'history' && state && (
            <HistoryPanel
              state={state}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
              busyAction={busyAction}
              refresh={refresh}
            />
          )}
          {!state && <LoadingWorkbench />}
        </div>
      </section>
    </main>
  );
}
