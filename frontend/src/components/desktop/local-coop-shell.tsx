'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Briefcase,
  Calculator,
  CaretLeft,
  CaretRight,
  ChatsCircle,
  CircleNotch,
  EnvelopeSimple,
  FlowArrow,
  HardDrives,
  House,
  List,
  MagnifyingGlass,
  Plugs,
  ShieldCheck,
  X,
} from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  getActivationState,
  isTauriRuntime,
  type DesktopState,
  type ModelSettings,
  type StartupProfile,
} from '@/lib/desktop/runtime';
import { toast } from 'sonner';
import type { NavItem, View } from './shell-types';
import { Notice } from './shared';
import { ActivationPanel } from './panels/activation';
import { ChatPanel } from './panels/chat';
import { DashboardPanel, LoadingWorkbench, LockedPanel } from './panels/dashboard';
import { HistoryPanel } from './panels/history';
import { MemoryPanel } from './panels/memory';
import { OnboardingPanel } from './panels/onboarding';
import { OutreachPanel } from './panels/customers';
import { RagPanel } from './panels/files';
import { ResearchPanel } from './panels/research';
import { SettingsPanel } from './panels/settings';
import { ToolsPanel } from './panels/tools';
import { WorkspacePanel } from './panels/workspace';
import {
  errorMessage,
  nextViewForState,
  onboardingRequired,
  subtitleForView,
  successToastText,
  titleForView,
} from './utils';

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
  const fixedWorkbench =
    !lockedView &&
    [
      'chat',
      'history',
      'workspace',
      'rag',
      'memory',
      'research',
      'outreach',
      'tools',
      'settings',
    ].includes(view);

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

  const navGroups = useMemo(
    (): { label: string; items: NavItem[] }[] => [
      {
        label: 'Work',
        items: [
          { id: 'dashboard', label: 'Today', icon: House },
          { id: 'chat', label: 'Ask', icon: ChatsCircle },
          { id: 'history', label: 'Plans', icon: FlowArrow },
        ],
      },
      {
        label: 'Company',
        items: [
          { id: 'workspace', label: 'Company', icon: Briefcase },
          { id: 'rag', label: 'Files', icon: HardDrives },
          { id: 'memory', label: 'Memory', icon: Brain },
          { id: 'research', label: 'Research', icon: MagnifyingGlass },
          { id: 'outreach', label: 'Customers', icon: EnvelopeSimple },
        ],
      },
      {
        label: 'Manage',
        items: [
          { id: 'tools', label: 'Money & tools', icon: Calculator },
          { id: 'settings', label: 'Settings', icon: Plugs },
          { id: 'activation', label: 'License', icon: ShieldCheck },
        ],
      },
    ],
    []
  );

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

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <nav
        className={`scrollbar-none flex-1 overflow-y-auto overflow-x-hidden px-3 ${collapsed ? 'py-3' : 'py-5'}`}
      >
        <div className={collapsed ? 'space-y-4' : 'space-y-7'}>
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {!collapsed && (
                <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = view === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`desktop-nav-${id}`}
                      onClick={() => openView(id)}
                      title={collapsed ? label : undefined}
                      className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition-all ${
                        active
                          ? 'bg-primary/10 text-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      } ${collapsed ? 'justify-center px-0' : ''}`}
                    >
                      <Icon className="h-5 w-5 shrink-0" weight={active ? 'fill' : 'regular'} />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {!screenshotMode && (
        <div className="border-t border-border/40 p-3">
          <div
            className={`rounded-lg border border-border/50 bg-muted/30 p-3 ${collapsed ? 'flex justify-center' : ''}`}
          >
            {collapsed ? (
              <ShieldCheck
                className={`h-5 w-5 ${state?.isUsable ? 'text-green-600 dark:text-green-300' : 'text-amber-600 dark:text-amber-300'}`}
              />
            ) : (
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={state?.isUsable ? 'success' : 'warning'}>
                    {state?.isUsable ? 'Licensed' : 'Activation required'}
                  </Badge>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Local
                  </span>
                </div>
                <p className="mt-2 truncate text-xs text-muted-foreground">
                  {state?.activation?.customerEmail ??
                    (state ? 'Private on this computer' : 'Loading Co-Op')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <main className="h-dvh overflow-hidden bg-background text-foreground">
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur md:hidden">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation"
        >
          <List className="h-5 w-5" weight="bold" />
        </Button>
        <button
          type="button"
          onClick={() => openView('dashboard')}
          className="font-serif text-lg font-semibold"
        >
          Co-Op
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          disabled={busyAction !== ''}
          aria-label="Refresh"
        >
          <CircleNotch className={`h-5 w-5 ${busyAction ? 'animate-spin' : ''}`} />
        </Button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/55"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative flex h-full w-[280px] max-w-[86vw] flex-col border-r border-border/40 bg-background shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
              <span className="font-serif text-lg font-semibold">Co-Op</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-5 w-5" weight="bold" />
              </Button>
            </div>
            <SidebarContent />
          </aside>
        </div>
      )}

      <aside
        className={`fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-border/40 bg-background transition-[width] duration-300 md:flex ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border/40 px-4">
          {sidebarCollapsed ? (
            <div aria-hidden="true" className="w-6" />
          ) : (
            <button
              type="button"
              onClick={() => openView('dashboard')}
              className="flex min-w-0 items-center"
            >
              <div className="min-w-0 text-left">
                <p className="truncate font-serif text-lg font-semibold tracking-normal">Co-Op</p>
                <p className="truncate text-xs text-muted-foreground">
                  {state?.workspace.companyName || 'Private business workspace'}
                </p>
              </div>
            </button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? (
              <CaretRight className="h-4 w-4" weight="bold" />
            ) : (
              <CaretLeft className="h-4 w-4" weight="bold" />
            )}
          </Button>
        </div>
        <SidebarContent collapsed={sidebarCollapsed} />
      </aside>

      <section
        className={`flex h-dvh min-w-0 flex-col overflow-hidden pt-14 transition-[padding] duration-300 md:pt-0 ${sidebarCollapsed ? 'md:pl-[72px]' : 'md:pl-[260px]'}`}
      >
        <header className="z-30 flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur md:px-8">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-xl font-semibold tracking-normal sm:text-2xl">
              {titleForView(view)}
            </h1>
            <p className="truncate text-xs text-muted-foreground">{subtitleForView(view, state)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={state?.isUsable ? 'success' : 'warning'}
              className="hidden sm:inline-flex"
            >
              {state?.isUsable ? 'Licensed' : 'Activation required'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refresh()}
              disabled={busyAction !== ''}
            >
              Refresh
            </Button>
          </div>
        </header>

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
              onComplete={() => {
                setView('dashboard');
                setMobileMenuOpen(false);
              }}
            />
          )}
          {!lockedView && view === 'dashboard' && state && (
            <DashboardPanel state={state} onNavigate={openView} />
          )}
          {!lockedView && view === 'activation' && (
            <ActivationPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'workspace' && workspace && (
            <WorkspacePanel
              profile={workspace}
              onProfileChange={setWorkspace}
              busyAction={busyAction}
              runWithState={runWithState}
            />
          )}
          {!lockedView && view === 'chat' && state && (
            <ChatPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'rag' && state && (
            <RagPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'memory' && state && (
            <MemoryPanel state={state} busyAction={busyAction} runWithState={runWithState} />
          )}
          {!lockedView && view === 'research' && state && (
            <ResearchPanel
              state={state}
              busyAction={busyAction}
              refresh={refresh}
              setError={setError}
              setMessage={setMessage}
              setBusyAction={setBusyAction}
              onNavigate={openView}
            />
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
