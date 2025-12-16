'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  ArrowLeft,
  PaperPlaneTilt,
  CircleNotch,
  CaretDown,
  CaretUp,
  Copy,
  Check,
  NotionLogo,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import type { AgentType, AgentPhaseResult } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/utils';

const agentConfig: Record<
  AgentType,
  {
    name: string;
    description: string;
    icon: typeof Scales;
    examples: string[];
  }
> = {
  legal: {
    name: 'Legal Agent',
    description: 'Expert guidance on corporate structure, contracts, compliance, and legal matters.',
    icon: Scales,
    examples: [
      'What legal structure should I use for my startup?',
      'What are the key terms I should negotiate in a SAFE?',
      'How do I protect my intellectual property?',
      'What compliance requirements apply to my business?',
    ],
  },
  finance: {
    name: 'Finance Agent',
    description: 'Financial modeling, metrics analysis, runway calculations, and financial planning.',
    icon: ChartLineUp,
    examples: [
      'How do I calculate my burn rate and runway?',
      'What financial metrics should I track?',
      'How should I structure my cap table?',
      'What is a reasonable valuation for my stage?',
    ],
  },
  investor: {
    name: 'Investor Agent',
    description: 'VC matching, pitch optimization, fundraising strategy, and investor relations.',
    icon: UsersThree,
    examples: [
      'Which VCs invest in my sector and stage?',
      'How do I structure my pitch deck?',
      'What questions should I expect from investors?',
      'How do I negotiate term sheets?',
    ],
  },
  competitor: {
    name: 'Competitor Agent',
    description: 'Market analysis, competitive positioning, and strategic intelligence.',
    icon: Globe,
    examples: [
      'Who are my main competitors?',
      'How do I differentiate from competitors?',
      'What is the market size for my industry?',
      'What are the key trends in my market?',
    ],
  },
};

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentType = params.agent as AgentType;
  const { user } = useUser();

  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<AgentPhaseResult[] | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const config = agentConfig[agentType];
  const finalResult = results?.find((r) => r.phase === 'final');
  const thinkingResults = results?.filter((r) => r.phase !== 'final') || [];

  const handleCopy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  }, []);

  const handleExportToNotion = useCallback(async () => {
    if (!finalResult || !config) return;
    setIsExporting(true);
    try {
      const result = await api.exportToNotion({
        title: `${config.name} - ${new Date().toLocaleDateString()}`,
        agentType,
        content: finalResult.output.content,
        sources: finalResult.output.sources,
        metadata: { sessionId, prompt },
      });
      toast.success('Exported to Notion');
      window.open(result.pageUrl, '_blank');
    } catch (error) {
      console.error('Failed to export:', error);
      toast.error('Failed to export to Notion');
    }
    setIsExporting(false);
  }, [finalResult, config, agentType, sessionId, prompt]);

  useEffect(() => {
    // Create a session for this agent interaction
    const createSession = async () => {
      if (!user?.startup) return;
      try {
        const session = await api.createSession({
          startupId: user.startup.id,
          metadata: { source: 'agent-page', agent: agentType },
        });
        setSessionId(session.id);
      } catch (error) {
        console.error('Failed to create session:', error);
      }
    };
    createSession();
  }, [user?.startup, agentType]);

  if (!config) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !sessionId || !user?.startup || isLoading) return;

    setIsLoading(true);
    setResults(null);
    const userPrompt = prompt.trim();

    try {
      // Save user message to database
      await api.addSessionMessage(sessionId, {
        role: 'user',
        content: userPrompt,
      });

      const { taskId } = await api.queueAgent({
        agentType,
        prompt: userPrompt,
        sessionId,
        startupId: user.startup.id,
        documents: [],
      });

      // Poll for completion
      let completed = false;
      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const status = await api.getTaskStatus(taskId);

        if (status.status === 'completed' && status.result) {
          setResults(status.result.results);
          
          // Save assistant response to database
          const final = status.result.results.find((r) => r.phase === 'final');
          if (final) {
            await api.addSessionMessage(sessionId, {
              role: 'assistant',
              content: final.output.content,
              agent: agentType,
            });
          }
          completed = true;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Task failed');
        }
      }
    } catch (error) {
      console.error('Failed to run agent:', error);
      toast.error('Failed to get response');
    }

    setIsLoading(false);
  };

  const handleExampleClick = (example: string) => {
    setPrompt(example);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col max-w-4xl mx-auto">
      {/* Header - fixed at top */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-2 sm:gap-4 pb-3 sm:pb-4 border-b border-border/40 shrink-0"
      >
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
          <ArrowLeft weight="bold" className="w-4 sm:w-5 h-4 sm:h-5" />
        </Button>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
            <config.icon weight="regular" className="w-4 sm:w-5 h-4 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-lg sm:text-xl font-medium tracking-tight truncate">{config.name}</h1>
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-1">{config.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Content area - scrollable */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {/* Examples - show when no results */}
        {!results && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full flex items-center justify-center px-2"
          >
            <div className="text-center max-w-md">
              <config.icon weight="light" className="w-10 sm:w-12 h-10 sm:h-12 text-muted-foreground mx-auto mb-4 sm:mb-6" />
              <h2 className="font-serif text-xl sm:text-2xl font-medium mb-2 sm:mb-3">Ask {config.name}</h2>
              <p className="text-muted-foreground text-xs sm:text-sm mb-6 sm:mb-8">{config.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                {config.examples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => handleExampleClick(example)}
                    className="text-left text-xs sm:text-sm p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {isLoading && !finalResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center py-12"
          >
            <div className="text-center">
              <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Processing your question...</p>
            </div>
          </motion.div>
        )}

        {/* Results */}
        {finalResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {/* Final Result Card */}
            <Card className="border-border/40">
              <CardContent className="p-4">
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {finalResult.output.content}
                </p>
              </CardContent>
            </Card>

            {/* Collapsible details + actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showThinking ? (
                  <CaretUp weight="bold" className="w-3 h-3" />
                ) : (
                  <CaretDown weight="bold" className="w-3 h-3" />
                )}
                <span>{Math.round(finalResult.output.confidence * 100)}% confidence</span>
                {finalResult.output.sources.length > 0 && (
                  <span>· {finalResult.output.sources.length} sources</span>
                )}
                {thinkingResults.length > 0 && (
                  <span>· {thinkingResults.length} thinking steps</span>
                )}
              </button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(finalResult.output.content)}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                {copied ? (
                  <Check weight="bold" className="w-3.5 h-3.5" />
                ) : (
                  <Copy weight="regular" className="w-3.5 h-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportToNotion}
                disabled={isExporting}
                className="h-7 px-2 text-muted-foreground hover:text-foreground"
              >
                {isExporting ? (
                  <CircleNotch weight="bold" className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <NotionLogo weight="regular" className="w-3.5 h-3.5" />
                )}
              </Button>
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {showThinking && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3"
                >
                  {/* Sources */}
                  {finalResult.output.sources.length > 0 && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/40">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Sources</p>
                      <div className="flex flex-wrap gap-1">
                        {finalResult.output.sources.map((source, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {source}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Thinking steps (Draft/Critique) */}
                  {thinkingResults.map((result, index) => (
                    <div key={index} className="p-3 rounded-lg bg-muted/20 border border-border/40">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {result.phase.charAt(0).toUpperCase() + result.phase.slice(1)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(result.output.confidence * 100)}% confidence
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {result.output.content}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* Input - fixed at bottom */}
      <div className="pt-3 sm:pt-4 border-t border-border/40 shrink-0">
        <form onSubmit={handleSubmit}>
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleSubmit(e);
                }
              }}
              placeholder={`Ask ${config.name.toLowerCase()} anything...`}
              className="min-h-[48px] sm:min-h-[56px] max-h-[120px] sm:max-h-[150px] pr-12 sm:pr-14 resize-none text-sm"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="absolute right-2 bottom-2 h-8 w-8 sm:h-9 sm:w-9"
              disabled={!prompt.trim() || isLoading}
            >
              {isLoading ? (
                <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
              ) : (
                <PaperPlaneTilt weight="fill" className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2 text-center hidden sm:block">
            Press Ctrl+Enter to send
          </p>
        </form>
      </div>
    </div>
  );
}
