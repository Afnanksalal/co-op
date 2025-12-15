'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Trash, Copy, Check, Eye, EyeSlash } from '@phosphor-icons/react/dist/ssr';
import { api } from '@/lib/api/client';
import type { ApiKey, ApiKeyCreated } from '@/lib/api/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatRelativeTime, copyToClipboard } from '@/lib/utils';
import { toast } from 'sonner';

const AVAILABLE_SCOPES = ['read', 'write', 'agents', 'sessions'];

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['read']);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const data = await api.getApiKeys();
      setApiKeys(data);
    } catch (error) {
      console.error('Failed to fetch API keys:', error);
      toast.error('Failed to load API keys');
    }
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name for the API key');
      return;
    }

    setIsCreating(true);
    try {
      const key = await api.createApiKey({
        name: newKeyName.trim(),
        scopes: selectedScopes,
      });
      setCreatedKey(key);
      setApiKeys((prev) => [key, ...prev]);
      toast.success('API key created');
    } catch (error) {
      console.error('Failed to create API key:', error);
      toast.error('Failed to create API key');
    }
    setIsCreating(false);
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await api.revokeApiKey(id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key revoked');
    } catch (error) {
      console.error('Failed to revoke API key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const handleCopy = async (text: string, id: string) => {
    await copyToClipboard(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied to clipboard');
  };

  const resetDialog = () => {
    setNewKeyName('');
    setSelectedScopes(['read']);
    setCreatedKey(null);
    setShowKey(false);
    setShowDialog(false);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
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
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight mb-1 sm:mb-2">API Keys</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Manage your API keys for programmatic access</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus weight="bold" className="w-4 h-4" />
              Create Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            {createdKey ? (
              <>
                <DialogHeader>
                  <DialogTitle>API Key Created</DialogTitle>
                  <DialogDescription>
                    Copy your API key now. You won&apos;t be able to see it again.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <code className="text-sm font-mono break-all">
                        {showKey ? createdKey.key : '•'.repeat(40)}
                      </code>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowKey(!showKey)}
                          className="h-8 w-8"
                        >
                          {showKey ? (
                            <EyeSlash weight="regular" className="w-4 h-4" />
                          ) : (
                            <Eye weight="regular" className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopy(createdKey.key, 'new-key')}
                          className="h-8 w-8"
                        >
                          {copiedId === 'new-key' ? (
                            <Check weight="bold" className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy weight="regular" className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={resetDialog}>Done</Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>Create API Key</DialogTitle>
                  <DialogDescription>
                    Create a new API key for programmatic access to Co-Op.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      placeholder="My API Key"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Scopes</Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_SCOPES.map((scope) => (
                        <button
                          key={scope}
                          type="button"
                          onClick={() => toggleScope(scope)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md border transition-all ${
                            selectedScopes.includes(scope)
                              ? 'bg-foreground text-background border-foreground'
                              : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {scope}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={resetDialog}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreate} disabled={isCreating}>
                    {isCreating ? 'Creating...' : 'Create'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>

      {apiKeys.length === 0 ? (
        <Card className="border-border/40">
          <CardContent className="p-12 text-center">
            <Key weight="light" className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-serif text-xl font-medium mb-2">No API keys</h3>
            <p className="text-muted-foreground mb-6">
              Create an API key to access Co-Op programmatically
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
          {apiKeys.map((key, index) => (
            <motion.div
              key={key.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="border-border/40">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Key weight="regular" className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">{key.name}</p>
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                          <code className="text-[10px] sm:text-xs bg-muted px-1 sm:px-1.5 py-0.5 rounded">
                            {key.keyPrefix}...
                          </code>
                          <span className="hidden sm:inline">·</span>
                          <span className="hidden sm:inline">{formatRelativeTime(key.createdAt)}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2 sm:hidden">
                          {key.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-[10px]">
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="hidden sm:flex gap-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRevoke(key.id)}
                        className="text-destructive hover:text-destructive h-8 w-8 sm:h-9 sm:w-9"
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
