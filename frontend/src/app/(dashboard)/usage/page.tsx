'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBar,
  ChatCircle,
  TrendUp,
  CalendarBlank,
  Robot,
  Gauge,
  Clock,
  Warning,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { UserAnalytics, UsageStats } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface StatCardProps {
  value: number;
  label: string;
  icon: React.ElementType;
  delay?: number;
}

function StatCard({ value, label, icon: Icon, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="border-border/40">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-serif font-medium">{value.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">{label}</p>
            </div>
            <Icon weight="regular" className="w-6 h-6 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-muted rounded animate-pulse" />
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-lg animate-pulse" />
        ))}
      </div>
      <div className="h-48 bg-muted rounded-lg animate-pulse" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-border/40">
      <CardContent className="p-12 text-center">
        <Warning weight="regular" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-serif text-xl font-medium mb-2">Failed to load analytics</h3>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t fetch your usage data. Please try again.
        </p>
        <Button onClick={onRetry}>Retry</Button>
      </CardContent>
    </Card>
  );
}

function ActivityHeatmap({ activity }: { activity: UserAnalytics['recentActivity'] }) {
  if (!activity || activity.length === 0) return null;

  const maxMessages = Math.max(...activity.map(d => d.messages), 1);

  return (
    <div className="grid grid-cols-7 gap-2">
      {activity.map((day) => {
        const intensity = day.messages / maxMessages;
        return (
          <div
            key={day.date}
            className="text-center group cursor-default"
            title={`${day.date}: ${day.sessions} sessions, ${day.messages} messages`}
          >
            <div
              className={`w-full aspect-square rounded-md mb-1 transition-transform group-hover:scale-110 border ${
                intensity > 0 
                  ? 'border-primary/20' 
                  : 'border-border/40'
              }`}
              style={{
                backgroundColor: intensity > 0
                  ? `hsl(262 83% 58% / ${0.15 + intensity * 0.6})`
                  : 'hsl(var(--muted) / 0.5)',
              }}
            />
            <span className="text-[10px] text-muted-foreground">
              {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function UsagePage() {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    
    try {
      const [analyticsData, usageData] = await Promise.all([
        api.getMyAnalytics(),
        api.getUsageStats(),
      ]);
      setAnalytics(analyticsData);
      setUsage(usageData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      setHasError(true);
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (hasError) {
    return (
      <div className="max-w-6xl mx-auto">
        <ErrorState onRetry={fetchData} />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-1">
          Usage & Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your activity and usage patterns
        </p>
      </motion.div>

      {/* Usage Quota (for non-admin users) */}
      {usage && usage.limit !== -1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-border/40">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Gauge weight="regular" className="w-5 h-5 text-muted-foreground" />
                  <h3 className="font-serif text-lg font-medium">Monthly Quota</h3>
                </div>
                <Badge variant={usage.remaining <= 5 ? 'destructive' : 'secondary'}>
                  {usage.remaining} requests left
                </Badge>
              </div>
              <Progress 
                value={(usage.used / usage.limit) * 100} 
                className="h-3 mb-3" 
              />
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 text-sm text-muted-foreground">
                <span>{usage.used.toLocaleString()} / {usage.limit.toLocaleString()} AI requests used</span>
                <span>Resets {new Date(usage.resetsAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats Grid */}
      {analytics && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard 
              value={analytics.totalSessions} 
              label="Total Sessions" 
              icon={ChatCircle}
              delay={0.15}
            />
            <StatCard 
              value={analytics.totalMessages} 
              label="Total Messages" 
              icon={TrendUp}
              delay={0.2}
            />
            <StatCard 
              value={analytics.sessionsThisMonth} 
              label="This Month" 
              icon={CalendarBlank}
              delay={0.25}
            />
            <StatCard 
              value={analytics.averageMessagesPerSession} 
              label="Avg per Session" 
              icon={ChartBar}
              delay={0.3}
            />
          </div>

          {/* Agent Usage */}
          {analytics.agentUsage.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <Card className="border-border/40">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Robot weight="regular" className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-serif text-lg font-medium">Agent Usage</h3>
                  </div>
                  <div className="space-y-3">
                    {analytics.agentUsage.map((agent) => {
                      const total = analytics.agentUsage.reduce((sum, a) => sum + a.count, 0);
                      const percentage = total > 0 ? (agent.count / total) * 100 : 0;
                      return (
                        <div key={agent.agent} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="capitalize font-medium">{agent.agent}</span>
                            <span className="text-muted-foreground">
                              {agent.count.toLocaleString()} responses ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity */}
          {analytics.recentActivity.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="border-border/40">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Clock weight="regular" className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-serif text-lg font-medium">Recent Activity</h3>
                  </div>
                  
                  <ActivityHeatmap activity={analytics.recentActivity} />
                  
                  {analytics.mostActiveDay && (
                    <p className="text-sm text-muted-foreground mt-4">
                      Most active: {new Date(analytics.mostActiveDay).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Empty state for no activity */}
          {analytics.totalSessions === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="border-border/40">
                <CardContent className="p-12 text-center">
                  <ChatCircle weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-medium mb-2">No activity yet</h3>
                  <p className="text-muted-foreground">
                    Start a conversation with our AI agents to see your usage analytics.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
