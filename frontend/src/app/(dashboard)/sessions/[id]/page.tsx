'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Robot,
  User as UserIcon,
  Clock,
  StopCircle,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Session, Message } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDateTime, formatRelativeTime, cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function SessionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.id as string;

  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getSessionHistory(sessionId);
        setSession(data.session);
        setMessages(data.messages);
      } catch (error) {
        console.error('Failed to fetch session:', error);
        toast.error('Failed to load session');
        router.push('/sessions');
      }
      setIsLoading(false);
    };

    fetchData();
  }, [sessionId, router]);

  const handleEndSession = async () => {
    if (!session) return;

    try {
      await api.endSession(session.id);
      setSession({ ...session, status: 'ended' });
      toast.success('Session ended');
    } catch (error) {
      console.error('Failed to end session:', error);
      toast.error('Failed to end session');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sessions')}>
            <ArrowLeft weight="bold" className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-serif text-2xl font-medium tracking-tight">Session Details</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Clock weight="regular" className="w-4 h-4" />
              <span>{formatDateTime(session.createdAt)}</span>
              <span>·</span>
              <span>{formatRelativeTime(session.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={
              session.status === 'active'
                ? 'default'
                : session.status === 'ended'
                ? 'secondary'
                : 'outline'
            }
          >
            {session.status}
          </Badge>
          {session.status === 'active' && (
            <Button variant="outline" onClick={handleEndSession}>
              <StopCircle weight="bold" className="w-4 h-4" />
              End Session
            </Button>
          )}
        </div>
      </motion.div>

      {/* Messages */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        {messages.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No messages in this session</p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn('flex gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.role !== 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Robot weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              <Card
                className={cn(
                  'max-w-[70%] border-border/40',
                  message.role === 'user' ? 'bg-primary/10' : 'bg-card'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium capitalize">{message.role}</span>
                    {message.agent && (
                      <Badge variant="outline" className="text-[10px]">
                        {message.agent}
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </CardContent>
              </Card>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserIcon weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
