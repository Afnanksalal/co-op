'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { api } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import type { Lead, CampaignMode, LeadType } from '@/lib/api/types';
import { PERSON_VARIABLES, COMPANY_VARIABLES, STARTUP_VARIABLES } from '@/lib/api/types';

// SVG Icons
const ArrowLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256">
    <path d="M224,128a8,8,0,0,1-8,8H59.31l58.35,58.34a8,8,0,0,1-11.32,11.32l-72-72a8,8,0,0,1,0-11.32l72-72a8,8,0,0,1,11.32,11.32L59.31,120H216A8,8,0,0,1,224,128Z"/>
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z"/>
  </svg>
);

const BuildingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M232,224H208V32h8a8,8,0,0,0,0-16H40a8,8,0,0,0,0,16h8V224H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16ZM64,32H192V224H160V184a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v40H64Zm80,192H112V192h32Z"/>
  </svg>
);

const SparkleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M208,144a15.78,15.78,0,0,1-10.42,14.94l-51.65,19-19,51.61a15.92,15.92,0,0,1-29.88,0L78,178l-51.62-19a15.92,15.92,0,0,1,0-29.88l51.65-19,19-51.61a15.92,15.92,0,0,1,29.88,0l19,51.65,51.61,19A15.78,15.78,0,0,1,208,144Z"/>
  </svg>
);

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256">
    <path d="M247.31,124.76c-.35-.79-8.82-19.58-27.65-38.41C194.57,61.26,162.88,48,128,48S61.43,61.26,36.34,86.35C17.51,105.18,9,124,8.69,124.76a8,8,0,0,0,0,6.5c.35.79,8.82,19.57,27.65,38.4C61.43,194.74,93.12,208,128,208s66.57-13.26,91.66-38.34c18.83-18.83,27.3-37.61,27.65-38.4A8,8,0,0,0,247.31,124.76ZM128,192c-30.78,0-57.67-11.19-79.93-33.25A133.47,133.47,0,0,1,25,128,133.33,133.33,0,0,1,48.07,97.25C70.33,75.19,97.22,64,128,64s57.67,11.19,79.93,33.25A133.46,133.46,0,0,1,231.05,128C223.84,141.46,192.43,192,128,192Zm0-112a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Z"/>
  </svg>
);

export default function NewCampaignPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [step, setStep] = useState(1);
  const [previewLead, setPreviewLead] = useState<Lead | null>(null);
  const [previewContent, setPreviewContent] = useState<{ subject: string; body: string } | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const subjectRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: '',
    mode: 'single_template' as CampaignMode,
    targetLeadType: 'person' as LeadType,
    // Single template mode
    subjectTemplate: '',
    bodyTemplate: '',
    // AI personalized mode
    campaignGoal: '',
    tone: 'professional' as 'professional' | 'casual' | 'friendly' | 'bold',
    callToAction: '',
    // Settings
    trackOpens: true,
    trackClicks: true,
    includeUnsubscribeLink: true,
  });

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const data = await api.getLeads();
        const availableLeads = (data || []).filter(l => l.status !== 'unsubscribed');
        setLeads(availableLeads);
      } catch {
        toast.error('Failed to load leads');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLeads();
  }, []);

  const filteredLeads = leads.filter(l => l.leadType === form.targetLeadType);
  const availableVariables = form.targetLeadType === 'person' 
    ? [...PERSON_VARIABLES, ...STARTUP_VARIABLES]
    : [...COMPANY_VARIABLES, ...STARTUP_VARIABLES];

  const insertVariable = (variable: string, target: 'subject' | 'body') => {
    if (target === 'subject' && subjectRef.current) {
      const input = subjectRef.current;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      const newValue = input.value.slice(0, start) + variable + input.value.slice(end);
      setForm(prev => ({ ...prev, subjectTemplate: newValue }));
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else if (target === 'body' && bodyRef.current) {
      const textarea = bodyRef.current;
      const start = textarea.selectionStart ?? textarea.value.length;
      const end = textarea.selectionEnd ?? textarea.value.length;
      const newValue = textarea.value.slice(0, start) + variable + textarea.value.slice(end);
      setForm(prev => ({ ...prev, bodyTemplate: newValue }));
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    }
  };

  const handlePreview = async (lead: Lead) => {
    if (form.mode === 'single_template' && (!form.subjectTemplate || !form.bodyTemplate)) {
      toast.error('Please fill in the email template first');
      return;
    }
    if (form.mode === 'ai_personalized' && !form.campaignGoal) {
      toast.error('Please describe your campaign goal first');
      return;
    }

    setPreviewLead(lead);
    setIsPreviewing(true);

    // For single_template, do client-side preview
    if (form.mode === 'single_template') {
      const vars: Record<string, string> = {
        name: lead.name ?? '',
        email: lead.email ?? '',
        platform: lead.platform ?? '',
        handle: lead.handle ?? '',
        followers: lead.followers?.toString() ?? '',
        niche: lead.niche ?? '',
        location: lead.location ?? '',
        profileUrl: lead.profileUrl ?? '',
        companyName: lead.companyName ?? '',
        website: lead.website ?? '',
        industry: lead.industry ?? '',
        companySize: lead.companySize ?? '',
        // Startup vars would come from backend, use placeholders
        myCompany: '[Your Company]',
        myProduct: '[Your Product]',
        myIndustry: '[Your Industry]',
        myFounder: '[Your Name]',
        myWebsite: '[Your Website]',
      };

      let subject = form.subjectTemplate;
      let body = form.bodyTemplate;
      for (const [key, value] of Object.entries(vars)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        subject = subject.replace(regex, value || `[${key}]`);
        body = body.replace(regex, value || `[${key}]`);
      }

      setPreviewContent({ subject, body });
      setIsPreviewing(false);
    } else {
      // For AI mode, we'd need to call the backend preview endpoint
      // For now, show a placeholder
      setPreviewContent({
        subject: `[AI will generate personalized subject for ${lead.displayName}]`,
        body: `[AI will generate a unique, personalized email for ${lead.displayName} based on your campaign goal: "${form.campaignGoal}"]`,
      });
      setIsPreviewing(false);
    }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter a campaign name');
      return;
    }
    if (form.mode === 'single_template' && (!form.subjectTemplate.trim() || !form.bodyTemplate.trim())) {
      toast.error('Please fill in the email template');
      return;
    }
    if (form.mode === 'ai_personalized' && !form.campaignGoal.trim()) {
      toast.error('Please describe your campaign goal');
      return;
    }
    if (selectedLeads.size === 0) {
      toast.error('Please select at least one lead');
      return;
    }

    setIsCreating(true);
    try {
      const campaign = await api.createCampaign({
        name: form.name,
        mode: form.mode,
        targetLeadType: form.targetLeadType,
        subjectTemplate: form.mode === 'single_template' ? form.subjectTemplate : undefined,
        bodyTemplate: form.mode === 'single_template' ? form.bodyTemplate : undefined,
        campaignGoal: form.mode === 'ai_personalized' ? form.campaignGoal : undefined,
        tone: form.mode === 'ai_personalized' ? form.tone : undefined,
        callToAction: form.mode === 'ai_personalized' ? form.callToAction : undefined,
        trackOpens: form.trackOpens,
        trackClicks: form.trackClicks,
        includeUnsubscribeLink: form.includeUnsubscribeLink,
      });

      await api.generateCampaignEmails(campaign.id, Array.from(selectedLeads));
      toast.success('Campaign created');
      router.push(`/tools/outreach/campaigns/${campaign.id}`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create campaign';
      toast.error(message);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(leadId)) {
        next.delete(leadId);
      } else {
        next.add(leadId);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)));
    }
  };

  const formatFollowers = (count: number | null) => {
    if (!count) return '';
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeftIcon />
        </Button>
        <div>
          <h1 className="font-serif text-2xl font-medium tracking-tight">Create Campaign</h1>
          <p className="text-sm text-muted-foreground">Step {step} of 3</p>
        </div>
      </motion.div>

      {/* Step 1: Campaign Setup */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Campaign Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Name *</Label>
                <Input
                  placeholder="e.g., Product Launch Outreach"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              {/* Target Lead Type */}
              <div className="space-y-2">
                <Label>Target Audience</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={form.targetLeadType === 'person' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => {
                      setForm(prev => ({ ...prev, targetLeadType: 'person' }));
                      setSelectedLeads(new Set());
                    }}
                  >
                    <UserIcon />
                    People / Influencers
                  </Button>
                  <Button
                    type="button"
                    variant={form.targetLeadType === 'company' ? 'default' : 'outline'}
                    className="flex-1 gap-2"
                    onClick={() => {
                      setForm(prev => ({ ...prev, targetLeadType: 'company' }));
                      setSelectedLeads(new Set());
                    }}
                  >
                    <BuildingIcon />
                    Companies
                  </Button>
                </div>
              </div>

              {/* Campaign Mode */}
              <div className="space-y-2">
                <Label>Email Generation Mode</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all p-4",
                      form.mode === 'single_template' 
                        ? "border-primary ring-1 ring-primary" 
                        : "border-border/40 hover:border-primary/30"
                    )}
                    onClick={() => setForm(prev => ({ ...prev, mode: 'single_template' }))}
                  >
                    <h4 className="font-medium mb-1">Single Template</h4>
                    <p className="text-xs text-muted-foreground">
                      Write one template with variables like {'{{name}}'}, send to all leads
                    </p>
                  </Card>
                  <Card 
                    className={cn(
                      "cursor-pointer transition-all p-4",
                      form.mode === 'ai_personalized' 
                        ? "border-primary ring-1 ring-primary" 
                        : "border-border/40 hover:border-primary/30"
                    )}
                    onClick={() => setForm(prev => ({ ...prev, mode: 'ai_personalized' }))}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <SparkleIcon />
                      <h4 className="font-medium">AI Personalized</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI writes unique emails for each lead based on their profile
                    </p>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Template Editor or AI Config */}
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">
                {form.mode === 'single_template' ? 'Email Template' : 'AI Configuration'}
              </CardTitle>
              <CardDescription>
                {form.mode === 'single_template' 
                  ? 'Use variables to personalize your email. Click a variable to insert it.'
                  : 'Tell the AI what you want to achieve and it will write unique emails for each lead.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {form.mode === 'single_template' ? (
                <>
                  {/* Variables */}
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Available Variables (click to insert)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {availableVariables.map(v => (
                        <Badge
                          key={v}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                          onClick={() => insertVariable(v, 'body')}
                        >
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Subject Line *</Label>
                    <Input
                      ref={subjectRef}
                      placeholder={form.targetLeadType === 'person' 
                        ? "e.g., Hey {{name}}, loved your content on {{platform}}"
                        : "e.g., Partnership opportunity for {{companyName}}"}
                      value={form.subjectTemplate}
                      onChange={(e) => setForm(prev => ({ ...prev, subjectTemplate: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body *</Label>
                    <textarea
                      ref={bodyRef}
                      className="w-full min-h-[200px] px-3 py-2 text-sm rounded-md border border-input bg-background font-mono"
                      placeholder={form.targetLeadType === 'person'
                        ? `Hi {{name}},

I've been following your content on {{platform}} and really enjoyed your work in the {{niche}} space.

I'm {{myFounder}} from {{myCompany}}. We're building {{myProduct}} and I think there could be a great fit for collaboration.

Would you be open to a quick chat?

Best,
{{myFounder}}`
                        : `Hi there,

I came across {{companyName}} and was impressed by what you're doing in {{industry}}.

I'm {{myFounder}} from {{myCompany}}. We help companies like yours with {{myProduct}}.

Would love to explore if there's a fit. Open to a quick call?

Best,
{{myFounder}}`}
                      value={form.bodyTemplate}
                      onChange={(e) => setForm(prev => ({ ...prev, bodyTemplate: e.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>Campaign Goal *</Label>
                    <textarea
                      className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                      placeholder="Describe what you want to achieve. E.g., 'I want to partner with fitness influencers to promote our new workout app. We offer 20% commission on referrals.'"
                      value={form.campaignGoal}
                      onChange={(e) => setForm(prev => ({ ...prev, campaignGoal: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tone</Label>
                      <Select
                        value={form.tone}
                        onValueChange={(v) => setForm(prev => ({ ...prev, tone: v as typeof form.tone }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">Professional</SelectItem>
                          <SelectItem value="casual">Casual</SelectItem>
                          <SelectItem value="friendly">Friendly</SelectItem>
                          <SelectItem value="bold">Bold</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Call to Action</Label>
                      <Input
                        placeholder="e.g., Schedule a call, Reply to this email"
                        value={form.callToAction}
                        onChange={(e) => setForm(prev => ({ ...prev, callToAction: e.target.value }))}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Settings */}
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.trackOpens}
                      onCheckedChange={(v) => setForm(prev => ({ ...prev, trackOpens: v }))}
                    />
                    <Label className="text-sm">Track opens</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.trackClicks}
                      onCheckedChange={(v) => setForm(prev => ({ ...prev, trackClicks: v }))}
                    />
                    <Label className="text-sm">Track clicks</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={form.includeUnsubscribeLink}
                      onCheckedChange={(v) => setForm(prev => ({ ...prev, includeUnsubscribeLink: v }))}
                    />
                    <Label className="text-sm">Unsubscribe link</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={() => setStep(2)}
              disabled={
                !form.name.trim() || 
                (form.mode === 'single_template' && (!form.subjectTemplate.trim() || !form.bodyTemplate.trim())) ||
                (form.mode === 'ai_personalized' && !form.campaignGoal.trim())
              }
            >
              Next: Select Leads
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 2: Select Leads */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    Select {form.targetLeadType === 'person' ? 'People' : 'Companies'}
                  </CardTitle>
                  <CardDescription>
                    {filteredLeads.length} {form.targetLeadType === 'person' ? 'people' : 'companies'} available
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedLeads.size} selected</Badge>
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    {selectedLeads.size === filteredLeads.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No {form.targetLeadType === 'person' ? 'people' : 'companies'} found. 
                    Discover some leads first.
                  </p>
                  <Button variant="outline" className="mt-4" onClick={() => router.push('/tools/outreach')}>
                    Go to Outreach
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2 pr-4">
                    {filteredLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className={cn(
                          "p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between",
                          selectedLeads.has(lead.id)
                            ? "border-primary bg-primary/5"
                            : "border-border/40 hover:border-primary/30"
                        )}
                        onClick={() => toggleLead(lead.id)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{lead.displayName}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {lead.leadType === 'person' ? (
                              <>
                                {lead.platform && <span className="capitalize">{lead.platform}</span>}
                                {lead.handle && <span> @{lead.handle.replace('@', '')}</span>}
                                {lead.followers && <span> • {formatFollowers(lead.followers)}</span>}
                              </>
                            ) : (
                              <>
                                {lead.industry}
                                {lead.companySize && <span> • {lead.companySize}</span>}
                              </>
                            )}
                            {lead.email && <span> • {lead.email}</span>}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreview(lead);
                            }}
                          >
                            <EyeIcon />
                            <span className="ml-1 text-xs">Preview</span>
                          </Button>
                          {lead.leadScore > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {lead.leadScore}%
                            </Badge>
                          )}
                          <div className={cn(
                            "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                            selectedLeads.has(lead.id)
                              ? "border-primary bg-primary text-white"
                              : "border-muted-foreground/30"
                          )}>
                            {selectedLeads.has(lead.id) && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 256 256">
                                <path d="M229.66,77.66l-128,128a8,8,0,0,1-11.32,0l-56-56a8,8,0,0,1,11.32-11.32L96,188.69,218.34,66.34a8,8,0,0,1,11.32,11.32Z"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Preview Panel */}
          {previewLead && previewContent && (
            <Card className="border-border/40 bg-muted/30">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">Preview for {previewLead.displayName}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => { setPreviewLead(null); setPreviewContent(null); }}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <p className="font-medium">{previewContent.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Body</p>
                  <div className="p-3 rounded bg-background text-sm whitespace-pre-wrap">
                    {previewContent.body}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => setStep(3)} disabled={selectedLeads.size === 0}>
              Next: Review
            </Button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Review & Create */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg">Review Campaign</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Campaign Name</p>
                  <p className="font-medium">{form.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipients</p>
                  <p className="font-medium">{selectedLeads.size} {form.targetLeadType === 'person' ? 'people' : 'companies'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mode</p>
                  <p className="font-medium">{form.mode === 'single_template' ? 'Single Template' : 'AI Personalized'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tracking</p>
                  <p className="font-medium">
                    {[form.trackOpens && 'Opens', form.trackClicks && 'Clicks'].filter(Boolean).join(', ') || 'None'}
                  </p>
                </div>
              </div>

              {form.mode === 'single_template' ? (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Subject</p>
                    <p className="font-medium">{form.subjectTemplate}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Template Preview</p>
                    <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap font-mono">
                      {form.bodyTemplate}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Campaign Goal</p>
                    <p>{form.campaignGoal}</p>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tone</p>
                      <p className="font-medium capitalize">{form.tone}</p>
                    </div>
                    {form.callToAction && (
                      <div>
                        <p className="text-sm text-muted-foreground">Call to Action</p>
                        <p className="font-medium">{form.callToAction}</p>
                      </div>
                    )}
                  </div>
                  <div className="p-3 rounded bg-primary/5 border border-primary/20">
                    <p className="text-sm text-primary">
                      <SparkleIcon /> AI will generate {selectedLeads.size} unique, personalized emails when you create this campaign.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Campaign'
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
