'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Campaign, CampaignEmail, CampaignStats } from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
  </svg>
);

const EMAIL_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  sent: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  delivered: 'bg-green-500/10 text-green-600 border-green-500/20',
  opened: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  clicked: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  bounced: 'bg-red-500/10 text-red-600 border-red-500/20',
  failed: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [emails, setEmails] = useState<CampaignEmail[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [campaignData, emailsData, statsData] = await Promise.all([
        api.getCampaign(campaignId),
        api.getCampaignEmails(campaignId),
        api.getCampaignStats(campaignId),
      ]);
      setCampaign(campaignData);
      setEmails(emailsData || []);
      setStats(statsData);
    } catch {
      toast.error('Failed to load campaign');
      router.push('/tools/outreach');
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const result = await api.sendCampaign(campaignId);
      toast.success(`Sent ${result.sent} emails${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      fetchData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send campaign';
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteCampaign(campaignId);
      toast.success('Campaign deleted');
      router.push('/tools/outreach');
    } catch {
      toast.error('Failed to delete campaign');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const pendingCount = emails.filter(e => e.status === 'pending').length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/tools/outreach')}>
            <ArrowLeftIcon />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-medium tracking-tight">
                {campaign.name}
              </h1>
              <Badge variant="outline" className="capitalize">
                {campaign.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Created {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && campaign.status !== 'completed' && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <PlayIcon />
                  <span className="ml-1.5">Send ({pendingCount})</span>
                </>
              )}
            </Button>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                disabled={isDeleting}
                className="text-muted-foreground hover:text-destructive"
              >
                <TrashIcon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{campaign.name}&quot;? This will also delete all generated emails. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </motion.div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Emails</p>
              <p className="text-2xl font-semibold">{stats.totalEmails}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Sent</p>
              <p className="text-2xl font-semibold">{stats.sent}</p>
              {stats.totalEmails > 0 && (
                <Progress 
                  value={(stats.sent / stats.totalEmails) * 100} 
                  className="h-1 mt-2"
                />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Open Rate</p>
              <p className="text-2xl font-semibold">{stats.openRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.opened} opened</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Click Rate</p>
              <p className="text-2xl font-semibold">{stats.clickRate}%</p>
              <p className="text-xs text-muted-foreground">{stats.clicked} clicked</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Template/Goal Preview */}
      <Card className="border-border/40">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {campaign.mode === 'single_template' ? 'Email Template' : 'AI Configuration'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {campaign.mode === 'single_template' ? 'Single Template' : 'AI Personalized'}
              </Badge>
              <Badge variant="outline" className="text-xs capitalize">
                {campaign.targetLeadType}s
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {campaign.mode === 'single_template' ? (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Subject</p>
                <p className="font-medium">{campaign.subjectTemplate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Body</p>
                <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                  {campaign.bodyTemplate}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground">Campaign Goal</p>
                <p>{campaign.campaignGoal}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tone</p>
                  <p className="font-medium capitalize">{campaign.tone}</p>
                </div>
                {campaign.callToAction && (
                  <div>
                    <p className="text-sm text-muted-foreground">Call to Action</p>
                    <p className="font-medium">{campaign.callToAction}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Emails List */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-lg">Emails ({emails.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No emails generated yet.
            </p>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2 pr-4">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="p-3 rounded-lg border border-border/40"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {email.leadName && (
                            <span className="text-sm text-muted-foreground">{email.leadName}</span>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn('text-xs capitalize', EMAIL_STATUS_COLORS[email.status])}
                          >
                            {email.status}
                          </Badge>
                        </div>
                        <p className="font-medium truncate">{email.subject}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                          {email.body.slice(0, 150)}...
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {email.leadEmail && <span>To: {email.leadEmail}</span>}
                          {email.sentAt && <span>Sent: {formatDate(email.sentAt)}</span>}
                          {email.openedAt && <span>Opened: {formatDate(email.openedAt)}</span>}
                          {email.clickedAt && <span>Clicked: {formatDate(email.clickedAt)}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
