'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WebhooksLogo, Plus, Trash, Pencil, ArrowsClockwise, Check, X } from '@phosphor-icons/react';
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
import { formatRelativeTime } from '@/lib/utils';
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
    if (!formData.name.trim() || !formData.url.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      if (editingWebhook) {
        const updated = await api.updateWebhook(editingWebhook.id, formData);
        setWebhooks((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
        toast.success('Webhook updated');
      } else {
        const created = await api.createWebhook(formData);
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
    if (!confirm('Are you sure you want to delete this webhook?')) return;

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
    if (!confirm('Regenerate the webhook secret? You will need to update your endpoint.')) return;

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
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">Webhooks</h1>
          <p className="text-muted-foreground">Receive real-time notifications for events</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => resetDialog()}>
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
                <Label>Events</Label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_EVENTS.map((event) => (
                    <Badge
                      key={event}
                      variant={formData.events.includes(event) ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => toggleEvent(event)}
                    >
                      {event === '*' ? 'All Events' : event}
                    </Badge>
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
          <CardContent className="p-12 text-center">
            <WebhooksLogo weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium mb-2">No webhooks</h3>
            <p className="text-muted-foreground mb-6">
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
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <WebhooksLogo weight="regular" className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{webhook.name}</p>
                          {webhook.isActive ? (
                            <Badge variant="default" className="text-xs">Active</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate max-w-md">
                          {webhook.url}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {webhook.events.slice(0, 3).map((event) => (
                            <Badge key={event} variant="outline" className="text-[10px]">
                              {event === '*' ? 'All' : event}
                            </Badge>
                          ))}
                          {webhook.events.length > 3 && (
                            <span className="text-xs text-muted-foreground">
                              +{webhook.events.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={webhook.isActive}
                        onCheckedChange={() => handleToggleActive(webhook)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRegenerateSecret(webhook.id)}
                        title="Regenerate secret"
                      >
                        <ArrowsClockwise weight="regular" className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(webhook)}
                      >
                        <Pencil weight="regular" className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(webhook.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash weight="regular" className="w-4 h-4" />
                      </Button>
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
