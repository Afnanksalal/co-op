'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Buildings, Pencil, Check, X } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user, refreshUser } = useUser();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);

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

  if (!user) return null;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-serif text-3xl font-medium tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </motion.div>

      {/* Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-xl">
              <User weight="regular" className="w-5 h-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-medium">
                {user.name?.charAt(0) || 'U'}
              </div>
              <div className="flex-1">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Role</Label>
                <p className="font-medium capitalize">{user.role}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Auth Provider</Label>
                <p className="font-medium capitalize">{user.authProvider || 'Email'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Member Since</Label>
                <p className="font-medium">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Onboarding</Label>
                <Badge variant={user.onboardingCompleted ? 'default' : 'secondary'}>
                  {user.onboardingCompleted ? 'Completed' : 'Pending'}
                </Badge>
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
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-xl">
                <Buildings weight="regular" className="w-5 h-5" />
                Company
              </CardTitle>
              <CardDescription>Your startup information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Company Name</Label>
                  <p className="font-medium">{user.startup.companyName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Industry</Label>
                  <p className="font-medium capitalize">{user.startup.industry.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Sector</Label>
                  <Badge variant="outline" className="capitalize">
                    {user.startup.sector}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Stage</Label>
                  <p className="font-medium capitalize">{user.startup.stage}</p>
                </div>
                {user.startup.fundingStage && (
                  <div>
                    <Label className="text-muted-foreground">Funding Stage</Label>
                    <p className="font-medium capitalize">
                      {user.startup.fundingStage.replace('_', ' ')}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
