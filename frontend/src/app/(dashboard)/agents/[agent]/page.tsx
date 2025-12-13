'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  ArrowLeft,
  PaperPlaneTilt,
  CircleNotch,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import type { AgentType, AgentPhaseResult } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

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

  const config = agentConfig[agentType];

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

    try {
      const { taskId } = await api.queueAgent({
        agentType,
        prompt: prompt.trim(),
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
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
          <ArrowLeft weight="bold" className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <config.icon weight="regular" className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-medium tracking-tight">{config.name}</h1>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
        </div>
      </motion.div>

      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Ask a Question</CardTitle>
            <CardDescription>
              Get expert advice from the {config.name.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Type your question here..."
                className="min-h-[120px]"
                disabled={isLoading}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Press Ctrl+Enter to submit
                </p>
                <Button type="submit" disabled={!prompt.trim() || isLoading}>
                  {isLoading ? (
                    <>
                      <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Examples */}
      {!results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-serif text-lg font-medium mb-4">Example Questions</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {config.examples.map((example, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(example)}
                className="text-left text-sm p-4 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
              >
                {example}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Results */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h3 className="font-serif text-lg font-medium">Response</h3>
          {results.map((result, index) => (
            <Card
              key={index}
              className={`border-border/40 ${result.phase === 'final' ? 'ring-1 ring-primary/20' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant={result.phase === 'final' ? 'default' : 'secondary'}>
                    {result.phase.charAt(0).toUpperCase() + result.phase.slice(1)}
                  </Badge>
                  <Badge variant="outline">
                    {Math.round(result.output.confidence * 100)}% confidence
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {result.output.content}
                </p>
                {result.output.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.output.sources.map((source, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </div>
  );
}
