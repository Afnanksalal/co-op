'use client';

import { useEffect, useState } from 'react';
import { motion } from '@/components/motion';
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
  Lightning,
  Gauge,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import type { Session, DashboardStats, UsageStats } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsData, usageData] = await Promise.all([
          api.getSessions(),
          api.getUsageStats(),
        ]);
        setSessions(sessionsData.slice(0, 5));
        setUsage(usageData);

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
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 md:space-y-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl font-medium tracking-tight mb-1 sm:mb-2">
          Welcome back, {user?.name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
          {user?.startup?.companyName ? `${user.startup.companyName} · ${user.startup.stage} stage` : 'Your AI advisory board is ready'}
        </p>
      </motion.div>

      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4"
        >
          {[
            { label: 'Sessions', value: stats.totalSessions, icon: ChatCircle },
            { label: 'Active', value: stats.activeSessions, icon: Pulse },
            { label: 'Events', value: stats.eventsToday, icon: Sparkle },
            { label: 'Users', value: stats.totalUsers, icon: UsersThree },
          ].map((stat) => (
            <Card key={stat.label} className="border-border/40">
              <CardContent className="p-3 sm:p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl sm:text-2xl font-serif font-medium">{stat.value}</p>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <stat.icon weight="light" className="w-5 h-5 sm:w-6 sm:h-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Usage Stats Card */}
      {usage && usage.limit !== -1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <Card className="border-border/40">
            <CardContent className="p-4 sm:p-5 md:p-6">
              <div className="flex items-center justify-between mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Gauge weight="light" className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                  <h3 className="font-serif text-base sm:text-lg font-medium">Monthly Usage</h3>
                </div>
                <Badge variant={usage.remaining <= 5 ? 'destructive' : 'secondary'} className="text-[10px] sm:text-xs">
                  {usage.remaining} left
                </Badge>
              </div>
              <div className="space-y-2 sm:space-y-3">
                <Progress value={(usage.used / usage.limit) * 100} className="h-1.5 sm:h-2" />
                <div className="flex items-center justify-between text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                  <span>{usage.used} / {usage.limit} requests</span>
                  {usage.resetsAt && (
                    <span>Resets {new Date(usage.resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Unlimited badge for admins */}
      {usage && usage.limit === -1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
        >
          <Card className="border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3">
              <Lightning weight="fill" className="w-5 h-5 text-primary" />
              <span className="text-sm font-medium">Unlimited AI requests</span>
              <Badge variant="outline" className="ml-auto">Admin</Badge>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-medium">Agents</h2>
          <Link href="/chat">
            <Button variant="ghost" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              Chat <ArrowRight weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
          {agents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.4 }}
            >
              <Link href={agent.href}>
                <Card className="h-full border-border/40 hover:border-border transition-colors">
                  <CardContent className="p-3 sm:p-4 md:p-6">
                    <agent.icon weight="light" className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-foreground/70 mb-2 sm:mb-3 md:mb-4" />
                    <h3 className="font-serif text-sm sm:text-base md:text-lg font-medium mb-0.5 sm:mb-1">{agent.name}</h3>
                    <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
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
        <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
          <h2 className="font-serif text-lg sm:text-xl md:text-2xl font-medium">Recent Sessions</h2>
          <Link href="/sessions">
            <Button variant="ghost" size="sm" className="h-8 sm:h-9 text-xs sm:text-sm">
              All <ArrowRight weight="bold" className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1" />
            </Button>
          </Link>
        </div>

        {sessions.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="p-8 sm:p-12 text-center">
              <ChatCircle weight="light" className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground mx-auto mb-3 sm:mb-4" />
              <h3 className="font-serif text-base sm:text-lg font-medium mb-2">No sessions yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                Start a conversation with our AI agents
              </p>
              <Link href="/chat">
                <Button size="sm">Start Chat</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="border-border/40 hover:border-border transition-colors">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                      <ChatCircle weight="light" className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-medium truncate">
                          {session.title || 'Untitled Session'}
                        </p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">
                          {formatRelativeTime(session.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge variant={session.status === 'active' ? 'default' : 'secondary'} className="text-[9px] sm:text-[10px] shrink-0">
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
          <CardContent className="p-4 sm:p-5 md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div>
              <h3 className="font-serif text-base sm:text-lg md:text-xl font-medium mb-0.5 sm:mb-1">Need guidance?</h3>
              <p className="text-[10px] sm:text-xs md:text-sm text-muted-foreground">
                Ask any question and our AI council will provide expert advice
              </p>
            </div>
            <Link href="/chat" className="w-full sm:w-auto">
              <Button className="w-full sm:w-auto h-9 sm:h-10 text-xs sm:text-sm">
                <Sparkle weight="fill" className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="ml-1.5">Start Chat</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
