'use client';

import { CaretDown, Sparkle, SlidersHorizontal } from '@phosphor-icons/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TogglePill } from '../shared';
import { advisorDisplay, reviewModeDisplay } from '../utils';

export function ChatHeader({
  title,
  agentType,
  councilMode,
  a2aEnabled,
  ragEnabled,
  webSearchEnabled,
  webSearchRequired,
  onAgentTypeChange,
  onCouncilModeChange,
  onA2aChange,
  onRagChange,
  onResearchChange,
}: {
  title: string;
  agentType: string;
  councilMode: string;
  a2aEnabled: boolean;
  ragEnabled: boolean;
  webSearchEnabled: boolean;
  webSearchRequired: boolean;
  onAgentTypeChange: (value: string) => void;
  onCouncilModeChange: (value: string) => void;
  onA2aChange: (value: boolean) => void;
  onRagChange: (value: boolean) => void;
  onResearchChange: (value: boolean) => void;
}) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!optionsOpen) return;

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOptionsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOptionsOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [optionsOpen]);

  return (
    <div ref={rootRef} className="relative shrink-0 border-b border-border/50 px-4 py-3">
      <div className="flex min-h-12 flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-muted-foreground" />
            <h2 className="truncate font-serif text-lg font-semibold tracking-normal sm:text-xl">
              {title}
            </h2>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            Ask for plans, drafts, risks, decisions, and next steps using your company context.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill label={advisorDisplay(agentType)} />
          <StatusPill label={reviewModeDisplay(councilMode)} />
          {ragEnabled && <StatusPill label="Company files" />}
          {webSearchEnabled && <StatusPill label="Web research" />}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setOptionsOpen((value) => !value)}
            aria-expanded={optionsOpen}
            aria-controls={optionsId}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Options
            <CaretDown
              className={`h-4 w-4 transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
            />
          </Button>
        </div>
      </div>
      {optionsOpen && (
        <div
          id={optionsId}
          className="absolute right-3 top-full z-50 mt-2 w-[calc(100%-1.5rem)] max-w-2xl rounded-lg border border-border/60 bg-popover p-3 text-popover-foreground shadow-xl sm:right-4 sm:w-[42rem]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Select value={agentType} onValueChange={onAgentTypeChange}>
              <SelectTrigger className="h-9 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['operations', 'legal', 'finance', 'investor', 'competitor', 'sales'].map(
                  (option) => (
                    <SelectItem key={option} value={option}>
                      {advisorDisplay(option)}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select value={councilMode} onValueChange={onCouncilModeChange}>
              <SelectTrigger className="h-9 min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {['off', 'review_only', 'high_risk_only', 'full_council'].map((option) => (
                  <SelectItem key={option} value={option}>
                    {reviewModeDisplay(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <TogglePill label="Extra review" checked={a2aEnabled} onChange={onA2aChange} />
            <TogglePill label="Use company files" checked={ragEnabled} onChange={onRagChange} />
            <TogglePill
              label={webSearchRequired ? 'Web required' : 'Use web research'}
              checked={webSearchEnabled}
              onChange={(value) => onResearchChange(webSearchRequired || value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-border/60 bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}
