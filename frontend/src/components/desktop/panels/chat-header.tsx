'use client';

import { Sparkle } from '@phosphor-icons/react';
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
  return (
    <div className="shrink-0 border-b border-border/50 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkle className="h-5 w-5 text-muted-foreground" />
            <h2 className="truncate font-serif text-xl font-semibold tracking-normal">{title}</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ask for plans, drafts, risks, decisions, and next steps using your company context.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
          <Select value={agentType} onValueChange={onAgentTypeChange}>
            <SelectTrigger className="h-9 min-w-40">
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
            <SelectTrigger className="h-9 min-w-44">
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
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <TogglePill label="Extra review" checked={a2aEnabled} onChange={onA2aChange} />
        <TogglePill label="Use files" checked={ragEnabled} onChange={onRagChange} />
        <TogglePill
          label={webSearchRequired ? 'Search web required' : 'Search web'}
          checked={webSearchEnabled}
          onChange={(value) => onResearchChange(webSearchRequired || value)}
        />
      </div>
    </div>
  );
}
