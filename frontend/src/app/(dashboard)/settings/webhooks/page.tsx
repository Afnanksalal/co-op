'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { WebhooksLogo, Plus, Trash, Check, Globe, Info } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { Webhook as WebhookType } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const EVENTS = [
  { value: 'session.created', label: 'Session Created' },
  { value: 'session.ended', label: 'Session Ended' },
  { value: 'agent.started', label: 'Agent Started' },
  { value: 'agent.completed', label: 'Agent Completed' },
  { value: 'agent.failed', label: 'Agent Failed' },
  { value: 'user.created', label: 'User Created' },
  { value: 'startup.created', label: 'Startup Created' },
];

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: ['agent.completed'] });

  useEffect(() => {
    fetchWebhooks();
  }, []);

  const fetchWebhooks = async () => {
    try {
      const data = await api.get<WebhookType[]>('/webhooks');
      setWebhooks(data);
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
    }
    setIsLoading(false);
  };

  const createWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsCreating(true);
    try {
      const result = await api.post<WebhookType>('/webhooks', newWebhook);
      setWebhooks((prev) => [result, ...prev]);
      setNewWebhook({ name: '', url: '', events: ['agent.completed'] });
      toast.success('Webhook created');
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    }
    setIsCreating(false);
  };

  const deleteWebhook = async (id: string) => {
    try {
      await api.delete(`/webhooks/${id}`);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success('Webhook deleted');
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const toggleEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 bg-muted rounded shimmer" />
        <div className="h-64 bg-muted rounded-lg shimmer" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight">Webhooks</h1>
        <p className="text-muted-foreground">Receive HTTP callbacks when events occur</p>
      </div>

      {/* Create Webhook */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Plus weight="bold" className="w-5 h-5" />
            Create Webhook
          </CardTitle>
          <CardDescription>Set up a new webhook endpoint</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="My Webhook"
                value={newWebhook.name}
                onChange={(e) => setNewWebhook((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                placeholder="https://example.com/webhook"
                value={newWebhook.url}
                onChange={(e) => setNewWebhook((prev) => ({ ...prev, url: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Events</Label>
            <div className="flex flex-wrap gap-2">
              {EVENTS.map((event) => (
                <button
                  key={event.value}
                  type="button"
                  onClick={() => toggleEvent(event.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
                    newWebhook.events.includes(event.value)
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-border'
                  )}
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded border flex items-center justify-center',
                      newWebhook.events.includes(event.value)
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {newWebhook.events.includes(event.value) && (
                      <Check weight="bold" className="w-2 h-2 text-white" />
                    )}
                  </div>
                  {event.label}
                </button>
              ))}
            </div>
          </div>

          <Button
            onClick={createWebhook}
            disabled={isCreating || !newWebhook.name.trim() || !newWebhook.url.trim()}
          >
            <WebhooksLogo weight="bold" className="w-4 h-4" />
            Create Webhook
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info weight="fill" className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium mb-1">Webhook Security</p>
              <p className="text-muted-foreground">
                All payloads are signed with HMAC-SHA256. Verify the{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Webhook-Signature</code> header.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Existing Webhooks */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="font-serif">Your Webhooks</CardTitle>
          <CardDescription>
            {webhooks.length} webhook{webhooks.length !== 1 ? 's' : ''} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No webhooks yet. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40"
                >
                  <div className="flex items-center gap-4">
                    <Globe weight="light" className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{webhook.name}</p>
                        <Badge variant={webhook.isActive ? 'success' : 'secondary'}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate max-w-[250px]">
                        {webhook.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {webhook.events.slice(0, 2).map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                      {webhook.events.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{webhook.events.length - 2}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteWebhook(webhook.id)}
                      className="text-destructive hover:text-destructive h-8 w-8"
                    >
                      <Trash weight="regular" className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
