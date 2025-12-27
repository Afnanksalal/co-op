'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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

const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z"/>
  </svg>
);

const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144Z"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/>
  </svg>
);

const SendIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M231.87,114l-168-95.89A16,16,0,0,0,40.92,37.34L71.55,128,40.92,218.67A16,16,0,0,0,56,240a16.15,16.15,0,0,0,7.93-2.1l167.92-96.05a16,16,0,0,0,.05-27.89ZM56,224a.56.56,0,0,0,0-.12L85.74,136H144a8,8,0,0,0,0-16H85.74L56.06,32.16A.46.46,0,0,0,56,32l168,95.83Z"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
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

  // Email detail/edit state
  const [selectedEmail, setSelectedEmail] = useState<CampaignEmail | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [isSavingEmail, setIsSavingEmail] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [isSendingSingle, setIsSendingSingle] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

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

  // Email actions
  const handleOpenEmail = (email: CampaignEmail) => {
    setSelectedEmail(email);
    setEditSubject(email.subject);
    setEditBody(email.body);
    setIsEditing(false);
  };

  const handleCloseEmail = () => {
    setSelectedEmail(null);
    setIsEditing(false);
    setEditSubject('');
    setEditBody('');
  };

  const handleStartEdit = () => {
    if (selectedEmail) {
      setEditSubject(selectedEmail.subject);
      setEditBody(selectedEmail.body);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    if (selectedEmail) {
      setEditSubject(selectedEmail.subject);
      setEditBody(selectedEmail.body);
    }
    setIsEditing(false);
  };

  const handleSaveEmail = async () => {
    if (!selectedEmail) return;
    setIsSavingEmail(true);
    try {
      const updated = await api.updateCampaignEmail(campaignId, selectedEmail.id, {
        subject: editSubject,
        body: editBody,
      });
      setEmails(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEmail(updated);
      setIsEditing(false);
      toast.success('Email updated');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update email';
      toast.error(message);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleRegenerate = async () => {
    if (!selectedEmail) return;
    setIsRegenerating(true);
    try {
      const updated = await api.regenerateCampaignEmail(
        campaignId, 
        selectedEmail.id, 
        regenerateInstructions || undefined
      );
      setEmails(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEmail(updated);
      setEditSubject(updated.subject);
      setEditBody(updated.body);
      setShowRegenerateDialog(false);
      setRegenerateInstructions('');
      toast.success('Email regenerated');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to regenerate email';
      toast.error(message);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      await api.deleteCampaignEmail(campaignId, emailId);
      setEmails(prev => prev.filter(e => e.id !== emailId));
      if (selectedEmail?.id === emailId) {
        handleCloseEmail();
      }
      toast.success('Email deleted');
      fetchData(); // Refresh stats
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete email';
      toast.error(message);
    }
  };

  const handleSendSingle = async () => {
    if (!selectedEmail) return;
    setIsSendingSingle(true);
    try {
      const result = await api.sendSingleCampaignEmail(campaignId, selectedEmail.id);
      if (result.success) {
        toast.success('Email sent successfully');
        fetchData();
        handleCloseEmail();
      } else {
        toast.error('Failed to send email');
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to send email';
      toast.error(message);
    } finally {
      setIsSendingSingle(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy');
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
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!campaign) return null;

  const pendingCount = emails.filter(e => e.status === 'pending').length;

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div className="flex items-center gap-3 sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/tools/outreach')} className="shrink-0">
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-serif text-xl sm:text-2xl font-medium tracking-tight truncate">
                {campaign.name}
              </h1>
              <Badge variant="outline" className="capitalize shrink-0">
                {campaign.status}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Created {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pendingCount > 0 && campaign.status !== 'completed' && (
            <Button onClick={handleSend} disabled={isSending} size="sm" className="h-9">
              {isSending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1.5" />
                  Sending...
                </>
              ) : (
                <>
                  <PlayIcon />
                  <span className="ml-1.5">Send All ({pendingCount})</span>
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
                className="h-9 w-9 text-muted-foreground hover:text-destructive"
              >
                <TrashIcon />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Campaign</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete &quot;{campaign.name}&quot;? This will also delete all generated emails.
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4">
          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
              <p className="text-xl sm:text-2xl font-semibold">{stats.totalEmails}</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">Sent</p>
              <p className="text-xl sm:text-2xl font-semibold">{stats.sent}</p>
              {stats.totalEmails > 0 && (
                <Progress value={(stats.sent / stats.totalEmails) * 100} className="h-1 mt-2" />
              )}
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">Open Rate</p>
              <p className="text-xl sm:text-2xl font-semibold">{stats.openRate}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stats.opened} opened</p>
            </CardContent>
          </Card>
          <Card className="border-border/40">
            <CardContent className="p-3 sm:p-4">
              <p className="text-xs sm:text-sm text-muted-foreground">Click Rate</p>
              <p className="text-xl sm:text-2xl font-semibold">{stats.clickRate}%</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">{stats.clicked} clicked</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaign Config Preview */}
      <Card className="border-border/40">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base sm:text-lg">
              {campaign.mode === 'single_template' ? 'Email Template' : 'AI Configuration'}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] sm:text-xs">
                {campaign.mode === 'single_template' ? 'Template' : 'AI Personalized'}
              </Badge>
              <Badge variant="outline" className="text-[10px] sm:text-xs capitalize">
                {campaign.targetLeadType}s
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
          {campaign.mode === 'single_template' ? (
            <>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Subject</p>
                <p className="font-medium text-sm sm:text-base">{campaign.subjectTemplate}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">Body</p>
                <div className="p-3 rounded-lg bg-muted/50 text-xs sm:text-sm whitespace-pre-wrap max-h-[150px] overflow-y-auto">
                  {campaign.bodyTemplate}
                </div>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Goal</p>
                <p className="text-sm sm:text-base">{campaign.campaignGoal}</p>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Tone</p>
                  <p className="font-medium capitalize text-sm">{campaign.tone}</p>
                </div>
                {campaign.callToAction && (
                  <div>
                    <p className="text-xs sm:text-sm text-muted-foreground">CTA</p>
                    <p className="font-medium text-sm">{campaign.callToAction}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Emails List */}
      <Card className="border-border/40">
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
          <CardTitle className="text-base sm:text-lg">Emails ({emails.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {emails.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              No emails generated yet.
            </p>
          ) : (
            <ScrollArea className="h-[400px] sm:h-[500px]">
              <div className="space-y-2 pr-4">
                {emails.map((email) => (
                  <div
                    key={email.id}
                    className="p-3 sm:p-4 rounded-lg border border-border/40 hover:border-border/60 transition-colors cursor-pointer group"
                    onClick={() => handleOpenEmail(email)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {email.leadName && (
                            <span className="text-xs sm:text-sm font-medium">{email.leadName}</span>
                          )}
                          <Badge 
                            variant="outline" 
                            className={cn('text-[10px] sm:text-xs capitalize', EMAIL_STATUS_COLORS[email.status])}
                          >
                            {email.status}
                          </Badge>
                        </div>
                        <p className="font-medium text-sm truncate">{email.subject}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">
                          {email.body}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-[10px] sm:text-xs text-muted-foreground flex-wrap">
                          {email.leadEmail && <span>To: {email.leadEmail}</span>}
                          {email.sentAt && <span>Sent: {formatDate(email.sentAt)}</span>}
                          {email.openedAt && <span className="text-purple-500">Opened</span>}
                          {email.clickedAt && <span className="text-emerald-500">Clicked</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleOpenEmail(email); }}>
                          <EyeIcon />
                        </Button>
                        {email.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <TrashIcon />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Email</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete this email for {email.leadName}?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEmail(email.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Email Detail/Edit Dialog */}
      <Dialog open={!!selectedEmail} onOpenChange={(open) => !open && handleCloseEmail()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="shrink-0">
            <div className="flex items-center justify-between gap-2">
              <DialogTitle className="text-lg font-serif">
                {isEditing ? 'Edit Email' : 'Email Details'}
              </DialogTitle>
              {selectedEmail && (
                <Badge 
                  variant="outline" 
                  className={cn('text-xs capitalize', EMAIL_STATUS_COLORS[selectedEmail.status])}
                >
                  {selectedEmail.status}
                </Badge>
              )}
            </div>
            {selectedEmail && (
              <DialogDescription className="text-sm">
                To: {selectedEmail.leadName} {selectedEmail.leadEmail && `<${selectedEmail.leadEmail}>`}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedEmail && (
            <div className="flex-1 overflow-y-auto space-y-4 py-4">
              {/* Subject */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Subject</Label>
                  {!isEditing && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(selectedEmail.subject, 'subject')}
                    >
                      {copiedField === 'subject' ? <CheckIcon /> : <CopyIcon />}
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Input
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    placeholder="Email subject..."
                    className="text-sm"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm">
                    {selectedEmail.subject}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Body</Label>
                  {!isEditing && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => copyToClipboard(selectedEmail.body, 'body')}
                    >
                      {copiedField === 'body' ? <CheckIcon /> : <CopyIcon />}
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <Textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    placeholder="Email body..."
                    className="min-h-[250px] text-sm"
                  />
                ) : (
                  <div className="p-3 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {selectedEmail.body}
                  </div>
                )}
              </div>

              {/* Tracking Info */}
              {(selectedEmail.sentAt || selectedEmail.openedAt || selectedEmail.clickedAt) && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Tracking</Label>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {selectedEmail.sentAt && <span>Sent: {formatDate(selectedEmail.sentAt)}</span>}
                    {selectedEmail.openedAt && <span className="text-purple-500">Opened: {formatDate(selectedEmail.openedAt)}</span>}
                    {selectedEmail.clickedAt && <span className="text-emerald-500">Clicked: {formatDate(selectedEmail.clickedAt)}</span>}
                  </div>
                </div>
              )}
            </div>
          )}

          <Separator />

          <DialogFooter className="shrink-0 pt-4 flex-wrap gap-2">
            {selectedEmail?.status === 'pending' && (
              <>
                {isEditing ? (
                  <>
                    <Button variant="outline" onClick={handleCancelEdit} disabled={isSavingEmail}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEmail} disabled={isSavingEmail}>
                      {isSavingEmail ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleStartEdit} className="gap-1.5">
                      <PencilIcon />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowRegenerateDialog(true)}
                      className="gap-1.5"
                    >
                      <SparkleIcon />
                      Regenerate
                    </Button>
                    <Button onClick={handleSendSingle} disabled={isSendingSingle} className="gap-1.5">
                      {isSendingSingle ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <SendIcon />
                          Send Now
                        </>
                      )}
                    </Button>
                  </>
                )}
              </>
            )}
            {selectedEmail?.status !== 'pending' && (
              <Button variant="outline" onClick={handleCloseEmail}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif">Regenerate Email</DialogTitle>
            <DialogDescription>
              AI will generate a new personalized email for this lead. You can optionally provide custom instructions.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Custom Instructions (optional)</Label>
              <Textarea
                value={regenerateInstructions}
                onChange={(e) => setRegenerateInstructions(e.target.value)}
                placeholder="e.g., Make it more casual, focus on their recent work, mention our new feature..."
                className="min-h-[100px] text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to regenerate with the original campaign settings.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)} disabled={isRegenerating}>
              Cancel
            </Button>
            <Button onClick={handleRegenerate} disabled={isRegenerating} className="gap-1.5">
              {isRegenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Regenerating...
                </>
              ) : (
                <>
                  <SparkleIcon />
                  Regenerate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
