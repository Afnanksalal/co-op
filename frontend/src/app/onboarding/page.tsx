'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Buildings,
  User,
  MapPin,
  CurrencyDollar,
  Target,
  Check,
} from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import type { OnboardingData, Sector } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PremiumBackground } from '@/components/ui/background';

const steps = [
  { id: 'founder', title: 'About You', icon: User },
  { id: 'company', title: 'Your Business', icon: Buildings },
  { id: 'location', title: 'Location', icon: MapPin },
  { id: 'financials', title: 'Financials', icon: CurrencyDollar },
  { id: 'market', title: 'Market', icon: Target },
];

const sectors: { value: Sector; label: string; description: string }[] = [
  { value: 'fintech', label: 'Fintech', description: 'Financial technology, payments, banking' },
  { value: 'greentech', label: 'Greentech', description: 'Clean energy, sustainability, climate' },
  { value: 'healthtech', label: 'Healthtech', description: 'Healthcare, medical, wellness' },
  { value: 'saas', label: 'SaaS', description: 'Software as a Service, B2B/B2C tools' },
  { value: 'ecommerce', label: 'E-commerce', description: 'Online retail, marketplaces, D2C' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [formData, setFormData] = useState<Partial<OnboardingData>>({
    founderRole: 'founder',
    industry: 'saas',
    sector: 'saas',
    businessModel: 'b2b',
    stage: 'mvp',
    teamSize: '1-5',
    cofounderCount: 1,
    foundedYear: new Date().getFullYear(),
    isRevenue: 'pre_revenue',
  });

  // Check if user needs onboarding
  useEffect(() => {
    const checkOnboarding = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push('/login');
        return;
      }

      try {
        const status = await api.getOnboardingStatus();
        if (status.completed) {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
      }

      setIsChecking(false);
    };

    checkOnboarding();
  }, [router]);

  const updateField = <K extends keyof OnboardingData>(field: K, value: OnboardingData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Validate required fields before submitting
    if (!formData.founderName || formData.founderName.length < 2) {
      toast.error('Please enter your name (at least 2 characters)');
      setCurrentStep(0);
      return;
    }
    if (!formData.companyName || formData.companyName.length < 2) {
      toast.error('Please enter your company name (at least 2 characters)');
      setCurrentStep(1);
      return;
    }
    if (!formData.description || formData.description.length < 20) {
      toast.error('Please enter a description (at least 20 characters)');
      setCurrentStep(1);
      return;
    }
    if (!formData.country || formData.country.length < 2) {
      toast.error('Please enter your country');
      setCurrentStep(2);
      return;
    }

    // Clean the data - remove undefined/empty values for optional fields
    const cleanData: OnboardingData = {
      founderName: formData.founderName!,
      founderRole: formData.founderRole || 'founder',
      companyName: formData.companyName!,
      description: formData.description!,
      industry: formData.industry || 'saas',
      sector: formData.sector || 'saas',
      businessModel: formData.businessModel || 'b2b',
      stage: formData.stage || 'mvp',
      foundedYear: formData.foundedYear || new Date().getFullYear(),
      teamSize: formData.teamSize || '1-5',
      cofounderCount: formData.cofounderCount || 1,
      country: formData.country!,
      isRevenue: formData.isRevenue || 'pre_revenue',
      // Optional fields - only include if they have values
      ...(formData.tagline && { tagline: formData.tagline }),
      ...(formData.website && { website: formData.website }),
      ...(formData.revenueModel && { revenueModel: formData.revenueModel }),
      ...(formData.launchDate && { launchDate: formData.launchDate }),
      ...(formData.city && { city: formData.city }),
      ...(formData.operatingRegions && { operatingRegions: formData.operatingRegions }),
      ...(formData.fundingStage && { fundingStage: formData.fundingStage }),
      ...(formData.totalRaised && { totalRaised: formData.totalRaised }),
      ...(formData.monthlyRevenue && { monthlyRevenue: formData.monthlyRevenue }),
      ...(formData.targetCustomer && { targetCustomer: formData.targetCustomer }),
      ...(formData.problemSolved && { problemSolved: formData.problemSolved }),
      ...(formData.competitiveAdvantage && { competitiveAdvantage: formData.competitiveAdvantage }),
    };

    setIsLoading(true);
    try {
      await api.completeOnboarding(cleanData);
      toast.success('Welcome to Co-Op!');
      router.push('/dashboard');
    } catch (error) {
      console.error('Onboarding failed:', error);
      // Show detailed error in toast
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed: ${message}`);
    }
    setIsLoading(false);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Your Name *</Label>
              <Input
                placeholder="John Doe"
                value={formData.founderName || ''}
                onChange={(e) => updateField('founderName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Your Role *</Label>
              <Select
                value={formData.founderRole}
                onValueChange={(v) => updateField('founderRole', v as OnboardingData['founderRole'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
        );

      case 1:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Business Name *</Label>
              <Input
                placeholder="Acme Inc"
                value={formData.companyName || ''}
                onChange={(e) => updateField('companyName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                placeholder="AI-powered analytics for e-commerce"
                value={formData.tagline || ''}
                onChange={(e) => updateField('tagline', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                placeholder="Tell us about your business (min 20 characters)..."
                value={formData.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Sector *</Label>
              <p className="text-xs text-muted-foreground mb-3">
                This determines which documents our AI agents will search
              </p>
              <div className="space-y-2">
                {sectors.map((sector) => (
                  <button
                    key={sector.value}
                    type="button"
                    onClick={() => updateField('sector', sector.value)}
                    className={cn(
                      'w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all',
                      formData.sector === sector.value
                        ? 'border-primary/50 bg-primary/5'
                        : 'border-border/40 hover:border-border'
                    )}
                  >
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5',
                        formData.sector === sector.value
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      )}
                    >
                      {formData.sector === sector.value && (
                        <Check weight="bold" className="w-2.5 h-2.5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{sector.label}</p>
                      <p className="text-xs text-muted-foreground">{sector.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select value={formData.industry} onValueChange={(v) => updateField('industry', v as OnboardingData['industry'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="saas">SaaS</SelectItem>
                    <SelectItem value="fintech">Fintech</SelectItem>
                    <SelectItem value="healthtech">Healthtech</SelectItem>
                    <SelectItem value="edtech">Edtech</SelectItem>
                    <SelectItem value="ecommerce">E-commerce</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="ai_ml">AI/ML</SelectItem>
                    <SelectItem value="cybersecurity">Cybersecurity</SelectItem>
                    <SelectItem value="cleantech">Cleantech</SelectItem>
                    <SelectItem value="biotech">Biotech</SelectItem>
                    <SelectItem value="developer_tools">Developer Tools</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Business Model *</Label>
                <Select value={formData.businessModel} onValueChange={(v) => updateField('businessModel', v as OnboardingData['businessModel'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="b2b">B2B</SelectItem>
                    <SelectItem value="b2c">B2C</SelectItem>
                    <SelectItem value="b2b2c">B2B2C</SelectItem>
                    <SelectItem value="marketplace">Marketplace</SelectItem>
                    <SelectItem value="d2c">D2C</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                    <SelectItem value="platform">Platform</SelectItem>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Stage *</Label>
                <Select value={formData.stage} onValueChange={(v) => updateField('stage', v as OnboardingData['stage'])}>
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
              <div className="space-y-2">
                <Label>Founded Year *</Label>
                <Input
                  type="number"
                  min={1990}
                  max={2100}
                  value={formData.foundedYear || ''}
                  onChange={(e) => updateField('foundedYear', parseInt(e.target.value) || new Date().getFullYear())}
                />
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Country *</Label>
              <Input
                placeholder="United States"
                value={formData.country || ''}
                onChange={(e) => updateField('country', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                placeholder="San Francisco"
                value={formData.city || ''}
                onChange={(e) => updateField('city', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Team Size *</Label>
                <Select
                  value={formData.teamSize}
                  onValueChange={(v) => updateField('teamSize', v as OnboardingData['teamSize'])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-5">1-5</SelectItem>
                    <SelectItem value="6-20">6-20</SelectItem>
                    <SelectItem value="21-50">21-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="200+">200+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Co-founders *</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={formData.cofounderCount || ''}
                  onChange={(e) => updateField('cofounderCount', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Funding Stage</Label>
              <Select
                value={formData.fundingStage || ''}
                onValueChange={(v) => updateField('fundingStage', v as OnboardingData['fundingStage'])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select funding stage" />
                </SelectTrigger>
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
            <div className="space-y-2">
              <Label>Total Raised (USD)</Label>
              <Input
                type="number"
                min={0}
                placeholder="500000"
                value={formData.totalRaised || ''}
                onChange={(e) => updateField('totalRaised', parseInt(e.target.value) || undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Monthly Revenue (USD)</Label>
              <Input
                type="number"
                min={0}
                placeholder="10000"
                value={formData.monthlyRevenue || ''}
                onChange={(e) => updateField('monthlyRevenue', parseInt(e.target.value) || undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Revenue Status *</Label>
              <Select
                value={formData.isRevenue}
                onValueChange={(v) => updateField('isRevenue', v as OnboardingData['isRevenue'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes, generating revenue</SelectItem>
                  <SelectItem value="no">No revenue yet</SelectItem>
                  <SelectItem value="pre_revenue">Pre-revenue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Target Customer</Label>
              <Textarea
                placeholder="Mid-market e-commerce companies with $1M-$50M ARR"
                value={formData.targetCustomer || ''}
                onChange={(e) => updateField('targetCustomer', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Problem You Solve</Label>
              <Textarea
                placeholder="E-commerce businesses struggle to understand customer behavior..."
                value={formData.problemSolved || ''}
                onChange={(e) => updateField('problemSolved', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Competitive Advantage</Label>
              <Textarea
                placeholder="Proprietary AI model trained on 10M+ transactions"
                value={formData.competitiveAdvantage || ''}
                onChange={(e) => updateField('competitiveAdvantage', e.target.value)}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-8 relative">
      <PremiumBackground />

      <div className="w-full max-w-xl relative z-10">
        {/* Progress */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all',
                    index <= currentStep
                      ? 'bg-primary/10 text-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index < currentStep ? (
                    <Check weight="bold" className="w-4 sm:w-5 h-4 sm:h-5" />
                  ) : (
                    <step.icon weight={index === currentStep ? 'fill' : 'regular'} className="w-4 sm:w-5 h-4 sm:h-5" />
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn('w-4 sm:w-12 h-px mx-1 sm:mx-2', index < currentStep ? 'bg-primary/50' : 'bg-border')}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form */}
        <Card className="border-border/40">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-serif text-xl sm:text-2xl">{steps[currentStep].title}</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Step {currentStep + 1} of {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>

            <div className="flex justify-between mt-6 sm:mt-10 pt-4 sm:pt-6 border-t border-border/40">
              <Button variant="outline" onClick={prevStep} disabled={currentStep === 0} size="sm" className="h-9 sm:h-10">
                <ArrowLeft weight="bold" className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </Button>
              {currentStep === steps.length - 1 ? (
                <Button onClick={handleSubmit} disabled={isLoading} size="sm" className="h-9 sm:h-10">
                  {isLoading ? 'Completing...' : 'Complete'}
                  <Check weight="bold" className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={nextStep} size="sm" className="h-9 sm:h-10">
                  Continue
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
