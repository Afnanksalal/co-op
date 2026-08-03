'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Pin, PinOff, Trash } from 'lucide-react';
import type { DesktopState } from '@/lib/desktop/runtime';
import { advisorDisplay } from '../utils';

export function ChatSidebar({
  sessions,
  activeSessionId,
  draftOpen,
  onNew,
  onSelect,
  onPin,
  onDelete,
}: {
  sessions: DesktopState['chatSessions'];
  activeSessionId: string | null;
  draftOpen: boolean;
  onNew: () => void;
  onSelect: (session: DesktopState['chatSessions'][number]) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const sortedSessions = [...sessions].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });
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
        {sortedSessions.map((session) => (
          <div
            key={session.id}
            className={`group relative flex w-full flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${
              activeSessionId === session.id
                ? 'border-primary/40 bg-primary/5'
                : 'border-border/50 bg-background hover:bg-muted/40'
            }`}
          >
            <button
              type="button"
              onClick={() => onSelect(session)}
              className="absolute inset-0 z-0"
              aria-label={`Select chat ${session.title}`}
            />
            <div className="pointer-events-none relative z-10 flex items-center justify-between gap-2">
              <h3 className="min-w-0 truncate text-sm font-medium">
                {session.title || 'Untitled chat'}
              </h3>
              <div className="flex shrink-0 items-center gap-1">
                {session.isPinned && <Pin className="h-3 w-3 text-muted-foreground" />}
                <Badge variant="secondary">{session.messages.length}</Badge>
              </div>
            </div>
            <div className="relative z-10 flex items-center justify-between gap-2">
              <p className="pointer-events-none truncate text-xs text-muted-foreground">
                {advisorDisplay(session.agentType)} - {new Date(session.updatedAt).toLocaleDateString()}
              </p>
              <div className="opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40">
                    <DropdownMenuItem onClick={() => onPin(session.id)}>
                      {session.isPinned ? (
                        <>
                          <PinOff className="mr-2 h-4 w-4" />
                          Unpin chat
                        </>
                      ) : (
                        <>
                          <Pin className="mr-2 h-4 w-4" />
                          Pin chat
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(session.id)}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
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
