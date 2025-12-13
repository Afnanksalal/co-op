'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { ChatCircle, Plus, Clock, ArrowRight } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Session, User } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime, formatDate } from '@/lib/utils';

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userData, sessionsData] = await Promise.all([
          api.get<User>('/users/me'),
          api.get<Session[]>('/sessions'),
        ]);
        setUser(userData);
        setSessions(sessionsData);
      } catch (error) {
        console.error('Failed to fetch sessions:', error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const createSession = async () => {
    if (!user?.startup) return;

    try {
      const session = await api.post<Session>('/sessions', {
        startupId: user.startup.id,
        metadata: { source: 'web' },
      });
      setSessions((prev) => [session, ...prev]);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded shimmer" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-lg shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight">Sessions</h1>
          <p className="text-muted-foreground">Your conversation history</p>
        </div>
        <Button onClick={createSession}>
          <Plus weight="bold" className="w-4 h-4" />
          New Session
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-16 text-center">
            <ChatCircle weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
            <h3 className="font-serif text-xl font-medium mb-2">No sessions yet</h3>
            <p className="text-muted-foreground text-sm mb-8">
              Start a conversation with our AI agents
            </p>
            <Link href="/chat">
              <Button>
                Start Chat
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((session, index) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, duration: 0.3 }}
            >
              <Link href={`/sessions/${session.id}`}>
                <Card hover className="border-border/40">
                  <CardContent className="p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <ChatCircle weight="light" className="w-6 h-6 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Session</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock weight="regular" className="w-3 h-3" />
                          <span>{formatDate(session.createdAt)}</span>
                          <span>·</span>
                          <span>{formatRelativeTime(session.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
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
                      <ArrowRight weight="bold" className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
