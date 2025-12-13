'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  ChatCircle,
  ArrowRight,
  Sparkle,
  Pulse,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import type { Session, DashboardStats } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatRelativeTime } from '@/lib/utils';

const agents = [
  {
    id: 'legal',
    name: 'Legal',
    description: 'Corporate structure, contracts, compliance',
    icon: Scales,
    href: '/agents/legal',
  },
  {
    id: 'finance',
    name: 'Finance',
    description: 'Financial modeling, metrics, runway',
    icon: ChartLineUp,
    href: '/agents/finance',
  },
  {
    id: 'investor',
    name: 'Investor',
    description: 'VC matching, pitch optimization',
    icon: UsersThree,
    href: '/agents/investor',
  },
  {
    id: 'competitor',
    name: 'Competitor',
    description: 'Market analysis, positioning',
    icon: Globe,
    href: '/agents/competitor',
  },
];

export default function DashboardPage() {
  const { user, isAdmin } = useUser();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const sessionsData = await api.getSessions();
        setSessions(sessionsData.slice(0, 5));

        if (isAdmin) {
          try {
            const statsData = await api.getDashboardStats();
            setStats(statsData);
          } catch {
            // Admin endpoints may fail for non-admins
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
      setIsLoading(false);
    };

    fetchData();
  }, [isAdmin]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-serif text-4xl font-medium tracking-tight mb-2">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-muted-foreground">
          {user?.startup?.companyName} · {user?.startup?.stage} stage
        </p>
      </motion.div>

      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid md:grid-cols-4 gap-4"
        >
          {[
            { label: 'Sessions', value: stats.totalSessions, icon: ChatCircle },
            { label: 'Active', value: stats.activeSessions, icon: Pulse },
            { label: 'Events Today', value: stats.eventsToday, icon: Sparkle },
            { label: 'Users', value: stats.totalUsers, icon: UsersThree },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-serif font-medium">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <stat.icon weight="light" className="w-6 h-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-medium">Agents</h2>
          <Link href="/chat">
            <Button variant="ghost" size="sm">
              Open Chat <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
            >
              <Link href={agent.href}>
                <Card className="h-full border-border/40 hover:border-border transition-colors">
                  <CardContent className="p-6">
                    <agent.icon weight="light" className="w-7 h-7 text-foreground/70 mb-4" />
                    <h3 className="font-serif text-lg font-medium mb-1">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground">{agent.description}</p>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-serif text-2xl font-medium">Recent Sessions</h2>
          <Link href="/sessions">
            <Button variant="ghost" size="sm">
              View All <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-12 text-center">
              <ChatCircle weight="light" className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-serif text-lg font-medium mb-2">No sessions yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Start a conversation with one of our AI agents
              </p>
              <Link href="/chat">
                <Button>Start Chat</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="border-border/40 hover:border-border transition-colors">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <ChatCircle weight="light" className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Session</p>
                        <p className="text-xs text-muted-foreground">
                          {formatRelativeTime(session.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                      {session.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <Card className="border-border/40">
          <CardContent className="p-8 flex items-center justify-between">
            <div>
              <h3 className="font-serif text-xl font-medium mb-1">Need guidance?</h3>
              <p className="text-sm text-muted-foreground">
                Ask any question and our AI council will provide expert advice
              </p>
            </div>
            <Link href="/chat">
              <Button>
                <Sparkle weight="fill" className="w-4 h-4" />
                Start Conversation
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
