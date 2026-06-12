'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Brain, CircleNotch, PaperPlaneTilt, Robot, Sparkle, UserCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { runAgentChat, type DesktopState } from '@/lib/desktop/runtime';
import { EmptyState, SegmentedControl, TogglePill } from '../shared';
import { MarkdownOutput } from '../markdown';
import { advisorDisplay, reviewModeDisplay } from '../utils';

function createDraftSessionId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function ChatPanel({
  state,
  busyAction,
  runWithState,
}: {
  state: DesktopState;
  busyAction: string;
  runWithState: (
    label: string,
    action: () => Promise<DesktopState>,
    success: string
  ) => Promise<boolean>;
}) {
  const [agentType, setAgentType] = useState('operations');
  const [sessionId, setSessionId] = useState<string | null>(state.chatSessions[0]?.id ?? null);
  const [message, setMessage] = useState('');
  const [a2aEnabled, setA2aEnabled] = useState(true);
  const [ragEnabled, setRagEnabled] = useState(true);
  const [researchEnabled, setResearchEnabled] = useState(false);
  const [councilMode, setCouncilMode] = useState(state.modelSettings.councilMode);
  const messageListRef = useRef<HTMLDivElement>(null);
  const activeSession = sessionId
    ? state.chatSessions.find((session) => session.id === sessionId)
    : undefined;
  const hasMessages = Boolean(activeSession?.messages.length);
  const suggestions = [
    'What should I focus on this week?',
    'Build a 30 day operating plan for my company',
    'Review my current risks and next best actions',
    'Draft a customer outreach angle',
  ];

  useEffect(() => {
    if (sessionId && !state.chatSessions.some((session) => session.id === sessionId)) {
      setSessionId(state.chatSessions[0]?.id ?? null);
    }
  }, [sessionId, state.chatSessions]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list || !activeSession?.messages.length) return;
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [activeSession?.id, activeSession?.messages.length, busyAction]);

  function startNewSession() {
    setSessionId(null);
    setMessage('');
  }

  function selectSession(session: DesktopState['chatSessions'][number]) {
    setSessionId(session.id);
    setAgentType(session.agentType);
    setA2aEnabled(session.a2aEnabled);
    setRagEnabled(session.ragEnabled);
    setResearchEnabled(session.researchEnabled);
    setCouncilMode(session.councilMode);
    setMessage('');
  }

  function submitChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const prompt = message.trim();
    if (!prompt) return;
    const nextSessionId = sessionId ?? createDraftSessionId();
    void runWithState(
      'chat',
      () =>
        runAgentChat({
          sessionId: nextSessionId,
          agentType,
          message: prompt,
          a2aEnabled,
          ragEnabled,
          researchEnabled,
          councilMode,
        }),
      'Response saved.'
    ).then((saved) => {
      if (!saved) return;
      setSessionId(nextSessionId);
      setMessage('');
    });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)] xl:grid-rows-1">
      <aside className="flex min-h-0 max-h-52 flex-col overflow-hidden rounded-lg border border-border/50 bg-card p-3 xl:max-h-none">
        <div className="mb-3 flex shrink-0 items-center justify-between gap-2 px-1">
          <div>
            <h2 className="font-serif text-lg font-semibold tracking-normal">Sessions</h2>
            <p className="text-xs text-muted-foreground">
              {state.chatSessions.length} private chats
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={startNewSession}>
            New
          </Button>
        </div>
        <div className="coop-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {sessionId === null && (
            <div className="w-full rounded-lg border border-primary/40 bg-primary/5 p-3 text-left">
              <div className="flex items-center justify-between gap-2">
                <h3 className="min-w-0 text-sm font-medium">New conversation</h3>
                <Badge variant="secondary">Draft</Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Ready for the next decision.</p>
            </div>
          )}
          {state.chatSessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => selectSession(session)}
              className={`w-full rounded-lg border p-3 text-left transition-colors ${
                activeSession?.id === session.id
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
                {advisorDisplay(session.agentType)} -{' '}
                {new Date(session.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
          {state.chatSessions.length === 0 && sessionId !== null && (
            <div className="rounded-lg border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              No local chats yet.
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <div className="shrink-0 border-b border-border/50 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Sparkle className="h-5 w-5 text-muted-foreground" />
                <h2 className="truncate font-serif text-xl font-semibold tracking-normal">
                  {activeSession?.title ?? 'New conversation'}
                </h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ask for plans, drafts, risks, decisions, and next steps using your company context.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:flex xl:items-center">
              <Select value={agentType} onValueChange={setAgentType}>
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
              <Select value={councilMode} onValueChange={setCouncilMode}>
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
            <TogglePill label="Extra review" checked={a2aEnabled} onChange={setA2aEnabled} />
            <TogglePill label="Use files" checked={ragEnabled} onChange={setRagEnabled} />
            <TogglePill
              label="Search web"
              checked={researchEnabled}
              onChange={setResearchEnabled}
            />
          </div>
        </div>

        <div
          ref={messageListRef}
          className="coop-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        >
          {hasMessages ? (
            <div className="mx-auto max-w-3xl space-y-5">
              {(activeSession?.messages ?? []).map((item) => {
                const isUser = item.role === 'user';
                const Icon = isUser ? UserCircle : Robot;
                return (
                  <div
                    key={item.id}
                    className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                    <article
                      className={`max-w-[86%] rounded-lg border p-4 ${isUser ? 'border-primary/20 bg-primary/10' : 'border-border/50 bg-background'}`}
                    >
                      <div className="mb-2 flex items-center gap-2">
                        <Badge variant={isUser ? 'secondary' : 'success'}>
                          {isUser ? 'You' : advisorDisplay(item.agentType || 'operations')}
                        </Badge>
                        {!isUser && a2aEnabled && (
                          <span className="text-xs text-muted-foreground">Reviewed</span>
                        )}
                      </div>
                      <MarkdownOutput text={item.content} compact />
                    </article>
                    {isUser && (
                      <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
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
                    onClick={() => setMessage(suggestion)}
                    className="rounded-lg border border-border/50 bg-background p-3 text-left text-sm transition-colors hover:bg-muted/40"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <form className="shrink-0 border-t border-border/50 bg-card p-4" onSubmit={submitChat}>
          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <textarea
                aria-label="Message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
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
                disabled={busyAction === 'chat' || !message.trim()}
                aria-label="Send message"
              >
                {busyAction === 'chat' ? (
                  <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
                ) : (
                  <PaperPlaneTilt className="h-4 w-4" weight="fill" />
                )}
              </Button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
