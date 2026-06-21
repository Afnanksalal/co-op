'use client';

import { Robot, UserCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import type { ChatMessageRecord } from '@/lib/desktop/runtime';
import { MarkdownOutput } from '../markdown';
import { advisorDisplay } from '../utils';

export function ChatMessageBubble({
  message,
  reviewed,
}: {
  message: Pick<ChatMessageRecord, 'id' | 'role' | 'content' | 'agentType'>;
  reviewed?: boolean;
}) {
  const isUser = message.role === 'user';
  const Icon = isUser ? UserCircle : Robot;

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
      <article
        className={`max-w-[86%] rounded-lg border p-4 ${
          isUser ? 'border-primary/20 bg-primary/10' : 'border-border/50 bg-background'
        }`}
      >
        <div className="mb-2 flex items-center gap-2">
          <Badge variant={isUser ? 'secondary' : 'success'}>
            {isUser ? 'You' : advisorDisplay(message.agentType || 'operations')}
          </Badge>
          {!isUser && reviewed && <span className="text-xs text-muted-foreground">Reviewed</span>}
        </div>
        <MarkdownOutput text={message.content} compact />
      </article>
      {isUser && (
        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
