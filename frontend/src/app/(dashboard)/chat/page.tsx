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
  CaretDown,
  CaretUp,
  NotionLogo,
  Lightning,
} from '@phosphor-icons/react/dist/ssr';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { useChatStore, useSessionStore } from '@/lib/store';
import type { AgentType } from '@/lib/api/types';
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
  'What legal structure should I use and how does it affect my finances?',
  'Analyze my market position and find investors for my stage',
  'How do I calculate runway and what legal docs do I need for fundraising?',
  'Compare my competitors and suggest investor pitch strategies',
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
  } = useChatStore();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = useCallback(async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  }, []);

  const handleExportToNotion = useCallback(async (messageId: string, content: string, agent: AgentType | 'multi') => {
    setIsExporting(messageId);
    try {
      const agentName = agent === 'multi' ? 'Multi-Agent' : agentConfig[agent].name;
      const result = await api.exportToNotion({
        title: `${agentName} Analysis - ${new Date().toLocaleDateString()}`,
        agentType: agent === 'multi' ? 'legal' : agent,
        content,
        sources: [],
        metadata: { sessionId: currentSession?.id },
      });
      toast.success('Exported to Notion');
      window.open(result.pageUrl, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export to Notion');
    }
    setIsExporting(null);
  }, [currentSession?.id]);

  const toggleDetails = (id: string) => {
    setExpandedDetails(expandedDetails === id ? null : id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentSession || !user?.startup || isLoading) return;

    const userMessageId = generateId();
    const assistantMessageId = generateId();
    const prompt = input.trim();
    const isMultiAgent = selectedAgent === null;

    addMessage({
      id: userMessageId,
      role: 'user',
      content: prompt,
      timestamp: new Date(),
    });

    addMessage({
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      agent: isMultiAgent ? 'multi' : selectedAgent,
      timestamp: new Date(),
      isStreaming: true,
    });

    setInput('');
    setLoading(true);

    try {
      // Build request based on mode
      const request = isMultiAgent
        ? {
            agents: ['legal', 'finance', 'investor', 'competitor'],
            prompt,
            sessionId: currentSession.id,
            startupId: user.startup.id,
            documents: [],
          }
        : {
            agentType: selectedAgent,
            prompt,
            sessionId: currentSession.id,
            startupId: user.startup.id,
            documents: [],
          };

      const { taskId } = await api.queueAgent(request);

      // Save user message to database
      await api.addSessionMessage(currentSession.id, {
        role: 'user',
        content: prompt,
      });

      let completed = false;
      let finalContent = '';
      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await api.getTaskStatus(taskId);

        if (status.status === 'completed' && status.result) {
          const finalResult = status.result.results.find((r) => r.phase === 'final');
          if (finalResult) {
            finalContent = finalResult.output.content;
            updateMessage(assistantMessageId, {
              content: finalContent,
              confidence: finalResult.output.confidence,
              sources: finalResult.output.sources,
              isStreaming: false,
            });
          }
          completed = true;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Task failed');
        } else if (status.progress > 0) {
          const progressText = isMultiAgent
            ? `Consulting all agents... ${status.progress}%`
            : `Thinking... ${status.progress}%`;
          updateMessage(assistantMessageId, {
            content: progressText,
          });
        }
      }

      // Save assistant response to database
      if (finalContent) {
        await api.addSessionMessage(currentSession.id, {
          role: 'assistant',
          content: finalContent,
          agent: isMultiAgent ? undefined : selectedAgent,
        });
      }
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
      void handleSubmit(e);
    }
  };

  const getPlaceholder = () => {
    if (selectedAgent === null) {
      return 'Ask all agents anything... (A2A multi-agent mode)';
    }
    return `Ask ${agentConfig[selectedAgent].name} anything...`;
  };

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto">
      {/* Agent Selector */}
      <div className="flex items-center gap-1 sm:gap-2 pb-3 sm:pb-4 border-b border-border/40 shrink-0 overflow-x-auto">
        <span className="text-xs sm:text-sm text-muted-foreground mr-1 sm:mr-2 shrink-0">Mode:</span>
        
        {/* Multi-Agent (A2A) Option */}
        <button
          onClick={() => setSelectedAgent(null)}
          className={cn(
            'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200 shrink-0',
            selectedAgent === null
              ? 'bg-primary/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
          )}
        >
          <Lightning weight={selectedAgent === null ? 'fill' : 'regular'} className="w-4 h-4" />
          <span className="hidden sm:inline">All Agents</span>
        </button>

        <div className="w-px h-4 bg-border/40 mx-1" />

        {/* Individual Agents */}
        {(Object.keys(agentConfig) as AgentType[]).map((agent) => {
          const config = agentConfig[agent];
          const isSelected = selectedAgent === agent;
          return (
            <button
              key={agent}
              onClick={() => setSelectedAgent(agent)}
              className={cn(
                'flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm transition-all duration-200 shrink-0',
                isSelected
                  ? 'bg-primary/10 text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <config.icon weight={isSelected ? 'fill' : 'regular'} className="w-4 h-4" />
              <span className="hidden sm:inline">{config.name}</span>
            </button>
          );
        })}
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto py-6 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center px-2">
            <div className="text-center max-w-md">
              {selectedAgent === null ? (
                <>
                  <Lightning weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                  <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Multi-Agent Mode</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
                    All 4 agents collaborate to answer your question. They critique each other and synthesize the best response.
                  </p>
                </>
              ) : (
                <>
                  <Sparkle weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6" />
                  <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Start a conversation</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">
                    Ask {agentConfig[selectedAgent].name} agent any question.
                  </p>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="text-left text-xs sm:text-sm p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
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
                className={cn('flex gap-3', message.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                    {message.agent === 'multi' ? (
                      <Lightning weight="regular" className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Robot weight="regular" className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                )}

                <div className={cn('max-w-[85%]', message.role === 'user' ? 'order-first' : '')}>
                  {message.isStreaming ? (
                    <Card className="border-border/40 bg-card">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                          <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                          <span className="text-sm">{message.content || 'Thinking...'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ) : message.role === 'user' ? (
                    <Card className="border-border/40 bg-primary/10">
                      <CardContent className="p-4">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-2">
                      <Card className="border-border/40 bg-card">
                        <CardContent className="p-4">
                          {message.agent === 'multi' && (
                            <Badge variant="secondary" className="mb-2 text-xs">
                              <Lightning weight="fill" className="w-3 h-3 mr-1" />
                              Multi-Agent Response
                            </Badge>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </CardContent>
                      </Card>

                      {message.confidence && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleDetails(message.id)}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {expandedDetails === message.id ? (
                              <CaretUp weight="bold" className="w-3 h-3" />
                            ) : (
                              <CaretDown weight="bold" className="w-3 h-3" />
                            )}
                            <span>{Math.round(message.confidence * 100)}% confidence</span>
                            {message.sources && message.sources.length > 0 && (
                              <span>· {message.sources.length} sources</span>
                            )}
                          </button>
                          <div className="flex-1" />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopy(message.content, message.id)}
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                          >
                            {copiedId === message.id ? (
                              <Check weight="bold" className="w-3.5 h-3.5" />
                            ) : (
                              <Copy weight="regular" className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          {message.agent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportToNotion(message.id, message.content, message.agent!)}
                              disabled={isExporting === message.id}
                              className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            >
                              {isExporting === message.id ? (
                                <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <NotionLogo weight="regular" className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          )}
                        </div>
                      )}

                      <AnimatePresence>
                        {expandedDetails === message.id && message.sources && message.sources.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                              <div className="flex flex-wrap gap-1">
                                {message.sources.map((source, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {source}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>

                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
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
      <div className="pt-3 sm:pt-4 border-t border-border/40 shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={getPlaceholder()}
              className="min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[150px] pr-12 sm:pr-14 resize-none text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 sm:h-9 sm:w-9"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : (
                <PaperPlaneTilt weight="fill" className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            {selectedAgent === null ? 'Multi-agent A2A mode · ' : ''}Press Enter to send · Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
