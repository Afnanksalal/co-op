'use client';

import { useEffect, useState, useRef } from 'react';
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
import type { User, Session, AgentType, TaskStatus } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const agentConfig: Record<AgentType, { name: string; icon: typeof Scales }> = {
  legal: { name: 'Legal', icon: Scales },
  finance: { name: 'Finance', icon: ChartLineUp },
  investor: { name: 'Investor', icon: UsersThree },
  competitor: { name: 'Competitor', icon: Globe },
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: AgentType;
  confidence?: number;
  sources?: string[];
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<AgentType>('legal');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const userData = await api.get<User>('/users/me');
        setUser(userData);

        if (userData.startup) {
          const sessionData = await api.post<Session>('/sessions', {
            startupId: userData.startup.id,
            metadata: { source: 'web-chat' },
          });
          setSession(sessionData);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
        toast.error('Failed to initialize chat');
      }
    };

    init();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session || !user?.startup || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        role: 'assistant',
        content: '',
        agent: selectedAgent,
        timestamp: new Date(),
        isStreaming: true,
      },
    ]);

    try {
      const { taskId } = await api.post<{ taskId: string; messageId: string }>('/agents/queue', {
        agentType: selectedAgent,
        prompt: userMessage.content,
        sessionId: session.id,
        startupId: user.startup.id,
        documents: [],
      });

      let completed = false;
      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const status = await api.get<TaskStatus>(`/agents/tasks/${taskId}`);

        if (status.status === 'completed' && status.result) {
          const finalResult = status.result.results.find((r) => r.phase === 'final');
          if (finalResult) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      content: finalResult.output.content,
                      confidence: finalResult.output.confidence,
                      sources: finalResult.output.sources,
                      isStreaming: false,
                    }
                  : m
              )
            );
          }
          completed = true;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Task failed');
        }

        if (status.progress > 0) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId && m.isStreaming
                ? { ...m, content: `Processing... ${status.progress}%` }
                : m
            )
          );
        }
      }

      await api.post(`/sessions/${session.id}/messages`, {
        role: 'user',
        content: userMessage.content,
      });
    } catch (error) {
      console.error('Failed to get response:', error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
            : m
        )
      );
      toast.error('Failed to get response');
    }

    setIsLoading(false);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
                {[
                  'What legal structure should I use?',
                  'How do I calculate runway?',
                  'Find seed VCs for my startup',
                  'Analyze my competitors',
                ].map((suggestion) => (
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
                  <Card
                    className={cn(
                      'border-border/40',
                      message.role === 'user' ? 'bg-primary/10' : 'bg-card'
                    )}
                  >
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
                                onClick={() => copyToClipboard(message.content, message.id)}
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
