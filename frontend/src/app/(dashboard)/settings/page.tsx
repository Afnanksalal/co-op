'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Buildings, Pencil, Check, X, Sun, Moon, Desktop, ShieldCheck, Trash, FileText, Clock } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { useUIStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import type { SecureDocument } from '@/lib/api/types';

export default function SettingsPage() {
  const { user, refreshUser, isLoading } = useUser();
  const { theme, setTheme } = useUIStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Secure documents state
  const [documents, setDocuments] = useState<SecureDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isPurging, setIsPurging] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const docs = await api.getSecureDocuments();
      setDocuments(docs || []);
    } catch {
      // Silently fail - user may not have any documents
    }
    setIsLoadingDocs(false);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await api.deleteSecureDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
  };

  const handlePurgeAll = async () => {
    if (!confirm('Delete ALL your documents? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All encrypted data will be permanently deleted.')) return;
    
    setIsPurging(true);
    try {
      const result = await api.purgeAllDocuments();
      setDocuments([]);
      toast.success(`Deleted ${result.documentsDeleted} documents and ${result.chunksDeleted} chunks`);
    } catch {
      toast.error('Failed to purge documents');
    }
    setIsPurging(false);
  };

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await api.updateProfile({ name: newName.trim() });
      await refreshUser();
      setIsEditingName(false);
      toast.success('Name updated');
    } catch (error) {
      console.error('Failed to update name:', error);
      toast.error('Failed to update name');
    }
    setIsSaving(false);
  };

  const handleCancelEdit = () => {
    setNewName(user?.name || '');
    setIsEditingName(false);
  };

  if (isLoading || !user) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 sm:space-y-8">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight mb-0.5 sm:mb-1">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage your account and preferences</p>
      </motion.div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/40">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-base sm:text-xl">
              <User weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              Profile
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted flex items-center justify-center text-xl sm:text-2xl font-medium shrink-0">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="max-w-xs"
                      autoFocus
                    />
                    <Button size="icon" onClick={handleSaveName} disabled={isSaving}>
                      <Check weight="bold" className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={handleCancelEdit}>
                      <X weight="bold" className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-lg font-medium">{user.name}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                      className="h-7 w-7"
                    >
                      <Pencil weight="regular" className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Role</Label>
                <p className="text-sm sm:text-base font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Auth Provider</Label>
                <p className="text-sm sm:text-base font-medium capitalize">{user.authProvider || 'Email'}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Member Since</Label>
                <p className="text-sm sm:text-base font-medium">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm text-muted-foreground">Onboarding</Label>
                <Badge variant={user.onboardingCompleted ? 'default' : 'secondary'} className="text-[10px] sm:text-xs">
                  {user.onboardingCompleted ? 'Completed' : 'Pending'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="border-border/40">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-base sm:text-xl">
              <Sun weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              Appearance
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Customize how Co-Op looks</CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-xs sm:text-sm">Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Sun weight="regular" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Light</span>
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Moon weight="regular" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Dark</span>
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                  className="h-9 sm:h-10 text-xs sm:text-sm"
                >
                  <Desktop weight="regular" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">System</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Startup */}
      {user.startup && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="border-border/40">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <CardTitle className="flex items-center gap-2 font-serif text-base sm:text-xl">
                <Buildings weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
                Company
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your startup information</CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-[10px] sm:text-xs text-muted-foreground">Company Name</Label>
                  <p className="text-xs sm:text-sm font-medium truncate">{user.startup.companyName}</p>
                </div>
                <div>
                  <Label className="text-[10px] sm:text-xs text-muted-foreground">Industry</Label>
                  <p className="text-xs sm:text-sm font-medium capitalize truncate">{user.startup.industry.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-[10px] sm:text-xs text-muted-foreground">Sector</Label>
                  <Badge variant="outline" className="capitalize text-[9px] sm:text-[10px]">
                    {user.startup.sector}
                  </Badge>
                </div>
                <div>
                  <Label className="text-[10px] sm:text-xs text-muted-foreground">Stage</Label>
                  <p className="text-xs sm:text-sm font-medium capitalize">{user.startup.stage}</p>
                </div>
                {user.startup.fundingStage && (
                  <div>
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Funding Stage</Label>
                    <p className="text-xs sm:text-sm font-medium capitalize">
                      {user.startup.fundingStage.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Data Privacy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-border/40">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="flex items-center gap-2 font-serif text-base sm:text-xl">
              <ShieldCheck weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
              Data Privacy
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Your documents are encrypted at rest. Original files are never stored.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-4">
            {/* Security Info */}
            <div className="p-3 rounded-lg bg-muted/50 space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <ShieldCheck weight="fill" className="w-4 h-4 text-green-500" />
                <span>AES-256-GCM encryption for all document content</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Clock weight="fill" className="w-4 h-4 text-blue-500" />
                <span>Documents auto-expire after 30 days</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <Trash weight="fill" className="w-4 h-4 text-orange-500" />
                <span>Original files deleted after processing</span>
              </div>
            </div>

            <Separator />

            {/* Documents List */}
            <div>
              <Label className="text-xs sm:text-sm mb-2 block">Your Encrypted Documents ({documents.length})</Label>
              {isLoadingDocs ? (
                <div className="space-y-2">
                  {[1, 2].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}
                </div>
              ) : documents.length === 0 ? (
                <p className="text-xs sm:text-sm text-muted-foreground py-4 text-center">
                  No documents uploaded yet
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText weight="regular" className="w-4 h-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-medium truncate">{doc.originalName}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {doc.chunkCount} chunks · {doc.status}
                            {doc.expiresAt && ` · Expires ${new Date(doc.expiresAt).toLocaleDateString()}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => handleDeleteDocument(doc.id)}
                      >
                        <Trash weight="regular" className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Purge All */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium">Delete All Data</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  Permanently delete all your encrypted documents
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={handlePurgeAll}
                disabled={isPurging || documents.length === 0}
                className="h-8 text-xs"
              >
                {isPurging ? 'Deleting...' : 'Purge All'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
