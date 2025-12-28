'use client';

import { useEffect, useState } from 'react';
import { motion } from '@/components/motion';
import { WebhooksLogo, Plus, Trash, Pencil, ArrowsClockwise } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Webhook } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const AVAILABLE_EVENTS = [
  'session.created',
  'session.ended',
  'agent.completed',
  'agent.failed',
  '*',
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<Webhook | null>(null);
  const [formData, setFormData] = useState({ name: '', url: '', events: ['*'] as string[] });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const data = await api.getWebhooks();
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      toast.error('Failed to load webhooks');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a webhook name');
      return;
    }
    if (!formData.url.trim()) {
      toast.error('Please enter a webhook URL');
      return;
    }
    // Basic URL validation
    try {
      new URL(formData.url.trim());
    } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com/webhook)');
      return;
    }
    if (formData.events.length === 0) {
      toast.error('Please select at least one event');
      return;
    }

    const cleanedData = {
      name: formData.name.trim(),
      url: formData.url.trim(),
      events: formData.events,
    };

    setIsSaving(true);
    try {
      if (editingWebhook) {
        const updated = await api.updateWebhook(editingWebhook.id, cleanedData);
        setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        toast.success('Webhook updated');
      } else {
        const created = await api.createWebhook(cleanedData);
        setWebhooks((prev) => [created, ...prev]);
        toast.success('Webhook created');
      }
      resetDialog();
    } catch (error) {
      console.error('Failed to save webhook:', error);
      toast.error('Failed to save webhook');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success('Webhook deleted');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const handleToggleActive = async (webhook: Webhook) => {
    try {
      const updated = await api.updateWebhook(webhook.id, { isActive: !webhook.isActive });
      setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
      toast.success(updated.isActive ? 'Webhook enabled' : 'Webhook disabled');
    } catch (error) {
      console.error('Failed to toggle webhook:', error);
      toast.error('Failed to update webhook');
    }
  };

  const handleRegenerateSecret = async (id: string) => {
    try {
      const { secret } = await api.regenerateWebhookSecret(id);
      toast.success('Secret regenerated. New secret: ' + secret.slice(0, 8) + '...');
    } catch (error) {
      console.error('Failed to regenerate secret:', error);
      toast.error('Failed to regenerate secret');
    }
  };

  const openEditDialog = (webhook: Webhook) => {
    setEditingWebhook(webhook);
    setFormData({ name: webhook.name, url: webhook.url, events: webhook.events });
    setShowDialog(true);
  };

  const resetDialog = () => {
    setEditingWebhook(null);
    setFormData({ name: '', url: '', events: ['*'] });
    setShowDialog(false);
  };

  const toggleEvent = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4"
      >
        <div className="min-w-0">
          <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight mb-0.5 sm:mb-1">Webhooks</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Receive real-time notifications for events</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground/70 mt-0.5 sm:mt-1">Pilot: 1 webhook, 10 triggers/day</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()} className="w-full sm:w-auto">
              <Plus weight="bold" className="w-4 h-4" />
              Add Webhook
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingWebhook ? 'Edit Webhook' : 'Add Webhook'}</DialogTitle>
              <DialogDescription>
                Configure a webhook endpoint to receive event notifications.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  placeholder="My Webhook"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>URL</Label>
                <Input
                  placeholder="https://example.com/webhook"
                  value={formData.url}
                  onChange={(e) => setFormData((prev) => ({ ...prev, url: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Events</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleEvent(event)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${
                        formData.events.includes(event)
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-background text-foreground border-border hover:bg-muted'
                      }`}
                    >
                      {event === '*' ? 'All Events' : event}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetDialog}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>

      {webhooks.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-8 sm:p-12 text-center">
            <WebhooksLogo weight="light" className="w-10 h-10 sm:w-12 sm:h-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="font-serif text-lg sm:text-xl font-medium mb-2">No webhooks</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
              Add a webhook to receive real-time event notifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          {webhooks.map((webhook, index) => (
            <motion.div
              key={webhook.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/40">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <WebhooksLogo weight="regular" className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm sm:text-base">{webhook.name}</p>
                          {webhook.isActive ? (
                            <Badge variant="default" className="text-[10px] sm:text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[200px] sm:max-w-md">
                          {webhook.url}
                        </p>
                        <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                          {(webhook.events || []).slice(0, 2).map((event) => (
                            <Badge key={event} variant="outline" className="text-[9px] sm:text-[10px]">
                              {event === '*' ? 'All' : event}
                            </Badge>
                          ))}
                          {(webhook.events || []).length > 2 && (
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              +{(webhook.events || []).length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 justify-end shrink-0">
                      <Switch
                        checked={webhook.isActive}
                        onCheckedChange={() => handleToggleActive(webhook)}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Regenerate secret"
                            className="h-8 w-8 sm:h-9 sm:w-9"
                          >
                            <ArrowsClockwise weight="regular" className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Regenerate Secret</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will generate a new webhook secret. You&apos;ll need to update your endpoint with the new secret.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRegenerateSecret(webhook.id)}>
                              Regenerate
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(webhook)}
                        className="h-8 w-8 sm:h-9 sm:w-9"
                      >
                        <Pencil weight="regular" className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
                          >
                            <Trash weight="regular" className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{webhook.name}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(webhook.id)}
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
        </motion.div>
      )}
    </div>
  );
}
