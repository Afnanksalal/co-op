'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  PaperPlaneTilt,
  CircleNotch,
  Sparkle,
  FileText,
  MagnifyingGlass,
  ArrowLeft,
} from '@phosphor-icons/react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import type { User, Session, AgentType, AgentPhaseResult, TaskStatus } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const agentConfig: Record<
  AgentType,
  {
    name: string;
    fullName: string;
    description: string;
    icon: typeof Scales;
    dataSource: string;
    capabilities: string[];
    examples: string[];
  }
> = {
  legal: {
    name: 'Legal',
    fullName: 'Legal Advisor',
    description: 'Expert guidance on corporate structure, contracts, compliance, and IP protection',
    icon: Scales,
    dataSource: 'RAG (Document Search)',
    capabilities: [
      'Corporate structure recommendations',
      'Contract review and analysis',
      'Compliance requirements',
      'IP protection strategies',
      'Terms of service guidance',
    ],
    examples: [
      'What legal structure should I use for my startup?',
      'What are the key clauses I need in a co-founder agreement?',
      'How do I protect my intellectual property?',
      'What compliance requirements apply to my fintech startup?',
    ],
  },
  finance: {
    name: 'Finance',
    fullName: 'Finance Advisor',
    description: 'Financial modeling, metrics analysis, runway planning, and valuation guidance',
    icon: ChartLineUp,
    dataSource: 'RAG (Document Search)',
    capabilities: [
      'Financial modeling',
      'Unit economics analysis',
      'Runway calculations',
      'Valuation methods',
      'Cap table management',
    ],
    examples: [
      'How do I calculate my startup runway?',
      'What metrics should I track for my SaaS business?',
      'How should I structure my cap table?',
      'What valuation method is best for my stage?',
    ],
  },
  investor: {
    name: 'Investor',
    fullName: 'Investor Relations',
    description: 'VC/angel matching, pitch optimization, and fundraising strategy',
    icon: UsersThree,
    dataSource: 'Web Research (Real-time)',
    capabilities: [
      'Investor matching',
      'Pitch deck feedback',
      'Fundraising strategy',
      'Term sheet analysis',
      'VC research',
    ],
    examples: [
      'Find seed VCs that invest in AI startups',
      'What should I include in my pitch deck?',
      'How do I approach investors for a seed round?',
      'What are typical seed round terms?',
    ],
  },
  competitor: {
    name: 'Competitor',
    fullName: 'Competitive Intelligence',
    description: 'Market landscape analysis, positioning, and competitive strategy',
    icon: Globe,
    dataSource: 'Web Research (Real-time)',
    capabilities: [
      'Competitor analysis',
      'Market landscape mapping',
      'Feature comparison',
      'Positioning strategy',
      'SWOT analysis',
    ],
    examples: [
      'Who are my main competitors in the fintech space?',
      'How does my product compare to competitors?',
      'What is the market size for my industry?',
      'How should I position against established players?',
    ],
  },
};

export default function AgentPage() {
  const params = useParams();
  const router = useRouter();
  const agentType = params.agent as AgentType;
  const config = agentConfig[agentType];

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AgentPhaseResult | null>(null);

  useEffect(() => {
    if (!config) {
      router.push('/dashboard');
      return;
    }

    const init = async () => {
      try {
        const userData = await api.get<User>('/users/me');
        setUser(userData);

        if (userData.startup) {
          const sessionData = await api.post<Session>('/sessions', {
            startupId: userData.startup.id,
            metadata: { source: 'agent-page', agent: agentType },
          });
          setSession(sessionData);
        }
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    init();
  }, [agentType, config, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || !session || !user?.startup || isLoading) return;

    setIsLoading(true);
    setResult(null);

    try {
      const { taskId } = await api.post<{ taskId: string; messageId: string }>('/agents/queue', {
        agentType,
        prompt: prompt.trim(),
        sessionId: session.id,
        startupId: user.startup.id,
      });

      let completed = false;
      while (!completed) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const status = await api.get<TaskStatus>(`/agents/tasks/${taskId}`);

        if (status.status === 'completed' && status.result) {
          const finalResult = status.result.results.find((r) => r.phase === 'final');
          if (finalResult) {
            setResult(finalResult);
          }
          completed = true;
        } else if (status.status === 'failed') {
          throw new Error(status.error || 'Task failed');
        }
      }
    } catch (error) {
      console.error('Failed to get response:', error);
      toast.error('Failed to get response');
    }

    setIsLoading(false);
  };

  if (!config) return null;

  const Icon = config.icon;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="mt-1">
            <ArrowLeft weight="bold" className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Icon weight="light" className="w-8 h-8 text-foreground/70" />
            <h1 className="font-serif text-3xl font-medium tracking-tight">{config.fullName}</h1>
          </div>
          <p className="text-muted-foreground mb-3">{config.description}</p>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {config.dataSource.includes('RAG') ? (
                <FileText weight="regular" className="w-3 h-3 mr-1" />
              ) : (
                <MagnifyingGlass weight="regular" className="w-3 h-3 mr-1" />
              )}
              {config.dataSource}
            </Badge>
            {user?.startup?.sector && <Badge variant="secondary">{user.startup.sector}</Badge>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Sparkle weight="fill" className="w-5 h-5 text-primary" />
                Ask {config.name}
              </CardTitle>
              <CardDescription>Get expert guidance powered by our LLM Council</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Textarea
                  placeholder={`Ask ${config.name} anything...`}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px]"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={!prompt.trim() || isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <PaperPlaneTilt weight="fill" className="w-4 h-4" />
                      Get Advice
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-border/40 glow-sm">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="font-serif">Response</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {Math.round(result.output.confidence * 100)}% confidence
                      </Badge>
                      {result.output.sources.length > 0 && (
                        <Badge variant="secondary">{result.output.sources.length} sources</Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap leading-relaxed">{result.output.content}</p>
                  {result.output.sources.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-border/40">
                      <p className="text-sm font-medium mb-3">Sources</p>
                      <div className="flex flex-wrap gap-2">
                        {result.output.sources.map((source, i) => (
                          <a
                            key={i}
                            href={source}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            {source}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-serif">Capabilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {config.capabilities.map((cap, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <div className="w-1 h-1 rounded-full bg-foreground/30" />
                    {cap}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-base font-serif">Try asking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {config.examples.map((example, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(example)}
                  className="w-full text-left text-sm p-3 rounded-lg border border-border/40 hover:border-border hover:bg-muted/30 transition-all duration-200"
                >
                  {example}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
