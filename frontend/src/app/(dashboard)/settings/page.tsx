'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User as UserIcon, Buildings, FloppyDisk, CircleNotch } from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import type { User, Startup } from '@/lib/api/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [startupData, setStartupData] = useState<Partial<Startup>>({});

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await api.get<User>('/users/me');
        setUser(userData);
        if (userData.startup) {
          setStartupData(userData.startup as unknown as Partial<Startup>);
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
      setIsLoading(false);
    };

    fetchUser();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.patch('/users/me/startup', startupData);
      toast.success('Settings saved');
    } catch (error) {
      console.error('Failed to save:', error);
      toast.error('Failed to save settings');
    }
    setIsSaving(false);
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
        <h1 className="font-serif text-3xl font-medium tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and startup profile</p>
      </div>

      {/* Account */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center gap-3">
              <UserIcon weight="light" className="w-6 h-6 text-foreground/70" />
              <div>
                <CardTitle className="font-serif">Account</CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={user?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Account details are managed through your authentication provider
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Startup */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card className="border-border/40">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Buildings weight="light" className="w-6 h-6 text-foreground/70" />
              <div>
                <CardTitle className="font-serif">Startup Profile</CardTitle>
                <CardDescription>Information about your company</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={startupData.companyName || ''}
                  onChange={(e) => setStartupData((prev) => ({ ...prev, companyName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input
                  value={startupData.website || ''}
                  onChange={(e) => setStartupData((prev) => ({ ...prev, website: e.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={startupData.tagline || ''}
                onChange={(e) => setStartupData((prev) => ({ ...prev, tagline: e.target.value }))}
                placeholder="One-liner about your company"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={startupData.description || ''}
                onChange={(e) => setStartupData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Tell us about your company..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sector</Label>
                <Select
                  value={startupData.sector || ''}
                  onValueChange={(v) => setStartupData((prev) => ({ ...prev, sector: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="greentech">Greentech</SelectItem>
                    <SelectItem value="healthtech">Healthtech</SelectItem>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Stage</Label>
                <Select
                  value={startupData.stage || ''}
                  onValueChange={(v) => setStartupData((prev) => ({ ...prev, stage: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">Idea</SelectItem>
                    <SelectItem value="prototype">Prototype</SelectItem>
                    <SelectItem value="mvp">MVP</SelectItem>
                    <SelectItem value="beta">Beta</SelectItem>
                    <SelectItem value="launched">Launched</SelectItem>
                    <SelectItem value="growth">Growth</SelectItem>
                    <SelectItem value="scale">Scale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-6 border-t border-border/40">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <CircleNotch weight="bold" className="w-4 h-4 animate-spin" />
                ) : (
                  <FloppyDisk weight="bold" className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
