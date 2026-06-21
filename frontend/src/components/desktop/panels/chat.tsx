'use client';

import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  isTauriRuntime,
  runAgentChat,
  type ChatProgressEvent,
  type DesktopState,
} from '@/lib/desktop/runtime';
import { ChatComposer } from './chat-composer';
import { ChatEmptyState } from './chat-empty-state';
import { ChatHeader } from './chat-header';
import { ChatMessageBubble } from './chat-message';
import { ChatWorkPanel, mergeChatProgressEvent, type PendingChat } from './chat-progress';
import { ChatSidebar } from './chat-sidebar';

const CHAT_PROGRESS_EVENT = 'chat-progress';

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
  const [researchEnabled, setResearchEnabled] = useState(state.modelSettings.firecrawlApiKeySaved);
  const [councilMode, setCouncilMode] = useState(state.modelSettings.councilMode);
  const [pendingChat, setPendingChat] = useState<PendingChat | null>(null);
  const [progressEvents, setProgressEvents] = useState<ChatProgressEvent[]>([]);
  const [progressTick, setProgressTick] = useState(0);
  const messageListRef = useRef<HTMLDivElement>(null);
  const pendingSessionRef = useRef<string | null>(null);
  const activeSession = sessionId
    ? state.chatSessions.find((session) => session.id === sessionId)
    : undefined;
  const pendingForView = pendingChat?.sessionId === sessionId ? pendingChat : null;
  const hasMessages = Boolean(activeSession?.messages.length || pendingForView);
  const visibleTitle = activeSession?.title ?? pendingForView?.prompt ?? 'New conversation';
  const webSearchRequired = ['legal', 'investor', 'competitor'].includes(agentType);
  const webSearchEnabled = researchEnabled || webSearchRequired;
  const suggestions = [
    'What should I focus on this week?',
    'Build a 30 day operating plan for my company',
    'Review my current risks and next best actions',
    'Draft a customer outreach angle',
  ];

  useEffect(() => {
    if (sessionId && !state.chatSessions.some((session) => session.id === sessionId)) {
      if (pendingChat?.sessionId === sessionId) return;
      setSessionId(state.chatSessions[0]?.id ?? null);
    }
  }, [pendingChat?.sessionId, sessionId, state.chatSessions]);

  useEffect(() => {
    const list = messageListRef.current;
    if (!list || !hasMessages) return;
    list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
  }, [
    activeSession?.id,
    activeSession?.messages.length,
    busyAction,
    hasMessages,
    pendingForView?.sessionId,
    progressEvents.length,
    progressTick,
  ]);

  useEffect(() => {
    if (webSearchRequired) {
      setResearchEnabled(true);
    }
  }, [webSearchRequired]);

  useEffect(() => {
    pendingSessionRef.current = pendingChat?.sessionId ?? null;
  }, [pendingChat?.sessionId]);

  useEffect(() => {
    if (!pendingChat) return;
    setProgressTick(0);
    const timer = window.setInterval(() => setProgressTick((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [pendingChat]);

  useEffect(() => {
    if (!isTauriRuntime()) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    void import('@tauri-apps/api/event')
      .then(({ listen }) =>
        listen<ChatProgressEvent>(CHAT_PROGRESS_EVENT, (event) => {
          const activeSessionId = pendingSessionRef.current;
          if (!activeSessionId || event.payload.sessionId !== activeSessionId) return;
          setProgressEvents((current) => mergeChatProgressEvent(current, event.payload));
        })
      )
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
        } else {
          cleanup = unlisten;
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

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
    const previousSessionId = sessionId;
    const nextSessionId = sessionId ?? createDraftSessionId();
    const pending: PendingChat = {
      sessionId: nextSessionId,
      prompt,
      agentType,
      a2aEnabled,
      ragEnabled,
      researchEnabled: webSearchEnabled,
      councilMode,
      startedAt: Date.now(),
    };
    setSessionId(nextSessionId);
    setPendingChat(pending);
    setProgressEvents([]);
    setMessage('');
    void runWithState(
      'chat',
      () =>
        runAgentChat({
          sessionId: nextSessionId,
          agentType,
          message: prompt,
          a2aEnabled,
          ragEnabled,
          researchEnabled: webSearchEnabled,
          councilMode,
        }),
      'Response saved.'
    ).then((saved) => {
      if (!saved) {
        setSessionId(previousSessionId);
        setMessage(prompt);
      }
      setPendingChat(null);
      setProgressEvents([]);
    });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden xl:grid-cols-[280px_minmax(0,1fr)] xl:grid-rows-1">
      <ChatSidebar
        sessions={state.chatSessions}
        activeSessionId={activeSession?.id ?? null}
        draftOpen={sessionId === null}
        onNew={startNewSession}
        onSelect={selectSession}
      />

      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border/50 bg-card">
        <ChatHeader
          title={visibleTitle}
          agentType={agentType}
          councilMode={councilMode}
          a2aEnabled={a2aEnabled}
          ragEnabled={ragEnabled}
          webSearchEnabled={webSearchEnabled}
          webSearchRequired={webSearchRequired}
          onAgentTypeChange={setAgentType}
          onCouncilModeChange={setCouncilMode}
          onA2aChange={setA2aEnabled}
          onRagChange={setRagEnabled}
          onResearchChange={setResearchEnabled}
        />

        <div
          ref={messageListRef}
          className="coop-scrollbar min-h-0 flex-1 overflow-y-auto p-4 pb-6 sm:p-6 sm:pb-8"
        >
          {hasMessages ? (
            <div className="mx-auto max-w-3xl space-y-5">
              {(activeSession?.messages ?? []).map((item) => (
                <ChatMessageBubble key={item.id} message={item} reviewed={a2aEnabled} />
              ))}
              {pendingForView && (
                <>
                  <ChatMessageBubble
                    message={{
                      id: `${pendingForView.sessionId}-pending-user`,
                      role: 'user',
                      content: pendingForView.prompt,
                      agentType: pendingForView.agentType,
                    }}
                  />
                  <ChatWorkPanel
                    pending={pendingForView}
                    events={progressEvents}
                    tick={progressTick}
                  />
                </>
              )}
            </div>
          ) : (
            <ChatEmptyState suggestions={suggestions} onSelectSuggestion={setMessage} />
          )}
        </div>

        <ChatComposer
          message={message}
          agentType={agentType}
          busy={busyAction === 'chat'}
          onMessageChange={setMessage}
          onSubmit={submitChat}
        />
      </section>
    </div>
  );
}
