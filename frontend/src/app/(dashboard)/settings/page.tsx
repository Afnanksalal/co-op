'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from '@/components/motion';
import { 
  User, Buildings, Pencil, Check, X, Sun, Moon, Desktop, ShieldCheck, 
  Trash, FileText, Clock, MagnifyingGlass, CaretDown, FloppyDisk
} from '@phosphor-icons/react';
import { api } from '@/lib/api/client';
import { useUser } from '@/lib/hooks';
import { useUIStore } from '@/lib/store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import type { SecureDocument, Sector, OnboardingData } from '@/lib/api/types';
import { SECTOR_CATEGORIES, SECTOR_LABELS, SECTORS } from '@/lib/api/types';

// Popular sectors shown first
const POPULAR_SECTORS: Sector[] = ['saas', 'fintech', 'healthtech', 'ai_ml', 'ecommerce', 'marketplace', 'edtech', 'greentech'];

// Compact sector picker for settings
function SectorPicker({ 
  value, 
  onChange,
}: { 
  value: Sector | undefined; 
  onChange: (sector: Sector) => void;
}) {
  const [search, setSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const filteredSectors = useMemo(() => {
    if (!search) return null;
    const query = search.toLowerCase();
    return Object.entries(SECTOR_LABELS)
      .filter(([key, label]) => 
        label.toLowerCase().includes(query) || key.includes(query)
      )
      .map(([key]) => key as Sector);
  }, [search]);

  const popularSectors = POPULAR_SECTORS.filter(s => 
    !search || SECTOR_LABELS[s].toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search sectors..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9"
        />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-1">
        {(filteredSectors || popularSectors).slice(0, showAll ? undefined : 8).map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => onChange(sector)}
            className={cn(
              'p-2 rounded-lg border text-left transition-all text-xs',
              value === sector 
                ? 'border-primary/50 bg-primary/5' 
                : 'border-border/40 hover:border-border'
            )}
          >
            <span className="font-medium">{SECTOR_LABELS[sector]}</span>
          </button>
        ))}
      </div>
      {!search && !showAll && popularSectors.length > 8 && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="w-full text-xs">
          Show all sectors <CaretDown className="w-3 h-3 ml-1" />
        </Button>
      )}
      {showAll && !search && (
        <div className="space-y-2 pt-2 border-t border-border/40 max-h-[200px] overflow-y-auto">
          {Object.entries(SECTOR_CATEGORIES).map(([category, sectors]) => (
            <div key={category}>
              <button
                type="button"
                onClick={() => setExpandedCategory(expandedCategory === category ? null : category)}
                className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground py-1"
              >
                {category}
                <CaretDown className={cn('w-3 h-3 transition-transform', expandedCategory === category && 'rotate-180')} />
              </button>
              {expandedCategory === category && (
                <div className="grid grid-cols-2 gap-1.5 mt-2">
                  {sectors.map((sector) => (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => onChange(sector as Sector)}
                      className={cn(
                        'p-2 rounded-md border text-left transition-all text-xs',
                        value === sector 
                          ? 'border-primary/50 bg-primary/5' 
                          : 'border-border/40 hover:border-border'
                      )}
                    >
                      {SECTOR_LABELS[sector as Sector]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export default function SettingsPage() {
  const { user, refreshUser, isLoading } = useUser();
  const { theme, setTheme } = useUIStore();
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  
  // Company editing state
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [companyForm, setCompanyForm] = useState<Partial<OnboardingData>>({});
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isLoadingStartup, setIsLoadingStartup] = useState(false);
  
  // Secure documents state
  const [documents, setDocuments] = useState<SecureDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);
  const [isPurging, setIsPurging] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);
  const [showPurgeDialog, setShowPurgeDialog] = useState(false);

  // Initialize company form when user loads
  useEffect(() => {
    if (user?.startup) {
      setCompanyForm({
        companyName: user.startup.companyName,
        sector: user.startup.sector as Sector,
        stage: user.startup.stage as OnboardingData['stage'],
        fundingStage: user.startup.fundingStage as OnboardingData['fundingStage'] | undefined,
      });
    }
  }, [user?.startup]);

  // Load full startup data when editing starts
  const handleStartEditing = async () => {
    if (!user?.startup?.id) return;
    
    setIsLoadingStartup(true);
    try {
      // Fetch full startup data
      const fullStartup = await api.getStartup(user.startup.id);
      setCompanyForm({
        // Founder info
        founderName: fullStartup.founderName,
        founderRole: fullStartup.founderRole as OnboardingData['founderRole'],
        // Company basics
        companyName: fullStartup.companyName,
        tagline: fullStartup.tagline || undefined,
        description: fullStartup.description,
        website: fullStartup.website || undefined,
        // Business classification
        sector: fullStartup.sector as Sector,
        businessModel: fullStartup.businessModel as OnboardingData['businessModel'],
        revenueModel: fullStartup.revenueModel as OnboardingData['revenueModel'] | undefined,
        // Stage
        stage: fullStartup.stage as OnboardingData['stage'],
        foundedYear: fullStartup.foundedYear,
        // Team
        teamSize: fullStartup.teamSize as OnboardingData['teamSize'],
        cofounderCount: fullStartup.cofounderCount,
        // Location
        country: fullStartup.country,
        city: fullStartup.city || undefined,
        operatingRegions: fullStartup.operatingRegions || undefined,
        // Financials
        fundingStage: fullStartup.fundingStage as OnboardingData['fundingStage'] | undefined,
        totalRaised: fullStartup.totalRaised ? Number(fullStartup.totalRaised) : undefined,
        monthlyRevenue: fullStartup.monthlyRevenue ? Number(fullStartup.monthlyRevenue) : undefined,
        isRevenue: fullStartup.isRevenue as OnboardingData['isRevenue'],
        // Market
        targetCustomer: fullStartup.targetCustomer || undefined,
        problemSolved: fullStartup.problemSolved || undefined,
        competitiveAdvantage: fullStartup.competitiveAdvantage || undefined,
      });
    } catch {
      // Fall back to summary data if full fetch fails
      toast.error('Could not load full company data');
    }
    setIsLoadingStartup(false);
    setIsEditingCompany(true);
  };

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
    try {
      await api.deleteSecureDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
      toast.success('Document deleted');
    } catch {
      toast.error('Failed to delete document');
    }
    setDocumentToDelete(null);
  };

  const handlePurgeAll = async () => {
    setIsPurging(true);
    try {
      const result = await api.purgeAllDocuments();
      setDocuments([]);
      toast.success(`Deleted ${result.documentsDeleted} documents`);
    } catch {
      toast.error('Failed to purge documents');
    }
    setIsPurging(false);
    setShowPurgeDialog(false);
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

  const handleSaveCompany = async () => {
    if (!companyForm.companyName?.trim()) {
      toast.error('Company name cannot be empty');
      return;
    }
    if (!companyForm.sector) {
      toast.error('Please select a sector');
      return;
    }
    if (!companyForm.description || companyForm.description.length < 20) {
      toast.error('Description must be at least 20 characters');
      return;
    }
    
    setIsSavingCompany(true);
    try {
      // Sync industry with sector (cast since they overlap)
      await api.updateStartup({
        // Founder info
        founderName: companyForm.founderName,
        founderRole: companyForm.founderRole,
        // Company basics
        companyName: companyForm.companyName.trim(),
        tagline: companyForm.tagline,
        description: companyForm.description,
        website: companyForm.website,
        // Business classification
        sector: companyForm.sector,
        industry: companyForm.sector as OnboardingData['industry'], // Keep in sync
        businessModel: companyForm.businessModel,
        revenueModel: companyForm.revenueModel,
        // Stage
        stage: companyForm.stage,
        foundedYear: companyForm.foundedYear,
        // Team
        teamSize: companyForm.teamSize,
        cofounderCount: companyForm.cofounderCount,
        // Location
        country: companyForm.country,
        city: companyForm.city,
        operatingRegions: companyForm.operatingRegions,
        // Financials
        fundingStage: companyForm.fundingStage,
        totalRaised: companyForm.totalRaised,
        monthlyRevenue: companyForm.monthlyRevenue,
        isRevenue: companyForm.isRevenue,
        // Market
        targetCustomer: companyForm.targetCustomer,
        problemSolved: companyForm.problemSolved,
        competitiveAdvantage: companyForm.competitiveAdvantage,
      });
      await refreshUser();
      setIsEditingCompany(false);
      toast.success('Company profile updated');
    } catch (error) {
      console.error('Failed to update company:', error);
      toast.error('Failed to update company profile');
    }
    setIsSavingCompany(false);
  };

  const handleCancelCompanyEdit = () => {
    if (user?.startup) {
      setCompanyForm({
        companyName: user.startup.companyName,
        sector: user.startup.sector as Sector,
        stage: user.startup.stage as OnboardingData['stage'],
        fundingStage: user.startup.fundingStage as OnboardingData['fundingStage'] | undefined,
      });
    }
    setIsEditingCompany(false);
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="max-w-xs" autoFocus />
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
                    <Button size="icon" variant="ghost" onClick={() => setIsEditingName(true)} className="h-7 w-7">
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
                  {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
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
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
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
                <Button variant={theme === 'light' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('light')} className="h-9 sm:h-10 text-xs sm:text-sm">
                  <Sun weight="regular" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Light</span>
                </Button>
                <Button variant={theme === 'dark' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('dark')} className="h-9 sm:h-10 text-xs sm:text-sm">
                  <Moon weight="regular" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Dark</span>
                </Button>
                <Button variant={theme === 'system' ? 'default' : 'outline'} size="sm" onClick={() => setTheme('system')} className="h-9 sm:h-10 text-xs sm:text-sm">
                  <Desktop weight="regular" className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">System</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Company - Full Editing */}
      {user.startup && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-border/40">
            <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 font-serif text-base sm:text-xl">
                    <Buildings weight="regular" className="w-4 h-4 sm:w-5 sm:h-5" />
                    Company
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-sm">Your startup information</CardDescription>
                </div>
                {!isEditingCompany && (
                  <Button variant="outline" size="sm" onClick={handleStartEditing} disabled={isLoadingStartup} className="h-8">
                    {isLoadingStartup ? (
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
                    ) : (
                      <Pencil weight="regular" className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {isEditingCompany ? (
                <div className="space-y-4">
                  {/* Founder Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Founder Name</Label>
                      <Input
                        value={companyForm.founderName || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, founderName: e.target.value }))}
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Founder Role</Label>
                      <Select 
                        value={companyForm.founderRole || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, founderRole: v as OnboardingData['founderRole'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ceo">CEO</SelectItem>
                          <SelectItem value="cto">CTO</SelectItem>
                          <SelectItem value="coo">COO</SelectItem>
                          <SelectItem value="cfo">CFO</SelectItem>
                          <SelectItem value="cpo">CPO</SelectItem>
                          <SelectItem value="founder">Founder</SelectItem>
                          <SelectItem value="cofounder">Co-founder</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Company Name */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Company Name</Label>
                    <Input
                      value={companyForm.companyName || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, companyName: e.target.value }))}
                      placeholder="Your company name"
                    />
                  </div>
                  
                  {/* Sector */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Sector</Label>
                    <p className="text-[10px] text-muted-foreground mb-2">This determines which knowledge base the AI agents use</p>
                    <SectorPicker 
                      value={companyForm.sector} 
                      onChange={(sector) => setCompanyForm(prev => ({ ...prev, sector }))} 
                    />
                  </div>
                  
                  {/* Stage & Funding */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Stage</Label>
                      <Select 
                        value={companyForm.stage || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, stage: v as OnboardingData['stage'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
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
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Funding Stage</Label>
                      <Select 
                        value={companyForm.fundingStage || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, fundingStage: v as OnboardingData['fundingStage'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select funding" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bootstrapped">Bootstrapped</SelectItem>
                          <SelectItem value="pre_seed">Pre-seed</SelectItem>
                          <SelectItem value="seed">Seed</SelectItem>
                          <SelectItem value="series_a">Series A</SelectItem>
                          <SelectItem value="series_b">Series B</SelectItem>
                          <SelectItem value="series_c_plus">Series C+</SelectItem>
                          <SelectItem value="profitable">Profitable</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  
                  {/* Business Model & Team Size */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Business Model</Label>
                      <Select 
                        value={companyForm.businessModel || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, businessModel: v as OnboardingData['businessModel'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="b2b">B2B</SelectItem>
                          <SelectItem value="b2c">B2C</SelectItem>
                          <SelectItem value="b2b2c">B2B2C</SelectItem>
                          <SelectItem value="marketplace">Marketplace</SelectItem>
                          <SelectItem value="d2c">D2C</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                          <SelectItem value="platform">Platform</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Team Size</Label>
                      <Select 
                        value={companyForm.teamSize || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, teamSize: v as OnboardingData['teamSize'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select size" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-5">1-5</SelectItem>
                          <SelectItem value="6-20">6-20</SelectItem>
                          <SelectItem value="21-50">21-50</SelectItem>
                          <SelectItem value="51-200">51-200</SelectItem>
                          <SelectItem value="200+">200+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Location */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Country</Label>
                      <Input
                        value={companyForm.country || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, country: e.target.value }))}
                        placeholder="United States"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">City</Label>
                      <Input
                        value={companyForm.city || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="San Francisco"
                      />
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Description *</Label>
                    <Textarea
                      value={companyForm.description || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Brief description of your company (min 20 characters)..."
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  {/* Tagline & Website */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Tagline</Label>
                      <Input
                        value={companyForm.tagline || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, tagline: e.target.value }))}
                        placeholder="One-liner pitch"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Website</Label>
                      <Input
                        value={companyForm.website || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>
                  
                  {/* Revenue Model & Revenue Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Revenue Model</Label>
                      <Select 
                        value={companyForm.revenueModel || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, revenueModel: v as OnboardingData['revenueModel'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select model" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="subscription">Subscription</SelectItem>
                          <SelectItem value="transaction_fee">Transaction Fee</SelectItem>
                          <SelectItem value="freemium">Freemium</SelectItem>
                          <SelectItem value="usage_based">Usage Based</SelectItem>
                          <SelectItem value="licensing">Licensing</SelectItem>
                          <SelectItem value="advertising">Advertising</SelectItem>
                          <SelectItem value="commission">Commission</SelectItem>
                          <SelectItem value="one_time">One Time</SelectItem>
                          <SelectItem value="hybrid">Hybrid</SelectItem>
                          <SelectItem value="not_yet">Not Yet</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Revenue Status</Label>
                      <Select 
                        value={companyForm.isRevenue || ''} 
                        onValueChange={(v) => setCompanyForm(prev => ({ ...prev, isRevenue: v as OnboardingData['isRevenue'] }))}
                      >
                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="yes">Yes, generating revenue</SelectItem>
                          <SelectItem value="no">No revenue yet</SelectItem>
                          <SelectItem value="pre_revenue">Pre-revenue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Financials */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Total Raised (USD)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={companyForm.totalRaised || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, totalRaised: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="500000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Monthly Revenue (USD)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={companyForm.monthlyRevenue || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, monthlyRevenue: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="10000"
                      />
                    </div>
                  </div>
                  
                  {/* Founded Year & Co-founders */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Founded Year</Label>
                      <Input
                        type="number"
                        min={1990}
                        max={2100}
                        value={companyForm.foundedYear || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, foundedYear: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="2024"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs sm:text-sm">Co-founders</Label>
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        value={companyForm.cofounderCount || ''}
                        onChange={(e) => setCompanyForm(prev => ({ ...prev, cofounderCount: e.target.value ? Number(e.target.value) : undefined }))}
                        placeholder="2"
                      />
                    </div>
                  </div>
                  
                  {/* Operating Regions */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Operating Regions</Label>
                    <Input
                      value={companyForm.operatingRegions || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, operatingRegions: e.target.value }))}
                      placeholder="North America, Europe, Asia"
                    />
                  </div>
                  
                  {/* Target Market */}
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Target Customer</Label>
                    <Textarea
                      value={companyForm.targetCustomer || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, targetCustomer: e.target.value }))}
                      placeholder="Mid-market e-commerce companies with $1M-$50M ARR"
                      className="min-h-[60px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Problem You Solve</Label>
                    <Textarea
                      value={companyForm.problemSolved || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, problemSolved: e.target.value }))}
                      placeholder="What problem does your product solve?"
                      className="min-h-[60px]"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs sm:text-sm">Competitive Advantage</Label>
                    <Textarea
                      value={companyForm.competitiveAdvantage || ''}
                      onChange={(e) => setCompanyForm(prev => ({ ...prev, competitiveAdvantage: e.target.value }))}
                      placeholder="What makes you different from competitors?"
                      className="min-h-[60px]"
                    />
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Button onClick={handleSaveCompany} disabled={isSavingCompany} className="gap-1.5">
                      <FloppyDisk weight="bold" className="w-4 h-4" />
                      {isSavingCompany ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="ghost" onClick={handleCancelCompanyEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
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
                      {SECTOR_LABELS[user.startup.sector as Sector] || user.startup.sector}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-[10px] sm:text-xs text-muted-foreground">Stage</Label>
                    <p className="text-xs sm:text-sm font-medium capitalize">{user.startup.stage}</p>
                  </div>
                  {user.startup.fundingStage && (
                    <div>
                      <Label className="text-[10px] sm:text-xs text-muted-foreground">Funding Stage</Label>
                      <p className="text-xs sm:text-sm font-medium capitalize">{user.startup.fundingStage.replace('_', ' ')}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}


      {/* Data Privacy */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
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
                      <AlertDialog open={documentToDelete === doc.id} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                            onClick={() => setDocumentToDelete(doc.id)}
                          >
                            <Trash weight="regular" className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete &quot;{doc.originalName}&quot;? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
              <AlertDialog open={showPurgeDialog} onOpenChange={setShowPurgeDialog}>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={isPurging || documents.length === 0} className="h-8 text-xs">
                    {isPurging ? 'Deleting...' : 'Purge All'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete All Documents</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {documents.length} encrypted documents and their data. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handlePurgeAll}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isPurging ? 'Deleting...' : 'Delete All'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}