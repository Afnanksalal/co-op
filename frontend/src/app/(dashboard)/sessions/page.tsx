'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChatCircle, Clock, ArrowRight, Plus } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Session } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatDateTime } from '@/lib/utils';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const data = await api.getSessions();
        setSessions(data);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
      setIsLoading(false);
    };

    fetchSessions();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">Sessions</h1>
          <p className="text-muted-foreground">Your conversation history with AI agents</p>
        </div>
        <Link href="/chat">
          <Button>
            <Plus weight="bold" className="w-4 h-4" />
            New Session
          </Button>
        </Link>
      </motion.div>

      {sessions.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-12 text-center">
            <ChatCircle weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-6">
              Start a conversation with one of our AI agents
            </p>
            <Link href="/chat">
              <Button>Start Chat</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/sessions/${session.id}`}>
                <Card className="border-border/40 hover:border-border transition-colors cursor-pointer">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <ChatCircle weight="regular" className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">Session</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock weight="regular" className="w-3.5 h-3.5" />
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
                        <ArrowRight weight="bold" className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
