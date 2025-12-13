'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Key, Plus, Copy, Check, Trash, Info } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { ApiKey } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatRelativeTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const SCOPES = [
  { value: 'agents:read', label: 'Read Agents' },
  { value: 'agents:write', label: 'Write Agents' },
  { value: 'sessions:read', label: 'Read Sessions' },
  { value: 'sessions:write', label: 'Write Sessions' },
  { value: 'webhooks:read', label: 'Read Webhooks' },
  { value: 'webhooks:write', label: 'Write Webhooks' },
  { value: 'mcp', label: 'MCP Access' },
];

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['agents:read', 'agents:write']);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchKeys();
  }, []);

  const fetchKeys = async () => {
    try {
      const data = await api.get<ApiKey[]>('/api-keys');
      setKeys(data);
    } catch (error) {
      console.error('Failed to fetch keys:', error);
    }
    setIsLoading(false);
  };

  const createKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('Please enter a name');
      return;
    }

    setIsCreating(true);
    try {
      const result = await api.post<ApiKey & { key: string }>('/api-keys', {
        name: newKeyName,
        scopes: selectedScopes,
      });
      setNewKey(result.key);
      setKeys((prev) => [result, ...prev]);
      setNewKeyName('');
      toast.success('API key created');
    } catch (error) {
      console.error('Failed to create key:', error);
      toast.error('Failed to create API key');
    }
    setIsCreating(false);
  };

  const deleteKey = async (id: string) => {
    try {
      await api.delete(`/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('API key revoked');
    } catch (error) {
      console.error('Failed to delete key:', error);
      toast.error('Failed to revoke API key');
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success('Copied');
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
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
        <h1 className="font-serif text-3xl font-medium tracking-tight">API Keys</h1>
        <p className="text-muted-foreground">Manage API keys for programmatic access</p>
      </div>

      {/* New Key Alert */}
      {newKey && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info weight="fill" className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium mb-2">Save your API key now</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-background px-3 py-2 rounded text-sm font-mono text-xs">
                      {newKey}
                    </code>
                    <Button size="sm" variant="outline" onClick={() => copyToClipboard(newKey, 'new')}>
                      {copiedId === 'new' ? (
                        <Check weight="bold" className="w-4 h-4" />
                      ) : (
                        <Copy weight="regular" className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setNewKey(null)}>
                  Dismiss
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create Key */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-serif">
            <Plus weight="bold" className="w-5 h-5" />
            Create API Key
          </CardTitle>
          <CardDescription>Generate a new API key with specific permissions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Production API Key"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Scopes</Label>
            <div className="flex flex-wrap gap-2">
              {SCOPES.map((scope) => (
                <button
                  key={scope.value}
                  type="button"
                  onClick={() => toggleScope(scope.value)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all',
                    selectedScopes.includes(scope.value)
                      ? 'border-primary/50 bg-primary/10 text-foreground'
                      : 'border-border/40 text-muted-foreground hover:border-border'
                  )}
                >
                  <div
                    className={cn(
                      'w-3 h-3 rounded border flex items-center justify-center',
                      selectedScopes.includes(scope.value)
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    )}
                  >
                    {selectedScopes.includes(scope.value) && (
                      <Check weight="bold" className="w-2 h-2 text-white" />
                    )}
                  </div>
                  {scope.label}
                </button>
              ))}
            </div>
          </div>

          <Button onClick={createKey} disabled={isCreating || !newKeyName.trim()}>
            <Key weight="bold" className="w-4 h-4" />
            Create Key
          </Button>
        </CardContent>
      </Card>

      {/* Existing Keys */}
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="font-serif">Your API Keys</CardTitle>
          <CardDescription>
            {keys.length} key{keys.length !== 1 ? 's' : ''} created
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keys.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              No API keys yet. Create one above.
            </p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40"
                >
                  <div className="flex items-center gap-4">
                    <Key weight="light" className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{key.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <code>{key.keyPrefix}...</code>
                        <span>·</span>
                        <span>
                          {key.lastUsedAt ? `Used ${formatRelativeTime(key.lastUsedAt)}` : 'Never used'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {key.scopes.slice(0, 2).map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-xs">
                          {scope}
                        </Badge>
                      ))}
                      {key.scopes.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{key.scopes.length - 2}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteKey(key.id)}
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
