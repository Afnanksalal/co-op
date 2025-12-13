'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Robot,
  User as UserIcon,
  Clock,
  Copy,
  Check,
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  CircleNotch,
  XCircle,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Session, Message, AgentType } from '@/lib/api/types';
import { cn, formatDate, formatRelativeTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const agentConfig: Record<AgentType, { name: string; icon: typeof Scales }> = {
  legal: { name: 'Legal', icon: Scales },
  finance: { name: 'Finance', icon: ChartLineUp },
  investor: { name: 'Investor', icon: UsersThree },
  competitor: { name: 'Competitor', icon: Globe },
};

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const [sessionData, messagesData] = await Promise.all([
          api.get<Session>(`/sessions/${sessionId}`),
          api.get<Message[]>(`/sessions/${sessionId}/messages`),
        ]);
        setSession(sessionData);
        setMessages(messagesData);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        toast.error('Failed to load session');
      }
      setIsLoading(false);
    };

    fetchSession();
  }, [sessionId]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const endSession = async () => {
    if (!session) return;
    try {
      await api.post(`/sessions/${sessionId}/end`);
      setSession({ ...session, status: 'ended' });
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh]">
        <XCircle weight="light" className="w-12 h-12 text-destructive mb-6" />
        <h2 className="font-serif text-2xl font-medium mb-2">Session not found</h2>
        <p className="text-muted-foreground mb-6">This session may have been deleted.</p>
        <Button onClick={() => router.push('/sessions')}>
          <ArrowLeft weight="bold" className="w-4 h-4" />
          Back to Sessions
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sessions')}>
            <ArrowLeft weight="bold" className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-medium">Session Details</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock weight="regular" className="w-3 h-3" />
              <span>{formatDate(session.createdAt)}</span>
              <span>·</span>
              <span>{formatRelativeTime(session.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              session.status === 'active'
                ? 'success'
                : session.status === 'ended'
                  ? 'secondary'
                  : 'warning'
            }
          >
            {session.status}
          </Badge>
          {session.status === 'active' && (
            <Button variant="outline" onClick={endSession}>
              End Session
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <Card className="border-border/40">
        <CardContent className="p-6">
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <Robot weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-lg font-medium mb-2">No messages yet</h3>
              <p className="text-sm text-muted-foreground">This session doesn't have any messages.</p>
            </div>
          ) : (
            <div className="space-y-6">
              <AnimatePresence>
                {messages.map((message, index) => {
                  const agent = message.agent as AgentType | null;
                  const config = agent ? agentConfig[agent] : null;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className={cn(
                        'flex gap-4',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {message.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Robot weight="regular" className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      <div className={cn('max-w-[70%]', message.role === 'user' ? 'order-first' : '')}>
                        <div
                          className={cn(
                            'rounded-xl p-4',
                            message.role === 'user' ? 'bg-primary/10' : 'bg-muted/50'
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-2 px-1">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(message.createdAt)}
                          </span>
                          {message.role === 'assistant' && config && (
                            <Badge variant="outline" className="text-xs">
                              {config.name}
                            </Badge>
                          )}
                          {message.role === 'assistant' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => copyToClipboard(message.content, message.id)}
                            >
                              {copiedId === message.id ? (
                                <Check weight="bold" className="w-3 h-3" />
                              ) : (
                                <Copy weight="regular" className="w-3 h-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>

                      {message.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <UserIcon weight="regular" className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
