'use client';

import { Bell, Briefcase, Calculator, ChartLine, UsersThree } from '@phosphor-icons/react';
import type { DesktopState } from '@/lib/desktop/runtime';
import type { ToolTabId } from './types';

type ToolIcon = typeof Calculator;

interface ToolTab {
  id: ToolTabId;
  label: string;
  icon: ToolIcon;
  meta: string;
}

export function ToolTabs({
  state,
  activeTab,
  onSelect,
}: {
  state: DesktopState;
  activeTab: ToolTabId;
  onSelect: (tab: ToolTabId) => void;
}) {
  const toolTabs: ToolTab[] = [
    { id: 'calculators', label: 'Money', icon: Calculator, meta: 'Runway, burn, valuation' },
    { id: 'alerts', label: 'Watchlist', icon: Bell, meta: `${state.alerts.length} saved` },
    {
      id: 'pitch',
      label: 'Pitch review',
      icon: ChartLine,
      meta: `${state.pitchDecks.length} reviews`,
    },
    {
      id: 'captable',
      label: 'Ownership',
      icon: UsersThree,
      meta: `${state.capTables.length} scenarios`,
    },
    {
      id: 'investors',
      label: 'Investors',
      icon: Briefcase,
      meta: `${state.investors.length} records`,
    },
  ];

  return (
    <aside className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card p-3">
      <div className="mb-3 px-1">
        <h2 className="font-serif text-lg font-semibold tracking-normal">Business tools</h2>
        <p className="text-xs text-muted-foreground">Focused local operating surfaces</p>
      </div>
      <div className="coop-scrollbar flex min-h-0 flex-1 gap-2 overflow-x-auto pb-1 xl:block xl:space-y-2 xl:overflow-y-auto xl:overflow-x-hidden xl:pb-0">
        {toolTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            data-testid={`tool-tab-${tab.id}`}
            onClick={() => onSelect(tab.id)}
            className={`flex min-w-52 items-center gap-3 rounded-lg border p-3 text-left transition-colors xl:w-full xl:min-w-0 ${
              activeTab === tab.id
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/50 bg-background hover:bg-muted/40'
            }`}
          >
            <tab.icon className="h-5 w-5 text-muted-foreground" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{tab.label}</span>
              <span className="block truncate text-xs text-muted-foreground">{tab.meta}</span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
