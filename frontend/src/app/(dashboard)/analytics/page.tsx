'use client';

import { useEffect, useState, useRef } from 'react';
import { motion } from '@/components/motion';
import {
  Users,
  ChatCircle,
  Buildings,
  Pulse,
  ChartLine,
  Lightning,
  Timer,
  Warning,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useRequireAdmin } from '@/lib/hooks';
import type { DashboardStats } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

function MetricsError({ error, onRetry }: { error: string; onRetry: () => void }) {
  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="font-serif text-lg flex items-center gap-2">
          <Warning weight="regular" className="w-5 h-5 text-destructive" />
          Metrics Unavailable
        </CardTitle>
        <CardDescription>
          {error}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onRetry} variant="outline">
          <ArrowsClockwise weight="bold" className="w-4 h-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

interface PrometheusMetric {
  name: string;
  help: string;
  type: string;
  values: { labels: Record<string, string>; value: number }[];
}

function parsePrometheusMetrics(text: string): PrometheusMetric[] {
  const metrics: PrometheusMetric[] = [];
  const lines = text.split('\n');
  let currentMetric: PrometheusMetric | null = null;

  for (const line of lines) {
    if (line.startsWith('# HELP ')) {
      const parts = line.substring(7).split(' ');
      const name = parts[0];
      const help = parts.slice(1).join(' ');
      currentMetric = { name, help, type: '', values: [] };
    } else if (line.startsWith('# TYPE ')) {
      const parts = line.substring(7).split(' ');
      if (currentMetric && parts[0] === currentMetric.name) {
        currentMetric.type = parts[1];
      }
    } else if (line && !line.startsWith('#') && currentMetric) {
      const match = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\{?([^}]*)\}?\s+(.+)$/);
      if (match) {
        const [, metricName, labelsStr, valueStr] = match;
        if (metricName.startsWith(currentMetric.name)) {
          const labels: Record<string, string> = {};
          if (labelsStr) {
            const labelMatches = Array.from(labelsStr.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)="([^"]*)"/g));
            for (const m of labelMatches) {
              labels[m[1]] = m[2];
            }
          }
          const value = parseFloat(valueStr);
          if (!isNaN(value)) {
            currentMetric.values.push({ labels, value });
          }
        }
      }
      // Check if this is a simple metric without labels
      const simpleMatch = line.match(/^([a-zA-Z_:][a-zA-Z0-9_:]*)\s+(.+)$/);
      if (simpleMatch && !line.includes('{')) {
        const [, metricName, valueStr] = simpleMatch;
        if (metricName === currentMetric.name) {
          const value = parseFloat(valueStr);
          if (!isNaN(value)) {
            currentMetric.values.push({ labels: {}, value });
          }
        }
      }
    }

    // Push metric when we hit a new HELP or end
    if ((line.startsWith('# HELP ') || line === '') && currentMetric && currentMetric.values.length > 0) {
      metrics.push(currentMetric);
      if (!line.startsWith('# HELP ')) {
        currentMetric = null;
      }
    }
  }

  // Push last metric
  if (currentMetric && currentMetric.values.length > 0) {
    metrics.push(currentMetric);
  }

  return metrics;
}

export default function AnalyticsPage() {
  const { isAdmin, isLoading: authLoading } = useRequireAdmin();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [metrics, setMetrics] = useState<PrometheusMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metricsError, setMetricsError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const dataLoadedRef = useRef(false);

  const loadStats = async () => {
    try {
      const statsData = await api.getDashboardStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast.error('Failed to load analytics');
    }
  };

  const loadMetrics = async () => {
    try {
      const metricsText = await api.getPrometheusMetrics();
      const parsed = parsePrometheusMetrics(metricsText);
      setMetrics(parsed);
      setMetricsError(null);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load metrics';
      setMetricsError(errorMsg);
    }
  };

  useEffect(() => {
    if (authLoading || !isAdmin || dataLoadedRef.current) return;
    dataLoadedRef.current = true;
    
    const loadAll = async () => {
      await Promise.all([loadStats(), loadMetrics()]);
      setIsLoading(false);
    };
    loadAll();
  }, [authLoading, isAdmin]);

  const handleRefresh = async () => {
    await Promise.all([loadStats(), loadMetrics()]);
    toast.success('Metrics refreshed');
  };

  // Extract specific metrics
  const getMetricTotal = (name: string): number => {
    const metric = metrics.find(m => m.name === name);
    if (!metric) return 0;
    return metric.values.reduce((sum, v) => sum + v.value, 0);
  };

  const getMetricByLabel = (name: string, labelKey: string): { label: string; value: number }[] => {
    const metric = metrics.find(m => m.name === name);
    if (!metric) return [];
    
    const grouped: Record<string, number> = {};
    for (const v of metric.values) {
      const label = v.labels[labelKey] || 'unknown';
      grouped[label] = (grouped[label] || 0) + v.value;
    }
    
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value);
  };

  const getCircuitBreakerStates = (): { name: string; state: string }[] => {
    const metric = metrics.find(m => m.name === 'circuit_breaker_state');
    if (!metric) return [];
    
    return metric.values.map(v => ({
      name: v.labels.name || 'unknown',
      state: v.value === 0 ? 'closed' : v.value === 1 ? 'open' : 'half-open',
    }));
  };

  if (authLoading || isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  const httpRequestsTotal = getMetricTotal('http_requests_total');
  const llmRequestsTotal = getMetricTotal('llm_requests_total');
  const llmErrorsTotal = getMetricTotal('llm_errors_total');
  const agentTasksTotal = getMetricTotal('agent_tasks_total');
  const llmTokensTotal = getMetricTotal('llm_tokens_total');
  const redisOpsTotal = getMetricTotal('redis_operations_total');
  const redisCacheHits = getMetricTotal('redis_cache_hits_total');
  const redisCacheMisses = getMetricTotal('redis_cache_misses_total');
  const redisErrors = getMetricTotal('redis_errors_total');
  const dbConnectionsActive = getMetricTotal('db_connections_active');
  const retryAttempts = getMetricTotal('retry_attempts_total');
  const retrySuccesses = getMetricTotal('retry_successes_total');
  
  const httpByStatus = getMetricByLabel('http_requests_total', 'status');
  const httpByPath = getMetricByLabel('http_requests_total', 'path');
  const llmByProvider = getMetricByLabel('llm_requests_total', 'provider');
  const llmByModel = getMetricByLabel('llm_requests_total', 'model');
  const llmTokensByType = getMetricByLabel('llm_tokens_total', 'type');
  const agentsByType = getMetricByLabel('agent_tasks_total', 'agent');
  const agentsByStatus = getMetricByLabel('agent_tasks_total', 'status');
  const circuitBreakers = getCircuitBreakerStates();
  
  // Calculate cache hit rate
  const totalCacheOps = redisCacheHits + redisCacheMisses;
  const cacheHitRate = totalCacheOps > 0 ? (redisCacheHits / totalCacheOps) * 100 : 0;
  
  // Calculate retry success rate
  const retrySuccessRate = retryAttempts > 0 ? (retrySuccesses / retryAttempts) * 100 : 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-1 sm:mb-2">Analytics</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Platform statistics and Prometheus metrics</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {lastRefresh && (
            <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" onClick={handleRefresh} size="sm" className="h-9">
            <ArrowsClockwise weight="bold" className="w-4 h-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </motion.div>

      {/* Platform Stats */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
        >
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: Users },
            { label: 'Total Sessions', value: stats.totalSessions, icon: ChatCircle },
            { label: 'Active Sessions', value: stats.activeSessions, icon: Pulse },
            { label: 'Startups', value: stats.totalStartups, icon: Buildings },
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

      {/* Events by Type */}
      {stats && stats.eventsByType.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="font-serif text-xl">Events (Last 7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {stats.eventsByType.map((event) => (
                  <Badge key={event.type} variant="secondary" className="text-sm">
                    {event.type}: {event.count}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Prometheus Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center gap-3">
          <ChartLine weight="bold" className="w-6 h-6" />
          <h2 className="font-serif text-2xl font-medium">Prometheus Metrics</h2>
        </div>

        {metricsError ? (
          <MetricsError error={metricsError} onRetry={loadMetrics} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* HTTP Requests */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">HTTP Requests</p>
                  <ChartLine weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{httpRequestsTotal.toLocaleString()}</p>
                {httpByStatus.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {httpByStatus.slice(0, 3).map(s => (
                      <Badge 
                        key={s.label} 
                        variant={s.label.startsWith('2') ? 'default' : s.label.startsWith('4') ? 'secondary' : 'destructive'}
                        className="text-xs"
                      >
                        {s.label}: {s.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LLM Requests */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">LLM Requests</p>
                  <Lightning weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{llmRequestsTotal.toLocaleString()}</p>
                {llmByProvider.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {llmByProvider.slice(0, 3).map(p => (
                      <Badge key={p.label} variant="outline" className="text-xs">
                        {p.label}: {p.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LLM Errors */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">LLM Errors</p>
                  <Warning weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{llmErrorsTotal.toLocaleString()}</p>
                {llmRequestsTotal > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Error Rate</span>
                      <span>{((llmErrorsTotal / llmRequestsTotal) * 100).toFixed(2)}%</span>
                    </div>
                    <Progress value={(llmErrorsTotal / llmRequestsTotal) * 100} className="h-1" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Agent Tasks */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Agent Tasks</p>
                  <Timer weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{agentTasksTotal.toLocaleString()}</p>
                {agentsByStatus.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {agentsByStatus.map(s => (
                      <Badge 
                        key={s.label} 
                        variant={s.label === 'completed' ? 'default' : s.label === 'failed' ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {s.label}: {s.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* LLM Tokens */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">LLM Tokens</p>
                  <Lightning weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{llmTokensTotal.toLocaleString()}</p>
                {llmTokensByType.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {llmTokensByType.map(t => (
                      <Badge key={t.label} variant="outline" className="text-xs">
                        {t.label}: {t.value.toLocaleString()}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Redis Operations */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Redis Ops</p>
                  <Pulse weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{redisOpsTotal.toLocaleString()}</p>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Cache Hit Rate</span>
                    <span>{cacheHitRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={cacheHitRate} className="h-1" />
                </div>
              </CardContent>
            </Card>

            {/* Cache Stats */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">Cache Stats</p>
                  <ChartLine weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Hits</span>
                    <span className="text-sm font-medium text-green-500">{redisCacheHits.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Misses</span>
                    <span className="text-sm font-medium text-yellow-500">{redisCacheMisses.toLocaleString()}</span>
                  </div>
                  {redisErrors > 0 && (
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Errors</span>
                      <span className="text-sm font-medium text-red-500">{redisErrors.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Database Connections */}
            <Card className="border-border/40">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm text-muted-foreground">DB Connections</p>
                  <Pulse weight="regular" className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-3xl font-serif font-medium">{dbConnectionsActive}</p>
                <p className="text-xs text-muted-foreground mt-2">Active pool connections</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Infrastructure Health */}
        {!metricsError && (retryAttempts > 0 || circuitBreakers.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Retry Stats */}
            {retryAttempts > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">Retry Statistics</CardTitle>
                  <CardDescription>Automatic retry performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Total Attempts</span>
                      <span className="text-lg font-medium">{retryAttempts.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Successful</span>
                      <span className="text-lg font-medium text-green-500">{retrySuccesses.toLocaleString()}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Success Rate</span>
                        <span>{retrySuccessRate.toFixed(1)}%</span>
                      </div>
                      <Progress value={retrySuccessRate} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Circuit Breakers - moved here */}
            {circuitBreakers.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">Circuit Breakers</CardTitle>
                  <CardDescription>Service health status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {circuitBreakers.map((cb) => (
                      <div 
                        key={cb.name} 
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/40"
                      >
                        {cb.state === 'closed' ? (
                          <CheckCircle weight="fill" className="w-4 h-4 text-green-500" />
                        ) : cb.state === 'open' ? (
                          <XCircle weight="fill" className="w-4 h-4 text-red-500" />
                        ) : (
                          <Warning weight="fill" className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-sm font-medium">{cb.name}</span>
                        <Badge 
                          variant={cb.state === 'closed' ? 'default' : cb.state === 'open' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {cb.state}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Detailed Breakdowns */}
        {!metricsError && (httpByPath.length > 0 || llmByModel.length > 0 || agentsByType.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Top Endpoints */}
            {httpByPath.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">Top Endpoints</CardTitle>
                  <CardDescription>Most requested API paths</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {httpByPath.slice(0, 5).map((endpoint) => (
                      <div key={endpoint.label} className="flex items-center justify-between">
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[180px]">
                          {endpoint.label}
                        </code>
                        <span className="text-sm font-medium">{endpoint.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* LLM Models */}
            {llmByModel.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">LLM Models</CardTitle>
                  <CardDescription>Requests by model</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {llmByModel.slice(0, 5).map((model) => (
                      <div key={model.label} className="flex items-center justify-between">
                        <span className="text-sm truncate max-w-[180px]">{model.label}</span>
                        <span className="text-sm font-medium">{model.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Agent Types */}
            {agentsByType.length > 0 && (
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="font-serif text-lg">Agent Tasks</CardTitle>
                  <CardDescription>Tasks by agent type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {agentsByType.map((agent) => (
                      <div key={agent.label} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{agent.label}</span>
                        <span className="text-sm font-medium">{agent.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
