'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DesktopState } from '@/lib/desktop/runtime';
import { advisorDisplay } from '../utils';

export function ChatSidebar({
  sessions,
  activeSessionId,
  draftOpen,
  onNew,
  onSelect,
}: {
  sessions: DesktopState['chatSessions'];
  activeSessionId: string | null;
  draftOpen: boolean;
  onNew: () => void;
  onSelect: (session: DesktopState['chatSessions'][number]) => void;
}) {
  return (
    <aside className="flex max-h-52 min-h-0 flex-col overflow-hidden rounded-lg border border-border/50 bg-card p-3 xl:max-h-none">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2 px-1">
        <div>
          <h2 className="font-serif text-lg font-semibold tracking-normal">Sessions</h2>
          <p className="text-xs text-muted-foreground">{sessions.length} private chats</p>
        </div>
        <Button size="sm" variant="outline" onClick={onNew}>
          New
        </Button>
      </div>
      <div className="coop-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {draftOpen && (
          <div className="w-full rounded-lg border border-primary/40 bg-primary/5 p-3 text-left">
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 text-sm font-medium">New conversation</h3>
              <Badge variant="secondary">Draft</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Ready for the next decision.</p>
          </div>
        )}
        {sessions.map((session) => (
          <button
            key={session.id}
            type="button"
            onClick={() => onSelect(session)}
            className={`w-full rounded-lg border p-3 text-left transition-colors ${
              activeSessionId === session.id
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/50 bg-background hover:bg-muted/40'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate text-sm font-medium">
                {session.title || 'Untitled chat'}
              </h3>
              <Badge variant="secondary">{session.messages.length}</Badge>
            </div>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {advisorDisplay(session.agentType)} - {new Date(session.updatedAt).toLocaleDateString()}
            </p>
          </button>
        ))}
        {sessions.length === 0 && !draftOpen && (
          <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No local chats yet.
          </div>
        )}
      </div>
    </aside>
  );
}
