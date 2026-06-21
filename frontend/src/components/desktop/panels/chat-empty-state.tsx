'use client';

import { Brain } from '@phosphor-icons/react';

export function ChatEmptyState({
  suggestions,
  onSelectSuggestion,
}: {
  suggestions: string[];
  onSelectSuggestion: (value: string) => void;
}) {
  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-12">
      <div className="text-center">
        <Brain className="mx-auto h-10 w-10 text-muted-foreground" weight="light" />
        <h3 className="mt-4 font-serif text-2xl font-semibold tracking-normal">
          Ask about the business
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Start with a decision, customer question, plan, or investor review.
        </p>
      </div>
      <div className="mt-6 grid gap-2 sm:grid-cols-2">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => onSelectSuggestion(suggestion)}
            className="rounded-lg border border-border/50 bg-background p-3 text-left text-sm transition-colors hover:bg-muted/40"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
