'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from '@/components/motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Lead, Campaign, LeadStatus, LeadType } from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>
  </svg>
);

const SearchIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z"/>
  </svg>
);

const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z"/>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/>
  </svg>
);

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232,224H208V32h8a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16h8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM64,32H192V224H160V184a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v40H64Zm80,192H112V192h32ZM88,64a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,64Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,64ZM88,104a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,104Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,104ZM88,144a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H96A8,8,0,0,1,88,144Zm48,0a8,8,0,0,1,8-8h16a8,8,0,0,1,0,16H144A8,8,0,0,1,136,144Z"/>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z"/>
  </svg>
);

const EnvelopeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,48H32a8,8,0,0,0-8,8V192a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A8,8,0,0,0,224,48ZM203.43,64,128,133.15,52.57,64ZM216,192H40V74.19l82.59,75.71a8,8,0,0,0,10.82,0L216,74.19V192Z"/>
  </svg>
);

const GlobeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M128,24A104,104,0,1,0,232,128,104.11,104.11,0,0,0,128,24Zm88,104a87.62,87.62,0,0,1-6.4,32.94l-44.7-27.49a15.92,15.92,0,0,0-6.24-2.23l-22.82-3.08a16.11,16.11,0,0,0-16,7.86h-8.72l-3.8-7.86a15.91,15.91,0,0,0-11-8.67l-8-1.73L96.14,104h16.71a16.06,16.06,0,0,0,7.73-2l12.25-6.76a16.62,16.62,0,0,0,3-2.14l26.91-24.34A15.93,15.93,0,0,0,166,49.1l-.36-.65A88.11,88.11,0,0,1,216,128ZM40,128a87.53,87.53,0,0,1,8.54-37.8l11.34,30.27a16,16,0,0,0,11.62,10l21.43,4.61L96.74,143a16.09,16.09,0,0,0,14.4,9h1.48l-7.23,16.23a16,16,0,0,0,2.86,17.37l.14.14L128,205.94l-1.94,10A88.11,88.11,0,0,1,40,128Z"/>
  </svg>
);

const LinkIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M137.54,186.36a8,8,0,0,1,0,11.31l-9.94,10a56,56,0,0,1-79.22-79.27l24.12-24.12a56,56,0,0,1,76.81-2.28,8,8,0,1,1-10.64,12,40,40,0,0,0-54.85,1.63L59.7,139.72a40,40,0,0,0,56.58,56.58l9.94-9.94A8,8,0,0,1,137.54,186.36Zm70.08-138a56.06,56.06,0,0,0-79.22,0l-9.94,9.95a8,8,0,0,0,11.32,11.31l9.94-9.94a40,40,0,0,1,56.58,56.58L172.18,140.4a40,40,0,0,1-54.85,1.63,8,8,0,1,0-10.64,12,56,56,0,0,0,76.81-2.28l24.12-24.12A56.06,56.06,0,0,0,207.62,48.38Z"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z"/>
  </svg>
);

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208Z"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>
  </svg>
);

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  enriched: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  contacted: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  replied: 'bg-green-500/10 text-green-600 border-green-500/20',
  converted: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  unsubscribed: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

const PLATFORMS = ['youtube', 'twitter', 'linkedin', 'instagram', 'tiktok'];

export default function OutreachPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('leads');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [leadTypeFilter, setLeadTypeFilter] = useState<LeadType | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [aiInsights, setAiInsights] = useState<{ type: 'tip' | 'warning' | 'action'; message: string }[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Check for mobile viewport - only after mount to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Discovery form
  const [discoverForm, setDiscoverForm] = useState({
    leadType: 'person' as LeadType,
    targetNiche: '',
    targetPlatforms: [] as string[],
    targetLocations: '',
    minFollowers: undefined as number | undefined,
    maxFollowers: undefined as number | undefined,
    targetCompanySizes: [] as string[],
    keywords: '',
    maxLeads: 10,
  });

  // Fetch LLM insights when data changes
  const fetchOutreachInsights = useCallback(async (leadsData: Lead[], campaignsData: Campaign[]) => {
    if (leadsData.length === 0) {
      setAiInsights([]);
      return;
    }
    
    setIsLoadingInsights(true);
    try {
      const response = await api.generateInsights('Customer Outreach', {
        totalLeads: leadsData.length,
        totalCampaigns: campaignsData.length,
        newLeads: leadsData.filter(l => l.status === 'new').length,
        contactedLeads: leadsData.filter(l => l.status === 'contacted').length,
        repliedLeads: leadsData.filter(l => l.status === 'replied').length,
        convertedLeads: leadsData.filter(l => l.status === 'converted').length,
        personLeads: leadsData.filter(l => l.leadType === 'person').length,
        companyLeads: leadsData.filter(l => l.leadType === 'company').length,
        highReachInfluencers: leadsData.filter(l => l.leadType === 'person' && l.followers && l.followers > 100000).length,
        activeCampaigns: campaignsData.filter(c => c.status === 'sending').length,
      });
      
      if (response.insights && response.insights.length > 0) {
        setAiInsights(response.insights.map(i => ({
          type: i.type as 'tip' | 'warning' | 'action',
          message: i.message,
        })).slice(0, 4));
      } else {
        setAiInsights([]);
      }
    } catch (error) {
      console.error('Failed to fetch outreach insights:', error);
      setAiInsights([]);
    } finally {
      setIsLoadingInsights(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const [leadsData, campaignsData] = await Promise.all([
        api.getLeads(),
        api.getCampaigns(),
      ]);
      setLeads(leadsData || []);
      setCampaigns(campaignsData || []);
      
      // Fetch LLM insights after data loads
      void fetchOutreachInsights(leadsData || [], campaignsData || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchOutreachInsights]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDiscover = async () => {
    // Validation
    if (!discoverForm.targetNiche?.trim() && !discoverForm.keywords?.trim()) {
      toast.error('Please enter a target niche or keywords');
      return;
    }
    
    if (discoverForm.minFollowers && discoverForm.maxFollowers && discoverForm.minFollowers > discoverForm.maxFollowers) {
      toast.error('Minimum followers cannot be greater than maximum');
      return;
    }
    
    if (discoverForm.maxLeads < 1 || discoverForm.maxLeads > 50) {
      toast.error('Max leads must be between 1 and 50');
      return;
    }

    setIsDiscovering(true);
    try {
      const discovered = await api.discoverLeads({
        leadType: discoverForm.leadType,
        targetNiche: discoverForm.targetNiche || undefined,
        targetPlatforms: discoverForm.targetPlatforms.length > 0 ? discoverForm.targetPlatforms : undefined,
        targetLocations: discoverForm.targetLocations ? discoverForm.targetLocations.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        minFollowers: discoverForm.minFollowers,
        maxFollowers: discoverForm.maxFollowers,
        targetCompanySizes: discoverForm.targetCompanySizes.length > 0 ? discoverForm.targetCompanySizes : undefined,
        keywords: discoverForm.keywords || undefined,
        maxLeads: discoverForm.maxLeads,
      });
      setLeads(prev => [...discovered, ...prev]);
      setShowDiscoverDialog(false);
      toast.success(`Discovered ${discovered.length} ${discoverForm.leadType === 'person' ? 'people' : 'companies'}`);
      setDiscoverForm({
        leadType: 'person', targetNiche: '', targetPlatforms: [], targetLocations: '',
        minFollowers: undefined, maxFollowers: undefined, targetCompanySizes: [], keywords: '', maxLeads: 10,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Failed to discover leads');
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    try {
      await api.deleteLead(leadId);
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setSelectedLeads(prev => { const next = new Set(prev); next.delete(leadId); return next; });
      if (selectedLead?.id === leadId) setSelectedLead(null);
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const handleLeadClick = (lead: Lead) => {
    setSelectedLead(lead);
  };

  const toggleLeadSelection = (e: React.MouseEvent, leadId: string) => {
    e.stopPropagation();
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  const togglePlatform = (platform: string) => {
    setDiscoverForm(prev => ({
      ...prev,
      targetPlatforms: prev.targetPlatforms.includes(platform)
        ? prev.targetPlatforms.filter(p => p !== platform)
        : [...prev.targetPlatforms, platform],
    }));
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatFollowers = (count: number | null) => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const filteredLeads = leadTypeFilter === 'all' ? leads : leads.filter(l => l.leadType === leadTypeFilter);

  // Lead Detail Panel Component
  const LeadDetailContent = ({ lead }: { lead: Lead }) => (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center shrink-0",
          lead.leadType === 'person' ? "bg-blue-500/10" : "bg-purple-500/10"
        )}>
          {lead.leadType === 'person' ? (
            <UserIcon />
          ) : (
            <BuildingIcon />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base sm:text-lg truncate">{lead.displayName}</h3>
          <div className="flex items-center gap-2 flex-wrap mt-1">
            <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[lead.status])}>
              {lead.status}
            </Badge>
            {lead.leadScore > 0 && (
              <Badge variant="secondary" className="text-xs">{lead.leadScore}% fit</Badge>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Contact Info */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</h4>
        {lead.email && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 min-w-0">
              <EnvelopeIcon />
              <span className="text-sm truncate">{lead.email}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyToClipboard(lead.email!, 'email')} aria-label="Copy email">
              {copiedField === 'email' ? <CheckIcon /> : <CopyIcon />}
            </Button>
          </div>
        )}
        {lead.profileUrl && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 min-w-0">
              <LinkIcon />
              <span className="text-sm truncate">{lead.profileUrl}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(lead.profileUrl!, '_blank')} aria-label="Open profile">
              <GlobeIcon />
            </Button>
          </div>
        )}
        {lead.website && (
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2 min-w-0">
              <GlobeIcon />
              <span className="text-sm truncate">{lead.website}</span>
            </div>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => window.open(lead.website!, '_blank')} aria-label="Open website">
              <LinkIcon />
            </Button>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</h4>
        <div className="grid grid-cols-2 gap-3">
          {lead.leadType === 'person' ? (
            <>
              {lead.platform && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Platform</p>
                  <p className="text-sm font-medium capitalize">{lead.platform}</p>
                </div>
              )}
              {lead.handle && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Handle</p>
                  <p className="text-sm font-medium">@{lead.handle.replace('@', '')}</p>
                </div>
              )}
              {lead.followers && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Followers</p>
                  <p className="text-sm font-medium">{formatFollowers(lead.followers)}</p>
                </div>
              )}
              {lead.niche && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Niche</p>
                  <p className="text-sm font-medium">{lead.niche}</p>
                </div>
              )}
            </>
          ) : (
            <>
              {lead.industry && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Industry</p>
                  <p className="text-sm font-medium">{lead.industry}</p>
                </div>
              )}
              {lead.companySize && (
                <div className="p-2.5 rounded-lg bg-muted/50">
                  <p className="text-[10px] text-muted-foreground uppercase">Company Size</p>
                  <p className="text-sm font-medium">{lead.companySize} employees</p>
                </div>
              )}
            </>
          )}
          {lead.location && (
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Location</p>
              <p className="text-sm font-medium">{lead.location}</p>
            </div>
          )}
          {lead.source && (
            <div className="p-2.5 rounded-lg bg-muted/50">
              <p className="text-[10px] text-muted-foreground uppercase">Source</p>
              <p className="text-sm font-medium">{lead.source}</p>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      {lead.description && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">About</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">{lead.description}</p>
        </div>
      )}

      {/* Tags */}
      {lead.tags && lead.tags.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tags</h4>
          <div className="flex flex-wrap gap-1.5">
            {lead.tags.map((tag, i) => (
              <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="pt-2 border-t border-border/50">
        <p className="text-xs text-muted-foreground">Added {formatDate(lead.createdAt)}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive">
              <TrashIcon />
              <span className="ml-1.5">Delete</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>Delete &quot;{lead.displayName}&quot;? This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteLead(lead.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-9 w-9 sm:h-10 sm:w-10 shrink-0" aria-label="Go back">
            <ArrowLeftIcon />
          </Button>
          <div className="min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl md:text-3xl font-medium tracking-tight">Customer Outreach</h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">Discover influencers & companies, run personalized campaigns</p>
          </div>
        </div>
      </motion.div>

      <Card className="border-border/40 bg-muted/30">
        <CardContent className="p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Pilot:</span> Up to 50 leads, 5 campaigns, 50 emails/day.
          </p>
        </CardContent>
      </Card>

      {/* AI Outreach Insights */}
      {!isLoading && leads.length > 0 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-primary" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
                <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144ZM152,48h16V64a8,8,0,0,0,16,0V48h16a8,8,0,0,0,0-16H184V16a8,8,0,0,0-16,0V32H152a8,8,0,0,0,0,16Zm88,32h-8V72a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16h8v8a8,8,0,0,0,16,0V96h8a8,8,0,0,0,0-16Z"/>
              </svg>
              <span className="text-sm font-medium text-primary">AI Outreach Insights</span>
            </div>
            {isLoadingInsights ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Generating insights...</span>
              </div>
            ) : aiInsights.length > 0 ? (
              <div className="space-y-2 text-sm text-muted-foreground">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className={cn(
                      'shrink-0 mt-1 w-1.5 h-1.5 rounded-full',
                      insight.type === 'warning' ? 'bg-orange-500' :
                      insight.type === 'action' ? 'bg-blue-500' : 'bg-green-500'
                    )} />
                    <span>{insight.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Discover leads to get personalized outreach insights</p>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="leads">Leads ({leads.length})</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns ({campaigns.length})</TabsTrigger>
        </TabsList>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                <Button variant={leadTypeFilter === 'all' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setLeadTypeFilter('all')}>All</Button>
                <Button variant={leadTypeFilter === 'person' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setLeadTypeFilter('person')}><UserIcon />People</Button>
                <Button variant={leadTypeFilter === 'company' ? 'secondary' : 'ghost'} size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setLeadTypeFilter('company')}><BuildingIcon />Companies</Button>
              </div>
              {selectedLeads.size > 0 && <Badge variant="secondary">{selectedLeads.size} selected</Badge>}
            </div>
            <Dialog open={showDiscoverDialog} onOpenChange={setShowDiscoverDialog}>
              <DialogTrigger asChild>
                <Button disabled={leads.length >= 50} size="sm"><SparkleIcon /><span className="ml-1.5">Discover</span></Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Discover Potential Leads</DialogTitle>
                  <DialogDescription>Find influencers or companies that match your target audience.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>What are you looking for?</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant={discoverForm.leadType === 'person' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setDiscoverForm(prev => ({ ...prev, leadType: 'person' }))}><UserIcon />People</Button>
                      <Button type="button" variant={discoverForm.leadType === 'company' ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => setDiscoverForm(prev => ({ ...prev, leadType: 'company' }))}><BuildingIcon />Companies</Button>
                    </div>
                  </div>
                  {discoverForm.leadType === 'person' && (
                    <>
                      <div className="space-y-2">
                        <Label>Platforms</Label>
                        <div className="flex flex-wrap gap-2">
                          {PLATFORMS.map(platform => (
                            <Badge key={platform} variant={discoverForm.targetPlatforms.includes(platform) ? 'default' : 'outline'} className="cursor-pointer capitalize" onClick={() => togglePlatform(platform)}>{platform}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Min Followers</Label>
                          <Input type="number" placeholder="e.g., 10000" value={discoverForm.minFollowers ?? ''} onChange={(e) => setDiscoverForm(prev => ({ ...prev, minFollowers: e.target.value ? parseInt(e.target.value) : undefined }))} />
                        </div>
                        <div className="space-y-2">
                          <Label>Max Followers</Label>
                          <Input type="number" placeholder="e.g., 1000000" value={discoverForm.maxFollowers ?? ''} onChange={(e) => setDiscoverForm(prev => ({ ...prev, maxFollowers: e.target.value ? parseInt(e.target.value) : undefined }))} />
                        </div>
                      </div>
                    </>
                  )}
                  {discoverForm.leadType === 'company' && (
                    <div className="space-y-2">
                      <Label>Company Sizes</Label>
                      <div className="flex flex-wrap gap-2">
                        {['1-10', '11-50', '51-200', '201-500', '500+'].map(size => (
                          <Badge key={size} variant={discoverForm.targetCompanySizes.includes(size) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setDiscoverForm(prev => ({ ...prev, targetCompanySizes: prev.targetCompanySizes.includes(size) ? prev.targetCompanySizes.filter(s => s !== size) : [...prev.targetCompanySizes, size] }))}>{size}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Niche / Industry</Label>
                      <Input placeholder={discoverForm.leadType === 'person' ? 'e.g., Tech' : 'e.g., SaaS'} value={discoverForm.targetNiche} onChange={(e) => setDiscoverForm(prev => ({ ...prev, targetNiche: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Results</Label>
                      <Select value={String(discoverForm.maxLeads)} onValueChange={(v) => setDiscoverForm(prev => ({ ...prev, maxLeads: parseInt(v) }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 leads</SelectItem>
                          <SelectItem value="10">10 leads</SelectItem>
                          <SelectItem value="15">15 leads</SelectItem>
                          <SelectItem value="25">25 leads</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Locations</Label>
                    <Input placeholder="e.g., United States, Europe" value={discoverForm.targetLocations} onChange={(e) => setDiscoverForm(prev => ({ ...prev, targetLocations: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Keywords</Label>
                    <Input placeholder="e.g., startup, entrepreneur" value={discoverForm.keywords} onChange={(e) => setDiscoverForm(prev => ({ ...prev, keywords: e.target.value }))} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowDiscoverDialog(false)}>Cancel</Button>
                  <Button onClick={handleDiscover} disabled={isDiscovering}>
                    {isDiscovering ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Discovering...</> : <><SearchIcon /><span className="ml-1.5">Discover</span></>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 bg-muted rounded animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-60 bg-muted rounded animate-pulse" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredLeads.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <UsersIcon />
                <h3 className="font-medium mb-2 mt-4">{leads.length === 0 ? 'No leads yet' : 'No matching leads'}</h3>
                <p className="text-sm text-muted-foreground mb-4">{leads.length === 0 ? 'Discover influencers or companies using AI-powered research.' : 'Try adjusting your filter.'}</p>
                {leads.length === 0 && <Button onClick={() => setShowDiscoverDialog(true)}><SparkleIcon /><span className="ml-1.5">Discover Leads</span></Button>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-5 gap-4">
              {/* Lead List */}
              <div className="lg:col-span-3">
                <ScrollArea className="h-[400px] sm:h-[500px] lg:h-[600px]">
                  <div className="space-y-2 pr-2">
                    <AnimatePresence>
                      {filteredLeads.map((lead, index) => (
                        <motion.div key={lead.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.02 }}>
                          <Card 
                            className={cn(
                              "border-border/40 cursor-pointer transition-all hover:border-primary/30 hover:bg-muted/30",
                              selectedLead?.id === lead.id && "ring-1 ring-primary border-primary/50 bg-muted/50"
                            )}
                            onClick={() => handleLeadClick(lead)}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0",
                                  lead.leadType === 'person' ? "bg-blue-500/10" : "bg-purple-500/10"
                                )}>
                                  {lead.leadType === 'person' ? <UserIcon /> : <BuildingIcon />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-medium text-sm truncate">{lead.displayName}</h3>
                                    <Badge variant="outline" className={cn('text-[10px]', STATUS_COLORS[lead.status])}>{lead.status}</Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                    {lead.leadType === 'person' ? (
                                      <>
                                        {lead.platform && <span className="capitalize">{lead.platform}</span>}
                                        {lead.followers && <span>• {formatFollowers(lead.followers)}</span>}
                                      </>
                                    ) : (
                                      <>
                                        {lead.industry && <span>{lead.industry}</span>}
                                        {lead.companySize && <span>• {lead.companySize}</span>}
                                      </>
                                    )}
                                    {lead.location && <span>• {lead.location}</span>}
                                  </div>
                                </div>
                                <div 
                                  className="shrink-0 ml-auto"
                                  onClick={(e) => toggleLeadSelection(e, lead.id)}
                                >
                                  <div 
                                    className={cn(
                                      "w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
                                      selectedLeads.has(lead.id) 
                                        ? "bg-primary border-primary text-primary-foreground" 
                                        : "border-muted-foreground/40"
                                    )}
                                    role="checkbox"
                                    aria-checked={selectedLeads.has(lead.id)}
                                    aria-label={selectedLeads.has(lead.id) ? "Deselect lead" : "Select lead"}
                                  >
                                    {selectedLeads.has(lead.id) && <CheckIcon />}
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </div>

              {/* Lead Detail Panel - Desktop */}
              <div className="hidden lg:block lg:col-span-2">
                <Card className="border-border/40 sticky top-4">
                  <CardContent className="p-4">
                    {selectedLead ? (
                      <LeadDetailContent lead={selectedLead} />
                    ) : (
                      <div className="py-12 text-center">
                        <UserIcon />
                        <p className="text-sm text-muted-foreground mt-3">Select a lead to view details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Lead Detail Sheet - Mobile only */}
          {isMounted && (
            <Sheet open={!!selectedLead && isMobile} onOpenChange={(open) => !open && setSelectedLead(null)}>
              <SheetContent side="bottom" className="h-[85vh] rounded-t-xl">
                <SheetHeader className="flex-row items-center justify-between pb-4">
                  <div>
                    <SheetTitle className="text-left">Lead Details</SheetTitle>
                    <SheetDescription className="sr-only">View and manage lead information</SheetDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedLead(null)} aria-label="Close">
                    <XIcon />
                  </Button>
                </SheetHeader>
                <ScrollArea className="h-[calc(85vh-80px)]">
                  {selectedLead && <LeadDetailContent lead={selectedLead} />}
                </ScrollArea>
              </SheetContent>
            </Sheet>
          )}
        </TabsContent>

        {/* CAMPAIGNS TAB */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div />
            <Button disabled={campaigns.length >= 5 || leads.length === 0} size="sm" onClick={() => router.push('/tools/outreach/campaigns/new')}>
              <PlusIcon /><span className="ml-1.5">New Campaign</span>
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="border-border/40">
                  <CardContent className="p-4">
                    <div className="h-5 w-40 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-4 w-60 bg-muted rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : campaigns.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="p-8 text-center">
                <EnvelopeIcon />
                <h3 className="font-medium mb-2 mt-4">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mb-4">{leads.length === 0 ? 'Discover some leads first, then create a campaign.' : 'Create your first email campaign to reach out to leads.'}</p>
                <Button disabled={leads.length === 0} onClick={() => router.push('/tools/outreach/campaigns/new')}>
                  <PlusIcon /><span className="ml-1.5">New Campaign</span>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign, index) => (
                <motion.div key={campaign.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="border-border/40 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => router.push(`/tools/outreach/campaigns/${campaign.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium truncate">{campaign.name}</h3>
                            <Badge variant={campaign.status === 'sending' ? 'default' : campaign.status === 'completed' ? 'secondary' : 'outline'} className="text-xs">{campaign.status}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{campaign.mode === 'ai_personalized' ? 'AI Personalized' : 'Single Template'} · {campaign.targetLeadType === 'person' ? 'People' : 'Companies'}</p>
                          <p className="text-xs text-muted-foreground mt-1">Created {formatDate(campaign.createdAt)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}