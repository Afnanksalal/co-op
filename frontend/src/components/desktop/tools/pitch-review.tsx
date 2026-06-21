'use client';

import { BookBookmark, ChartLine } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { analyzePitchDeck } from '@/lib/desktop/runtime';
import { EmptyState, Field, PanelTitle, TextArea } from '../shared';
import { MarkdownOutput } from '../markdown';
import type { PitchSurfaceProps } from './types';

export function PitchReviewSurface({
  state,
  pitch,
  pitchFileError,
  pitchFileMeta,
  busyAction,
  runWithState,
  onPitchChange,
  onPitchFile,
}: PitchSurfaceProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[420px_1fr]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void runWithState('pitch', () => analyzePitchDeck(pitch), 'Pitch review saved.');
        }}
      >
        <PanelTitle icon={ChartLine} title="Pitch review" />
        <Field
          label="Title"
          value={pitch.title}
          onChange={(title) => onPitchChange({ ...pitch, title })}
        />
        <div className="mt-4 space-y-2">
          <Label htmlFor="pitch-deck-file">Deck file</Label>
          <label
            htmlFor="pitch-deck-file"
            className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <BookBookmark className="h-8 w-8 text-muted-foreground" weight="light" />
            <span className="mt-3 text-sm font-medium">Upload PDF, PPTX, TXT, or Markdown</span>
            <span className="mt-1 text-xs text-muted-foreground">
              Read locally before Co-Op reviews it
            </span>
          </label>
          <input
            id="pitch-deck-file"
            type="file"
            accept=".pdf,.pptx,.txt,.md,.markdown,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            className="sr-only"
            onChange={(event) => {
              void onPitchFile(event.target.files?.[0] ?? null);
              event.currentTarget.value = '';
            }}
          />
          {pitchFileMeta && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                {pitchFileMeta.name} - {pitchFileMeta.size}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void onPitchFile(null)}
              >
                Remove
              </Button>
            </div>
          )}
          {pitchFileError && <p className="text-sm text-destructive">{pitchFileError}</p>}
        </div>
        <TextArea
          label="Notes or missing slide context"
          value={pitch.deckNotes}
          onChange={(deckNotes) => onPitchChange({ ...pitch, deckNotes })}
          minHeight="min-h-32"
        />
        <Button
          className="mt-5"
          type="submit"
          disabled={
            busyAction === 'pitch' ||
            !pitch.title.trim() ||
            (!pitch.deckNotes.trim() && !pitch.fileDataBase64)
          }
        >
          Analyze
        </Button>
      </form>
      <div className="space-y-3">
        {state.pitchDecks.map((deck) => (
          <article key={deck.id} className="rounded-lg border border-border/50 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-medium">{deck.title}</h3>
              <Badge variant={deck.score >= 75 ? 'success' : 'warning'}>{deck.score}/100</Badge>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              {deck.sourceFileName && (
                <span className="rounded-full border border-border px-2 py-1">
                  {deck.sourceFileName}
                </span>
              )}
              {deck.slideCount > 0 && (
                <span className="rounded-full border border-border px-2 py-1">
                  {deck.slideCount} slides/pages
                </span>
              )}
            </div>
            <MarkdownOutput
              text={deck.analysis}
              className="coop-scrollbar mt-3 max-h-96 overflow-auto rounded-md bg-muted/40 p-3 text-muted-foreground"
            />
          </article>
        ))}
        {state.pitchDecks.length === 0 && (
          <EmptyState
            icon={ChartLine}
            title="No pitch analysis"
            text="Upload a deck or add notes to get a local investor-readiness review."
          />
        )}
      </div>
    </div>
  );
}
