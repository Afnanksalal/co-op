'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Buildings, Pencil, Check, X, Sun, Moon, Desktop } from '@phosphor-icons/react';
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

export default function SettingsPage() {
  const { user, refreshUser, isLoading } = useUser();
  const { theme, setTheme } = useUIStore();
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
    </div>
  );
}
