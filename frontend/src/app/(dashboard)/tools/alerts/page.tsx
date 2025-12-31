'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Alert, AlertResult } from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
  </svg>
);

const BellIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216ZM48,184c7.7-13.24,16-43.92,16-80a64,64,0,1,1,128,0c0,36.05,8.28,66.73,16,80Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256">
    <path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10a56,56,0,0,1-79.22-79.27l24.12-24.12a56,56,0,0,1,76.81-2.28,8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Z"/>
  </svg>
);

const ALERT_TYPES = [
  { value: 'competitor', label: 'Competitor Updates' },
  { value: 'market', label: 'Market News' },
  { value: 'news', label: 'Industry News' },
  { value: 'funding', label: 'Funding Announcements' },
];

const FREQUENCIES = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Summary' },
];

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [alertResults, setAlertResults] = useState<AlertResult[]>([]);
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [aiTips, setAiTips] = useState<{ type: 'tip' | 'warning' | 'action'; message: string }[]>([]);
  const [isLoadingTips, setIsLoadingTips] = useState(false);
  
  // Form state
  const [newAlert, setNewAlert] = useState({
    name: '',
    type: 'competitor' as Alert['type'],
    keywords: [] as string[],
    competitors: [] as string[],
    frequency: 'daily' as Alert['frequency'],
    emailNotify: true,
  });
  const [keywordInput, setKeywordInput] = useState('');
  const [competitorInput, setCompetitorInput] = useState('');

  // Fetch LLM insights when alerts change
  const fetchAlertTips = useCallback(async (alertsData: Alert[]) => {
    if (alertsData.length === 0) {
      setAiTips([]);
      return;
    }
    
    setIsLoadingTips(true);
    try {
      const response = await api.generateInsights('Monitoring Alerts', {
        totalAlerts: alertsData.length,
        alertTypes: alertsData.map(a => a.type),
        frequencies: alertsData.map(a => a.frequency),
        activeCount: alertsData.filter(a => a.isActive).length,
        pausedCount: alertsData.filter(a => !a.isActive).length,
        hasCompetitorAlert: alertsData.some(a => a.type === 'competitor'),
        hasFundingAlert: alertsData.some(a => a.type === 'funding'),
        hasRealtimeAlert: alertsData.some(a => a.frequency === 'realtime'),
        avgKeywordsPerAlert: alertsData.reduce((sum, a) => sum + (a.keywords?.length || 0), 0) / alertsData.length,
      });
      
      if (response.insights && response.insights.length > 0) {
        setAiTips(response.insights.map(i => ({
          type: i.type as 'tip' | 'warning' | 'action',
          message: i.message,
        })).slice(0, 4));
      } else {
        setAiTips([]);
      }
    } catch (error) {
      console.error('Failed to fetch alert tips:', error);
      setAiTips([]);
    } finally {
      setIsLoadingTips(false);
    }
  }, []);


  const fetchAlerts = useCallback(async () => {
    try {
      const data = await api.getAlerts();
      // Ensure arrays are always arrays (defensive against null/undefined from API)
      const safeAlerts = (data || []).map((alert) => ({
        ...alert,
        keywords: Array.isArray(alert.keywords) ? alert.keywords : [],
        competitors: Array.isArray(alert.competitors) ? alert.competitors : [],
      }));
      setAlerts(safeAlerts);
      
      // Fetch LLM insights after alerts load
      void fetchAlertTips(safeAlerts);
    } catch {
      toast.error('Failed to load alerts');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAlertTips]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const fetchResults = async (alert: Alert) => {
    setSelectedAlert(alert);
    setIsLoadingResults(true);
    try {
      const results = await api.getAlertResults(alert.id);
      // Ensure arrays are always arrays
      const safeResults = (results || []).map((r) => ({
        ...r,
        matchedKeywords: Array.isArray(r.matchedKeywords) ? r.matchedKeywords : [],
      }));
      setAlertResults(safeResults);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setIsLoadingResults(false);
    }
  };

  const handleCreate = async () => {
    if (!newAlert.name.trim()) {
      toast.error('Please enter an alert name');
      return;
    }
    if (newAlert.keywords.length === 0 && newAlert.competitors.length === 0) {
      toast.error('Please add at least one keyword or competitor');
      return;
    }

    setIsCreating(true);
    try {
      const created = await api.createAlert(newAlert);
      setAlerts((prev) => [created, ...prev]);
      setShowCreateDialog(false);
      setNewAlert({
        name: '',
        type: 'competitor',
        keywords: [],
        competitors: [],
        frequency: 'daily',
        emailNotify: true,
      });
      toast.success('Alert created');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create alert';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (alertId: string, isActive: boolean) => {
    try {
      await api.updateAlert(alertId, { isActive });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isActive } : a))
      );
    } catch {
      toast.error('Failed to update alert');
    }
  };

  const handleDelete = async (alertId: string) => {
    try {
      await api.deleteAlert(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
        setAlertResults([]);
      }
      toast.success('Alert deleted');
    } catch {
      toast.error('Failed to delete alert');
    }
  };

  const handleMarkRead = async (resultId: string) => {
    try {
      await api.markAlertResultRead(resultId);
      setAlertResults((prev) =>
        prev.map((r) => (r.id === resultId ? { ...r, isRead: true } : r))
      );
    } catch {
      toast.error('Failed to mark as read');
    }
  };

  const addKeyword = () => {
    if (keywordInput.trim() && newAlert.keywords.length < 10) {
      setNewAlert((prev) => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()],
      }));
      setKeywordInput('');
    }
  };

  const addCompetitor = () => {
    if (competitorInput.trim() && newAlert.competitors.length < 10) {
      setNewAlert((prev) => ({
        ...prev,
        competitors: [...prev.competitors, competitorInput.trim()],
      }));
      setCompetitorInput('');
    }
  };

  const typeColors: Record<string, string> = {
    competitor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    market: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
    news: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    funding: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start sm:items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 sm:h-10 sm:w-10 shrink-0">
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">
              Monitoring Alerts
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">
              Competitor updates and market changes
            </p>
          </div>
        </div>
        
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button disabled={alerts.length >= 3} size="sm" className="shrink-0 h-9 sm:h-10">
              <PlusIcon />
              <span className="ml-1.5 hidden sm:inline">New Alert</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Alert</DialogTitle>
              <DialogDescription>
                Set up monitoring for competitors, market news, or funding announcements.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Alert Name</Label>
                <Input
                  placeholder="e.g., Competitor Product Updates"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select
                    value={newAlert.type}
                    onValueChange={(v) => setNewAlert((prev) => ({ ...prev, type: v as Alert['type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newAlert.frequency}
                    onValueChange={(v) => setNewAlert((prev) => ({ ...prev, frequency: v as Alert['frequency'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Keywords ({newAlert.keywords.length}/10)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add keyword..."
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                  />
                  <Button type="button" variant="outline" onClick={addKeyword}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newAlert.keywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                      <button
                        onClick={() => setNewAlert((prev) => ({
                          ...prev,
                          keywords: prev.keywords.filter((_, idx) => idx !== i),
                        }))}
                        className="ml-1 hover:text-destructive"
                      >
                        <XIcon />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Competitors ({newAlert.competitors.length}/10)</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add competitor name..."
                    value={competitorInput}
                    onChange={(e) => setCompetitorInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCompetitor())}
                  />
                  <Button type="button" variant="outline" onClick={addCompetitor}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {newAlert.competitors.map((c, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {c}
                      <button
                        onClick={() => setNewAlert((prev) => ({
                          ...prev,
                          competitors: prev.competitors.filter((_, idx) => idx !== i),
                        }))}
                        className="ml-1 hover:text-destructive"
                      >
                        <XIcon />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Email notifications</Label>
                <Switch
                  checked={newAlert.emailNotify}
                  onCheckedChange={(v) => setNewAlert((prev) => ({ ...prev, emailNotify: v }))}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Alert'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Pilot limit notice */}
      <Card className="border-border/40 bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Pilot:</span> Up to 3 alerts.
            {alerts.length >= 3 && ' Delete one to create new.'}
          </p>
        </CardContent>
      </Card>

      {/* AI-Powered Insights */}
      {alerts.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z"/>
              </svg>
              <span className="text-sm font-medium text-primary">AI Monitoring Tips</span>
            </div>
            {isLoadingTips ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Generating tips...</span>
              </div>
            ) : aiTips.length > 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {aiTips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={cn(
                      'shrink-0 mt-1 w-1.5 h-1.5 rounded-full',
                      tip.type === 'warning' ? 'bg-orange-500' :
                      tip.type === 'action' ? 'bg-blue-500' : 'bg-green-500'
                    )} />
                    <span>{tip.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Configure your alerts to get personalized tips</p>
            )}
          </CardContent>
        </Card>
      )}


      {/* Main content - split view */}
      <div className="grid lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Alerts list */}
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground">Your Alerts</h2>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-32 bg-muted rounded animate-pulse" />
                          <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                          <div className="h-5 w-14 bg-muted rounded animate-pulse" />
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3].map((j) => (
                            <div key={j} className="h-5 w-16 bg-muted rounded animate-pulse" />
                          ))}
                        </div>
                        <div className="h-4 w-40 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-10 bg-muted rounded-full animate-pulse" />
                        <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <BellIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="font-medium mb-2">No alerts yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first alert to start monitoring competitors and market changes.
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <PlusIcon />
                  <span className="ml-1.5">Create Alert</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert, index) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={cn(
                      "border-border/40 cursor-pointer transition-all",
                      selectedAlert?.id === alert.id && "ring-1 ring-primary border-primary/50"
                    )}
                    onClick={() => fetchResults(alert)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium truncate">{alert.name}</h3>
                            <Badge variant="outline" className={cn('text-xs', typeColors[alert.type])}>
                              {alert.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {alert.frequency}
                            </Badge>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {(alert.keywords || []).slice(0, 3).map((kw, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                            ))}
                            {(alert.competitors || []).slice(0, 2).map((c, i) => (
                              <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                            ))}
                            {((alert.keywords || []).length + (alert.competitors || []).length) > 5 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(alert.keywords || []).length + (alert.competitors || []).length - 5}
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            {alert.triggerCount} triggers
                            {alert.lastTriggeredAt && ` · Last: ${formatDate(alert.lastTriggeredAt)}`}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={alert.isActive}
                            onCheckedChange={(v) => handleToggle(alert.id, v)}
                          />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              >
                                <TrashIcon />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Alert</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete &quot;{alert.name}&quot;? This will stop all monitoring for this alert.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(alert.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Results panel */}
        <div className="space-y-2 sm:space-y-3">
          <h2 className="text-xs sm:text-sm font-medium text-muted-foreground truncate">
            {selectedAlert ? `Results: "${selectedAlert.name}"` : 'Select an alert'}
          </h2>
          
          {!selectedAlert ? (
            <Card className="border-border/40 border-dashed">
              <CardContent className="p-8 text-center">
                <EyeIcon />
                <p className="text-sm text-muted-foreground mt-2">
                  Click on an alert to view its results
                </p>
              </CardContent>
            </Card>
          ) : isLoadingResults ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : alertResults.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <BellIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">No results yet</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll notify you when we find matching content.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[500px]">
              <div className="space-y-3 pr-4">
                <AnimatePresence>
                  {alertResults.map((result, index) => (
                    <motion.div
                      key={result.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                    >
                      <Card className={cn(
                        "border-border/40 transition-colors",
                        !result.isRead && "bg-primary/5 border-primary/20"
                      )}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {!result.isRead && (
                                  <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                                )}
                                <h4 className="font-medium text-sm line-clamp-1">{result.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                {result.summary}
                              </p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {result.source && (
                                  <span className="flex items-center gap-1">
                                    {result.source}
                                  </span>
                                )}
                                <span>{formatDate(result.createdAt)}</span>
                                {result.relevanceScore && (
                                  <Badge variant="secondary" className="text-[10px]">
                                    {Math.round(result.relevanceScore * 100)}% match
                                  </Badge>
                                )}
                              </div>
                              {(result.matchedKeywords || []).length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {(result.matchedKeywords || []).map((kw, i) => (
                                    <Badge key={i} variant="outline" className="text-[10px]">{kw}</Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              {result.sourceUrl && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => window.open(result.sourceUrl!, '_blank')}
                                >
                                  <LinkIcon />
                                </Button>
                              )}
                              {!result.isRead && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleMarkRead(result.id)}
                                >
                                  <EyeIcon />
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </ScrollArea>
          )}
        </div>
      </div>
    </div>
  );
}
