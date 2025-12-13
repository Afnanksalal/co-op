'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PaperPlaneTilt,
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  Sparkle,
  CircleNotch,
  Robot,
  User as UserIcon,
  Copy,
  Check,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { useChatStore, useSessionStore } from '@/lib/store';
import type { AgentType, TaskStatus } from '@/lib/api/types';
import { cn, generateId, copyToClipboard } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const agentConfig: Record<AgentType, { name: string; icon: typeof Scales; color: string }> = {
  legal: { name: 'Legal', icon: Scales, color: 'text-blue-500' },
  finance: { name: 'Finance', icon: ChartLineUp, color: 'text-green-500' },
  investor: { name: 'Investor', icon: UsersThree, color: 'text-purple-500' },
  competitor: { name: 'Competitor', icon: Globe, color: 'text-orange-500' },
};

const suggestions = [
  'What legal structure should I use for my startup?',
  'How do I calculate my runway and burn rate?',
  'Find seed-stage VCs that invest in my sector',
  'Analyze my main competitors and market position',
];

export default function ChatPage() {
  const { user } = useUser();
  const { currentSession, setCurrentSession } = useSessionStore();
  const {
    messages,
    selectedAgent,
    isLoading,
    addMessage,
    updateMessage,
    setSelectedAgent,
    setLoading,
    clearMessages,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize session
  useEffect(() => {
    const initSession = async () => {
      if (!user?.startup || currentSession) return;

      try {
        const session = await api.createSession({
          startupId: user.startup.id,
          metadata: { source: 'web-chat' },
        });
        setCurrentSession(session);
      } catch (error) {
        console.error('Failed to create session:', error);
        toast.error('Failed to initialize chat session');
      }
    };

    initSession();
  }, [user?.startup, currentSession, setCurrentSession]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession || !user?.startup || isLoading) return;

    const userMessageId = generateId();
    const assistantMessageId = generateId();
    const prompt = input.trim();

    // Add user message
    addMessage({
      id: userMessageId,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    });

    // Add placeholder assistant message
    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agent: selectedAgent,
      timestamp: new Date(),
      isStreaming: true,
    });

    setInput('');
    setLoading(true);

    try {
      // Queue the agent task
      const { taskId } = await api.queueAgent({
        agentType: selectedAgent,
        prompt,
        sessionId: currentSession.id,
        startupId: user.startup.id,
        documents: [],
      });

      // Poll for completion
      let completed = false;
      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const status = await api.getTaskStatus(taskId);

        if (status.status === 'completed' && status.result) {
          const finalResult = status.result.results.find((r) => r.phase === 'final');
          if (finalResult) {
            updateMessage(assistantMessageId, {
              content: finalResult.output.content,
              confidence: finalResult.output.confidence,
              sources: finalResult.output.sources,
              isStreaming: false,
            });
          }
          completed = true;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Task failed');
        } else if (status.progress > 0) {
          updateMessage(assistantMessageId, {
            content: `Processing... ${status.progress}%`,
          });
        }
      }

      // Save user message to session
      await api.addSessionMessage(currentSession.id, {
        role: 'user',
        content: prompt,
      });
    } catch (error) {
      console.error('Failed to get response:', error);
      updateMessage(assistantMessageId, {
        content: 'Sorry, I encountered an error. Please try again.',
        isStreaming: false,
      });
      toast.error('Failed to get response');
    }

    setLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Agent Selector */}
      <div className="flex items-center gap-2 mb-6 pb-6 border-b border-border/40">
        <span className="text-sm text-muted-foreground mr-3">Agent:</span>
        {(Object.keys(agentConfig) as AgentType[]).map((agent) => {
          const config = agentConfig[agent];
          const isSelected = selectedAgent === agent;
          return (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200',
                isSelected
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <config.icon weight={isSelected ? 'fill' : 'regular'} className="w-4 h-4" />
              {config.name}
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-6 pb-6">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <Sparkle weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
              <h2 className="font-serif text-2xl font-medium mb-3">Start a conversation</h2>
              <p className="text-muted-foreground text-sm mb-8">
                Ask any question about legal, finance, investors, or competitors.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-sm p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn('flex gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Robot weight="regular" className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}

                <div className={cn('max-w-[70%]', message.role === 'user' ? 'order-first' : '')}>
                  <Card className={cn('border-border/40', message.role === 'user' ? 'bg-primary/10' : 'bg-card')}>
                    <CardContent className="p-4">
                      {message.isStreaming ? (
                        <div className="flex items-center gap-2">
                          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                          <span className="text-sm">{message.content || 'Thinking...'}</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

                          {message.role === 'assistant' && message.confidence && (
                            <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {Math.round(message.confidence * 100)}% confidence
                                </Badge>
                                {message.sources && message.sources.length > 0 && (
                                  <Badge variant="secondary" className="text-xs">
                                    {message.sources.length} sources
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(message.content, message.id)}
                                className="h-7 px-2"
                              >
                                {copiedId === message.id ? (
                                  <Check weight="bold" className="w-3 h-3" />
                                ) : (
                                  <Copy weight="regular" className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <UserIcon weight="regular" className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="pt-6 border-t border-border/40">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agentConfig[selectedAgent].name} anything...`}
            className="min-h-[60px] max-h-[200px] pr-14 resize-none"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 bottom-2"
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? (
              <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
            ) : (
              <PaperPlaneTilt weight="fill" className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </form>
    </div>
  );
}
