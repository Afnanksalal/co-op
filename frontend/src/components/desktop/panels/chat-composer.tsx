'use client';

import { type FormEvent } from 'react';
import { DotsThreeCircle, PaperPlaneTilt } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { advisorDisplay } from '../utils';

export function ChatComposer({
  message,
  agentType,
  busy,
  onMessageChange,
  onSubmit,
}: {
  message: string;
  agentType: string;
  busy: boolean;
  onMessageChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="shrink-0 border-t border-border/50 bg-card p-4" onSubmit={onSubmit}>
      <div className="mx-auto max-w-3xl">
        <div className="relative">
          <textarea
            aria-label="Message"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={`Ask ${advisorDisplay(agentType).toLowerCase()}...`}
            className="coop-scrollbar max-h-36 min-h-16 w-full resize-none overflow-y-auto rounded-lg border border-input bg-background px-4 py-3 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <Button
            type="submit"
            size="icon"
            className="absolute bottom-3 right-3 h-9 w-9"
            disabled={busy || !message.trim()}
            aria-label="Send message"
          >
            {busy ? (
              <DotsThreeCircle className="h-4 w-4 animate-pulse" weight="bold" />
            ) : (
              <PaperPlaneTilt className="h-4 w-4" weight="fill" />
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
