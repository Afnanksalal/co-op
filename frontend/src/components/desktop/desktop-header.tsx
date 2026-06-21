'use client';

import { CircleNotch, List, Plugs, ShieldCheck, UserCircle } from '@phosphor-icons/react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DesktopState } from '@/lib/desktop/runtime';
import type { View } from './shell-types';
import { accountNavItems } from './navigation';
import { subtitleForView, titleForView } from './utils';

export function DesktopHeader({
  view,
  state,
  busyAction,
  onRefresh,
  onOpenMobileNav,
  onOpenView,
}: {
  view: View;
  state: DesktopState | null;
  busyAction: string;
  onRefresh: () => void;
  onOpenMobileNav: () => void;
  onOpenView: (view: View) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const title = titleForView(view);
  const subtitle = subtitleForView(view, state);

  function chooseView(next: View) {
    setMenuOpen(false);
    onOpenView(next);
  }

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur md:hidden">
        <Button variant="ghost" size="icon" onClick={onOpenMobileNav} aria-label="Open navigation">
          <List className="h-5 w-5" weight="bold" />
        </Button>
        <button
          type="button"
          onClick={() => chooseView('dashboard')}
          className="font-serif text-lg font-semibold"
        >
          Co-Op
        </button>
        <AccountMenuButton
          state={state}
          busyAction={busyAction}
          menuOpen={menuOpen}
          onToggle={() => setMenuOpen((value) => !value)}
          onRefresh={onRefresh}
          onOpenView={chooseView}
        />
      </header>

      <header className="z-30 hidden min-h-16 shrink-0 items-center justify-between gap-4 border-b border-border/40 bg-background/90 px-4 py-3 backdrop-blur md:flex md:px-8">
        <div className="min-w-0">
          <h1 className="truncate font-serif text-xl font-semibold tracking-normal sm:text-2xl">
            {title}
          </h1>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={state?.isUsable ? 'success' : 'warning'}
            className="hidden sm:inline-flex"
          >
            {state?.isUsable ? 'Licensed' : 'Activation required'}
          </Badge>
          <AccountMenuButton
            state={state}
            busyAction={busyAction}
            menuOpen={menuOpen}
            onToggle={() => setMenuOpen((value) => !value)}
            onRefresh={onRefresh}
            onOpenView={chooseView}
          />
        </div>
      </header>
    </>
  );
}

function AccountMenuButton({
  state,
  busyAction,
  menuOpen,
  onToggle,
  onRefresh,
  onOpenView,
}: {
  state: DesktopState | null;
  busyAction: string;
  menuOpen: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  onOpenView: (view: View) => void;
}) {
  return (
    <div className="relative">
      <Button variant="outline" size="sm" onClick={onToggle} aria-expanded={menuOpen}>
        <UserCircle className="h-4 w-4" weight="bold" />
        <span className="hidden sm:inline">Account</span>
      </Button>
      {menuOpen && (
        <div className="absolute right-0 top-11 z-[80] w-64 rounded-lg border border-border bg-popover p-2 text-popover-foreground shadow-xl">
          <div className="border-b border-border/60 px-3 py-2">
            <p className="truncate text-sm font-medium">
              {state?.workspace.companyName || 'Co-Op workspace'}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {state?.isUsable ? 'Local workspace ready' : 'Activation needed'}
            </p>
          </div>
          <div className="py-2">
            {accountNavItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => onOpenView(id)}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span>{label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onRefresh();
                onToggle();
              }}
              disabled={busyAction !== ''}
              className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 disabled:opacity-50"
            >
              {busyAction ? (
                <CircleNotch className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <Plugs className="h-4 w-4 text-muted-foreground" />
              )}
              <span>Refresh status</span>
            </button>
          </div>
          {!state?.isUsable && (
            <button
              type="button"
              onClick={() => onOpenView('activation')}
              className="flex w-full items-center gap-3 rounded-md bg-primary/10 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-primary/15"
            >
              <ShieldCheck className="h-4 w-4" weight="fill" />
              <span>Activate this computer</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
