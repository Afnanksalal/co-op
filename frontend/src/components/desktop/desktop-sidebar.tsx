'use client';

import { CaretLeft, CaretRight, ShieldCheck, X } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DesktopState } from '@/lib/desktop/runtime';
import type { View } from './shell-types';
import { navItemActive, primaryNavGroups } from './navigation';

type SidebarProps = {
  activeView: View;
  state: DesktopState | null;
  collapsed: boolean;
  screenshotMode: boolean;
  onToggleCollapsed: () => void;
  onOpenView: (view: View) => void;
};

type MobileNavProps = Omit<SidebarProps, 'collapsed' | 'onToggleCollapsed'> & {
  open: boolean;
  onClose: () => void;
};

export function DesktopSidebar({
  activeView,
  state,
  collapsed,
  screenshotMode,
  onToggleCollapsed,
  onOpenView,
}: SidebarProps) {
  return (
    <aside
      className={`fixed bottom-0 left-0 top-0 z-40 hidden flex-col border-r border-border/40 bg-background transition-[width] duration-300 md:flex ${collapsed ? 'w-[72px]' : 'w-[260px]'}`}
    >
      <div className="flex h-16 items-center justify-between border-b border-border/40 px-4">
        {collapsed ? (
          <div aria-hidden="true" className="w-6" />
        ) : (
          <button
            type="button"
            onClick={() => onOpenView('dashboard')}
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
        <Button variant="ghost" size="icon" onClick={onToggleCollapsed} aria-label="Toggle sidebar">
          {collapsed ? (
            <CaretRight className="h-4 w-4" weight="bold" />
          ) : (
            <CaretLeft className="h-4 w-4" weight="bold" />
          )}
        </Button>
      </div>
      <SidebarContent
        activeView={activeView}
        state={state}
        collapsed={collapsed}
        screenshotMode={screenshotMode}
        onOpenView={onOpenView}
      />
    </aside>
  );
}

export function DesktopMobileNav({
  open,
  activeView,
  state,
  screenshotMode,
  onClose,
  onOpenView,
}: MobileNavProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Close navigation"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-[280px] max-w-[86vw] flex-col border-r border-border/40 bg-background shadow-2xl">
        <div className="flex h-14 items-center justify-between border-b border-border/40 px-4">
          <span className="font-serif text-lg font-semibold">Co-Op</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close navigation">
            <X className="h-5 w-5" weight="bold" />
          </Button>
        </div>
        <SidebarContent
          activeView={activeView}
          state={state}
          collapsed={false}
          screenshotMode={screenshotMode}
          onOpenView={(view) => {
            onOpenView(view);
            onClose();
          }}
        />
      </aside>
    </div>
  );
}

function SidebarContent({
  activeView,
  state,
  collapsed,
  screenshotMode,
  onOpenView,
}: {
  activeView: View;
  state: DesktopState | null;
  collapsed: boolean;
  screenshotMode: boolean;
  onOpenView: (view: View) => void;
}) {
  return (
    <>
      <nav
        className={`scrollbar-none flex-1 overflow-y-auto overflow-x-hidden px-3 ${collapsed ? 'py-3' : 'py-5'}`}
      >
        <div className={collapsed ? 'space-y-4' : 'space-y-7'}>
          {primaryNavGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              {!collapsed && (
                <p className="px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {group.label}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map(({ id, label, icon: Icon }) => {
                  const active = navItemActive({ id, label, icon: Icon }, activeView);
                  return (
                    <button
                      key={id}
                      type="button"
                      data-testid={`desktop-nav-${id}`}
                      onClick={() => onOpenView(id)}
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
          <button
            type="button"
            onClick={() => onOpenView(state?.isUsable ? 'settings' : 'activation')}
            className={`w-full rounded-lg border border-border/50 bg-muted/30 p-3 text-left transition-colors hover:bg-muted/50 ${collapsed ? 'flex justify-center' : ''}`}
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
          </button>
        </div>
      )}
    </>
  );
}
