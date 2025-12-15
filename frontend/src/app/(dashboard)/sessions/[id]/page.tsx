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
  ChatCircle,
} from '@phosphor-icons/react/dist/ssr';
import { api } from '@/lib/api/client';
import type { Session, Message } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, cn } from '@/lib/utils';
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

  const handleContinueChat = () => {
    // Store session in sessionStorage for the chat page to pick up
    sessionStorage.setItem('continueSession', JSON.stringify(session));
    router.push('/chat');
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
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-2 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/sessions')} className="shrink-0 h-8 w-8 sm:h-9 sm:w-9">
            <ArrowLeft weight="bold" className="w-4 sm:w-5 h-4 sm:h-5" />
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl font-medium tracking-tight">Session Details</h1>
            <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              <Clock weight="regular" className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
              <span className="truncate">{formatRelativeTime(session.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 justify-end">
          <Badge
            variant={
              session.status === 'active'
                ? 'default'
                : session.status === 'ended'
                ? 'secondary'
                : 'outline'
            }
            className="text-[10px] sm:text-xs"
          >
            {session.status}
          </Badge>
          {session.status === 'active' && (
            <>
              <Button onClick={handleContinueChat} size="sm" className="h-8 sm:h-9">
                <ChatCircle weight="bold" className="w-4 h-4" />
                <span className="hidden sm:inline">Continue Chat</span>
                <span className="sm:hidden">Continue</span>
              </Button>
              <Button variant="outline" onClick={handleEndSession} size="sm" className="h-8 sm:h-9">
                <StopCircle weight="bold" className="w-4 h-4" />
                <span className="hidden sm:inline">End Session</span>
                <span className="sm:hidden">End</span>
              </Button>
            </>
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
            <CardContent className="p-12 text-center">
              <ChatCircle weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-xl font-medium mb-2">No messages yet</h3>
              <p className="text-muted-foreground">
                This session doesn&apos;t have any messages recorded.
              </p>
            </CardContent>
          </Card>
        ) : (
          messages.map((message, index) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={cn('flex gap-2 sm:gap-4', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              {message.role !== 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Robot weight="regular" className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
                </div>
              )}

              <Card
                className={cn(
                  'max-w-[85%] sm:max-w-[70%] border-border/40',
                  message.role === 'user' ? 'bg-primary/10' : 'bg-card'
                )}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2 flex-wrap">
                    <span className="text-[10px] sm:text-xs font-medium capitalize">{message.role}</span>
                    {message.agent && (
                      <Badge variant="outline" className="text-[9px] sm:text-[10px]">
                        {message.agent}
                      </Badge>
                    )}
                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                      {formatRelativeTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </CardContent>
              </Card>

              {message.role === 'user' && (
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <UserIcon weight="regular" className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground" />
                </div>
              )}
            </motion.div>
          ))
        )}
      </motion.div>
    </div>
  );
}
