'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChartBar, Users, ChatCircle, Pulse, TrendUp, Calendar } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { DashboardStats } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.get<DashboardStats>('/analytics/dashboard');
        setStats(data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
      }
      setIsLoading(false);
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="h-8 w-48 bg-muted rounded shimmer" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-lg shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="space-y-8">
        <h1 className="font-serif text-3xl font-medium tracking-tight">Analytics</h1>
        <Card className="border-border/40">
          <CardContent className="p-16 text-center">
            <ChartBar weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
            <h3 className="font-serif text-xl font-medium mb-2">Analytics Unavailable</h3>
            <p className="text-muted-foreground text-sm">
              Analytics data is only available for admin users
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statCards = [
    { title: 'Total Users', value: stats.totalUsers, icon: Users },
    { title: 'Total Sessions', value: stats.totalSessions, icon: ChatCircle },
    { title: 'Active Sessions', value: stats.activeSessions, icon: Pulse },
    { title: 'Events Today', value: stats.eventsToday, icon: TrendUp },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Platform usage and performance metrics</p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.4 }}
          >
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-serif font-medium">{stat.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                  </div>
                  <stat.icon weight="light" className="w-6 h-6 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Events by Type */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
      >
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Calendar weight="light" className="w-5 h-5" />
              Events by Type
            </CardTitle>
            <CardDescription>Distribution of events across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.eventsByType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-12">No events recorded yet</p>
            ) : (
              <div className="space-y-5">
                {stats.eventsByType.map((event) => {
                  const total = stats.eventsByType.reduce((sum, e) => sum + e.count, 0);
                  const percentage = total > 0 ? (event.count / total) * 100 : 0;

                  return (
                    <div key={event.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{event.type}</Badge>
                        <span className="text-sm font-medium">{event.count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary/60 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Startups */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
      >
        <Card className="border-border/40">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Startups</p>
                <p className="text-3xl font-serif font-medium">{stats.totalStartups.toLocaleString()}</p>
              </div>
              <TrendUp weight="light" className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
