'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from '@/components/motion';
import {
  ArrowRight,
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  Sparkle,
  CheckCircle,
  Code,
  Plugs,
  Lightning,
  Lightbulb,
  Rocket,
  Check,
  X,
  Sun,
  Moon,
  ShieldCheck,
  Brain,
  Export,
  Bell,
  MagnifyingGlass,
  Calculator,
  FileText,
  Envelope,
  DeviceMobile,
  NotePencil,
  Presentation,
  Table,
  AndroidLogo,
  Bug,
  Warning,
  Info,
} from '@phosphor-icons/react';
import { useUIStore } from '@/lib/store';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LandingBackground } from '@/components/ui/background';

const agents = [
  { icon: Scales, title: 'Legal', description: 'Corporate structure, contracts, compliance, IP protection' },
  { icon: ChartLineUp, title: 'Finance', description: 'Financial modeling, metrics, runway, unit economics' },
  { icon: UsersThree, title: 'Investor', description: 'VC matching, pitch optimization, term sheets' },
  { icon: Globe, title: 'Competitor', description: 'Market analysis, positioning, competitive intelligence' },
];

const features = [
  { icon: Brain, title: 'LLM Council', description: 'Multiple AI models cross-validate every response for accuracy' },
  { icon: Lightning, title: 'A2A Protocol', description: 'Agent-to-Agent communication for multi-perspective insights' },
  { icon: Presentation, title: 'Pitch Deck Analyzer', description: 'AI analysis with investor-specific recommendations and benchmarks' },
  { icon: Table, title: 'Cap Table Simulator', description: 'Model funding rounds, dilution scenarios, and AI ownership insights' },
  { icon: Bell, title: 'Competitor Alerts', description: 'Real-time monitoring with email notifications for market changes' },
  { icon: MagnifyingGlass, title: 'Investor Database', description: 'Search 20+ VCs by stage, sector, and region' },
  { icon: Envelope, title: 'Customer Outreach', description: 'AI-powered lead discovery and personalized email campaigns' },
  { icon: Calculator, title: 'Financial Calculators', description: 'Runway, burn rate, valuation tools with AI-powered insights' },
  { icon: FileText, title: 'Secure Documents', description: 'AES-256 encrypted document storage with RAG integration' },
  { icon: NotePencil, title: 'Notion Export', description: 'Export AI responses directly to your Notion workspace' },
  { icon: ShieldCheck, title: 'Enterprise Security', description: 'End-to-end encryption, rate limiting, audit logging' },
  { icon: Export, title: 'Export & Share', description: 'Export sessions to Markdown, JSON, or email summaries' },
  { icon: DeviceMobile, title: 'Mobile App', description: 'Native iOS and Android apps with full feature parity' },
  { icon: Code, title: 'Developer APIs', description: 'REST API, MCP Protocol, and webhook integrations' },
];

const pricingPlans = [
  {
    name: 'Pilot',
    price: 'Free',
    description: 'Try Co-Op during our pilot phase',
    features: [
      { text: '3 AI requests/month', included: true },
      { text: 'All 4 AI agents + A2A mode', included: true },
      { text: 'Pitch deck analyzer', included: true },
      { text: 'Cap table simulator with AI insights', included: true },
      { text: 'Competitor alerts (3 max)', included: true },
      { text: 'Investor database access', included: true },
      { text: 'Financial calculators with AI insights', included: true },
      { text: 'Secure document storage', included: true },
      { text: 'Outreach (5 leads/month)', included: true },
      { text: 'Priority support', included: false },
    ],
    cta: 'Start Free',
    href: '/login',
    popular: true,
    badge: 'Pilot Program',
  },
  {
    name: 'Self-Hosted',
    price: 'Free',
    description: 'Deploy on your own infrastructure',
    features: [
      { text: 'Unlimited requests', included: true },
      { text: 'All features unlocked', included: true },
      { text: 'Full source code', included: true },
      { text: 'Bring your own API keys', included: true },
      { text: 'Complete data control', included: true },
      { text: 'Unlimited outreach', included: true },
      { text: 'Community support', included: true },
      { text: 'Managed infrastructure', included: false },
    ],
    cta: 'View on GitHub',
    href: 'https://github.com/Afnanksalal/co-op',
    popular: false,
  },
  {
    name: 'Pro',
    price: 'Coming Soon',
    description: 'Fully managed experience',
    features: [
      { text: 'Unlimited requests', included: true },
      { text: 'All features unlocked', included: true },
      { text: 'Priority processing', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Unlimited outreach', included: true },
      { text: 'Priority support', included: true },
      { text: 'Custom integrations', included: true },
      { text: 'Team collaboration', included: true },
    ],
    cta: 'Join Waitlist',
    href: '/login',
    popular: false,
    disabled: true,
  },
];

// Detailed roadmap with changelog-style entries
const roadmapItems = [
  {
    version: '1.6.2',
    date: 'Jan 1, 2026',
    title: 'AI Insights Uniformity',
    status: 'released',
    highlights: [
      'Unified AIInsightsCard and InlineInsights components',
      'Standardized useInsights hook for all tools',
      'Backend insights module with proper DTOs and validation',
      'Consistent AI insights styling across all tools',
    ],
  },
  {
    version: '1.6.1',
    date: 'Dec 31, 2025',
    title: 'AI Insights & Polish',
    status: 'released',
    highlights: [
      'AI-powered insights for all financial calculators',
      'Cap table ownership analysis with recommendations',
      'Mobile sidebar animation fix for WebView context',
      'Sessions page spacing and UI improvements',
    ],
  },
  {
    version: '1.6.0',
    date: 'Dec 31, 2025',
    title: 'Pitch Deck & Cap Table',
    status: 'released',
    highlights: [
      'AI-powered pitch deck analyzer with investor-specific recommendations',
      'Cap table simulator with dilution modeling and Carta export',
      'Sector benchmarking against SaaS, Fintech, Healthtech, AI/ML',
      'Full mobile responsiveness for all new tools',
    ],
  },
  {
    version: '1.5.0',
    date: 'Dec 31, 2025',
    title: 'Production Hardening',
    status: 'released',
    highlights: [
      'LLM Council response validation (50% model threshold)',
      'RAG stale cache fallback for graceful degradation',
      'Auth guard LRU eviction to prevent memory leaks',
      'Distributed SWR locks to prevent thundering herd',
    ],
  },
  {
    version: '1.4.0',
    date: 'Dec 29, 2025',
    title: 'Admin & User Management',
    status: 'released',
    highlights: [
      'Full admin user CRUD with bulk operations',
      'Pilot usage tracking and reset capabilities',
      'User suspension with audit trail',
      'Admin statistics dashboard',
    ],
  },
  {
    version: '1.3.x',
    date: 'Dec 26-28, 2025',
    title: 'Security & Reliability',
    status: 'released',
    highlights: [
      'Token blacklisting for immediate session revocation',
      'Dead letter queue for failed tasks with auto-retry',
      'Request ID tracing for error correlation',
      'Circuit breaker metrics and cache warm-up',
    ],
  },
  {
    version: '1.2.0',
    date: 'Dec 16, 2025',
    title: 'Investor & Alerts',
    status: 'released',
    highlights: [
      'Investor database with 20+ real VCs seeded',
      'Competitor alerts with real-time monitoring',
      'Financial calculators (runway, burn, valuation)',
      'Legal jurisdiction selector (25+ jurisdictions)',
    ],
  },
  {
    version: '1.1.0',
    date: 'Dec 15, 2025',
    title: 'Multi-Agent & Streaming',
    status: 'released',
    highlights: [
      'Real-time progress updates with thinking steps',
      'Session message persistence for chat continuity',
      'Enhanced multi-agent synthesis prompts',
      'Admin metrics endpoint',
    ],
  },
  {
    version: '1.0.0',
    date: 'Dec 13, 2025',
    title: 'Initial Release',
    status: 'released',
    highlights: [
      'LLM Council with Groq, Google AI, HuggingFace',
      '4 AI agents: Legal, Finance, Investor, Competitor',
      'QStash serverless queue for async processing',
      'MCP Protocol and A2A support',
    ],
  },
  {
    version: '2.0.0',
    date: 'Q1 2026',
    title: 'Team Collaboration',
    status: 'upcoming',
    highlights: [
      'Multiple founders per startup',
      'Shared sessions and bookmarks',
      'Role-based access control',
      'Team activity feed',
    ],
  },
  {
    version: '2.1.0',
    date: 'Q2 2026',
    title: 'Integrations',
    status: 'upcoming',
    highlights: [
      'Slack notifications and commands',
      'CRM sync (HubSpot, Salesforce)',
      'Calendar follow-up scheduling',
      'Google Drive document sync',
    ],
  },
  {
    version: '3.0.0',
    date: 'Q3 2026',
    title: 'Enterprise',
    status: 'upcoming',
    highlights: [
      'SSO integration (SAML, OIDC)',
      'Custom AI model fine-tuning',
      'On-premise deployment option',
      'White-label customization',
    ],
  },
];

function RoadmapSection() {
  const [showAll, setShowAll] = useState(false);
  const displayedItems = showAll ? roadmapItems : roadmapItems.slice(0, 3);
  const hiddenCount = roadmapItems.length - 3;

  return (
    <section id="roadmap" className="max-w-6xl mx-auto px-6 py-24 border-t border-border/40">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-16"
      >
        <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">
          Building in Public
        </h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          We ship fast and iterate constantly. Here&apos;s our journey so far and what&apos;s coming next.
        </p>
      </motion.div>

      <div className="space-y-4">
        {displayedItems.map((item, index) => (
          <motion.div
            key={item.version}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className={`p-6 rounded-xl border ${
              item.status === 'released' 
                ? 'border-border/40 bg-card/50' 
                : 'border-primary/30 bg-primary/5'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <Badge 
                  variant={item.status === 'released' ? 'secondary' : 'default'}
                  className="font-mono"
                >
                  v{item.version}
                </Badge>
                <h3 className="font-serif text-lg font-medium">{item.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{item.date}</span>
                {item.status === 'released' ? (
                  <CheckCircle weight="fill" className="w-4 h-4 text-green-500" />
                ) : (
                  <Rocket weight="fill" className="w-4 h-4 text-primary" />
                )}
              </div>
            </div>
            <ul className="grid sm:grid-cols-2 gap-2">
              {item.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle 
                    weight={item.status === 'released' ? 'fill' : 'regular'} 
                    className={`w-4 h-4 mt-0.5 shrink-0 ${item.status === 'released' ? 'text-green-500' : 'text-muted-foreground'}`} 
                  />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>

      {!showAll && hiddenCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-8"
        >
          <Button 
            variant="outline" 
            size="lg"
            onClick={() => setShowAll(true)}
            className="gap-2"
          >
            Show {hiddenCount} More Updates
            <ArrowRight weight="bold" className="w-4 h-4" />
          </Button>
        </motion.div>
      )}

      {showAll && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center mt-8"
        >
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowAll(false)}
          >
            Show Less
          </Button>
        </motion.div>
      )}
    </section>
  );
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { theme, setTheme } = useUIStore();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
      setIsChecking(false);
      
      // Auto-redirect to dashboard if logged in (for mobile app)
      if (session && typeof window !== 'undefined') {
        // Check if we're in a mobile WebView context
        const isMobileApp = window.navigator.userAgent.includes('Mobile') || 
                           (window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView;
        if (isMobileApp) {
          window.location.href = '/dashboard';
        }
      }
    };
    checkSession();
  }, []);

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
    } else {
      setTheme('dark');
    }
  };

  return (
    <div className="min-h-screen bg-background relative">
      <LandingBackground />

      {/* Header - Static */}
      <header className="relative z-10 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg sm:text-xl font-semibold tracking-tight">
            Co-Op
          </Link>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#verticals" className="text-muted-foreground hover:text-foreground transition-colors">Solutions</a>
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
            <a href="#mobile-app" className="text-muted-foreground hover:text-foreground transition-colors">Mobile App</a>
            <a href="#developers" className="text-muted-foreground hover:text-foreground transition-colors">Developers</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Product Hunt Badge - Desktop */}
            <a
              href="https://www.producthunt.com/products/co-op-2?utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-co-op-2"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:block hover:opacity-90 transition-opacity"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1056612&theme=dark&t=1767192071870"
                alt="Co-Op on Product Hunt"
                width="180"
                height="40"
                className="dark:block hidden"
              />
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1056612&theme=light&t=1767192071870"
                alt="Co-Op on Product Hunt"
                width="180"
                height="40"
                className="dark:hidden block"
              />
            </a>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun weight="regular" className="w-5 h-5" />
              ) : (
                <Moon weight="regular" className="w-5 h-5" />
              )}
            </button>
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm">Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/login" className="hidden sm:block">
                  <Button variant="ghost" size="sm">Sign In</Button>
                </Link>
                <Link href="/login?mode=signup">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Pilot Disclaimer Banner */}
      <div className="relative z-10 bg-amber-500/10 border-b border-amber-500/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-center sm:text-left">
          <div className="flex items-center gap-2">
            <Warning weight="fill" className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-amber-700 dark:text-amber-400 font-medium">Pilot Program</span>
          </div>
          <span className="text-amber-600 dark:text-amber-400/80">
            Features may change and bugs may occur.{' '}
            <a 
              href="https://github.com/Afnanksalal/co-op/issues" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline hover:no-underline whitespace-nowrap"
            >
              Report issues
            </a>
          </span>
        </div>
      </div>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-8 pb-12 sm:py-24 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            {/* Product Hunt Badge - Mobile (shown prominently in hero) */}
            <a
              href="https://www.producthunt.com/products/co-op-2?utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-co-op-2"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block md:hidden mb-4 hover:opacity-90 transition-opacity"
            >
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1056612&theme=dark&t=1767192071870"
                alt="Co-Op on Product Hunt"
                width="250"
                height="54"
                className="dark:block hidden"
              />
              <img
                src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1056612&theme=light&t=1767192071870"
                alt="Co-Op on Product Hunt"
                width="250"
                height="54"
                className="dark:hidden block"
              />
            </a>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm mb-4 sm:mb-8">
              <Sparkle weight="fill" className="w-4 h-4" />
              AI-Powered Advisory Platform
            </div>

            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight mb-4 sm:mb-8 leading-[1.2]">
              Co-Op
            </h1>

            <p className="text-xl sm:text-2xl md:text-3xl text-muted-foreground font-serif mb-2 sm:mb-4">
              Cross the gaps. Build the future.
            </p>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-10 leading-relaxed">
              Your AI advisory board for legal, finance, investor relations, and competitive analysis.
              Multiple AI models cross-validate every response for accuracy you can trust.
            </p>

            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link href="/login?mode=signup">
                <Button size="lg" className="h-12 px-8">
                  Start Free <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </Link>
              <a href="#pricing">
                <Button variant="outline" size="lg" className="h-12 px-8">
                  View Pricing
                </Button>
              </a>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">Four Expert Agents</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each agent specializes in a critical area, powered by curated knowledge bases and real-time research.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl border border-border/40 bg-card/50 hover:border-border transition-colors"
              >
                <agent.icon weight="light" className="w-8 h-8 mb-4 text-foreground/70" />
                <h3 className="font-serif text-lg font-medium mb-2">{agent.title}</h3>
                <p className="text-sm text-muted-foreground">{agent.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Platform Features */}
        <section className="max-w-6xl mx-auto px-6 py-24 border-t border-border/40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">Platform Features</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you need to research, plan, and grow your startup.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-6 rounded-xl border border-border/40 bg-card/50 hover:border-border transition-colors"
              >
                <feature.icon weight="light" className="w-8 h-8 mb-4 text-foreground/70" />
                <h3 className="font-serif text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Two Verticals */}
        <section id="verticals" className="max-w-6xl mx-auto px-6 py-24 border-t border-border/40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">
              Built for Every Stage
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Whether you&apos;re scaling your next venture or just starting with an idea.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Existing Founders */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border/40 bg-card/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Rocket weight="fill" className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-medium">Existing Founders</h3>
                  <p className="text-sm text-muted-foreground">Scale faster with AI-powered insights</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                You&apos;ve built before. Skip the basics and get straight to strategic decisions with our full agent suite.
              </p>
              <ul className="space-y-3 mb-6">
                {['Advanced financial modeling & calculators', 'Complex legal structures & compliance', 'Investor database & relationship strategies', 'Competitor monitoring & market alerts'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle weight="fill" className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login?mode=signup">
                <Button className="w-full">Get Started <ArrowRight weight="bold" className="w-4 h-4" /></Button>
              </Link>
            </motion.div>

            {/* Idea Stage */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-8 rounded-2xl border border-border/40 bg-card/50"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lightbulb weight="fill" className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-serif text-xl font-medium">Idea Stage</h3>
                  <p className="text-sm text-muted-foreground">Validate and launch your concept</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Have an idea but haven&apos;t started? Our A2A protocol and outreach tools help you validate, research, and launch.
              </p>
              <ul className="space-y-3 mb-6">
                {['Multi-agent brainstorming (A2A)', 'Market opportunity analysis', 'Lead discovery & customer outreach', 'Secure document storage for research'].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle weight="fill" className="w-4 h-4 text-green-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login?mode=signup">
                <Button className="w-full">Get Started <ArrowRight weight="bold" className="w-4 h-4" /></Button>
              </Link>
            </motion.div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="max-w-6xl mx-auto px-6 py-24 border-t border-border/40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Self-host for free or let us handle everything. No hidden fees.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricingPlans.map((plan, index) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full border-border/40 ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                  <CardHeader>
                    {plan.badge && (
                      <Badge className="w-fit mb-2">{plan.badge}</Badge>
                    )}
                    <CardTitle className="font-serif text-xl">{plan.name}</CardTitle>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-serif font-medium">{plan.price}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {plan.features.map((feature) => (
                        <li key={feature.text} className="flex items-center gap-2 text-sm">
                          {feature.included ? (
                            <Check weight="bold" className="w-4 h-4 text-green-500" />
                          ) : (
                            <X weight="bold" className="w-4 h-4 text-muted-foreground/50" />
                          )}
                          <span className={feature.included ? '' : 'text-muted-foreground/50'}>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                    {plan.disabled ? (
                      <Button variant="outline" className="w-full" disabled>
                        {plan.cta}
                      </Button>
                    ) : (
                      <Link href={plan.href} className="block">
                        <Button variant={plan.popular ? 'default' : 'outline'} className="w-full">
                          {plan.cta}
                        </Button>
                      </Link>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Roadmap */}
        <RoadmapSection />

        {/* Developers */}
        <section id="developers" className="max-w-6xl mx-auto px-6 py-24 border-t border-border/40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">Built for Developers</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Integrate Co-Op&apos;s AI capabilities into your own platforms with our APIs and protocols.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="p-6 rounded-xl border border-border/40 bg-card/50"
            >
              <Code weight="light" className="w-8 h-8 mb-4 text-foreground/70" />
              <h3 className="font-serif text-lg font-medium mb-2">REST API</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Full REST API access to all agents. Run queries, manage sessions, and retrieve results.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded">POST /api/v1/agents/run</code>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="p-6 rounded-xl border border-border/40 bg-card/50"
            >
              <Plugs weight="light" className="w-8 h-8 mb-4 text-foreground/70" />
              <h3 className="font-serif text-lg font-medium mb-2">MCP Protocol</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use Co-Op agents in Claude Desktop, Cursor, Kiro, and any MCP-compatible client.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded">GET /api/v1/mcp-server/discover</code>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="p-6 rounded-xl border border-border/40 bg-card/50"
            >
              <Lightning weight="light" className="w-8 h-8 mb-4 text-foreground/70" />
              <h3 className="font-serif text-lg font-medium mb-2">A2A Protocol</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Agent-to-Agent communication for multi-agent queries with cross-critique consensus.
              </p>
              <code className="text-xs bg-muted px-2 py-1 rounded">multi_agent_query</code>
            </motion.div>
          </div>
        </section>

        {/* Mobile App Download */}
        <section id="mobile-app" className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 border-t border-border/40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-8 sm:mb-12"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl font-medium tracking-tight mb-3 sm:mb-4">
              Mobile App
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
              Take Co-Op with you. Access all features on the go with our mobile app.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-lg mx-auto"
          >
            <div className="p-6 sm:p-8 rounded-2xl border border-border/40 bg-card/50 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <AndroidLogo weight="fill" className="w-7 h-7 sm:w-8 sm:h-8 text-green-500" />
              </div>
              
              <h3 className="font-serif text-lg sm:text-xl font-medium mb-2">Android App</h3>
              <Badge variant="secondary" className="mb-4">Beta</Badge>
              
              <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-6">
                Download our Android app to access Co-Op from your mobile device. 
                Full feature parity with the web version.
              </p>

              <a
                href="https://github.com/Afnanksalal/co-op/releases/download/pilot-release/app-release.apk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Button size="lg" className="gap-2 h-11 sm:h-12 px-6 sm:px-8">
                  <AndroidLogo weight="bold" className="w-5 h-5" />
                  Download APK
                </Button>
              </a>

              {/* Beta Disclaimer */}
              <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2 sm:gap-3 text-left">
                  <Info weight="fill" className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 shrink-0 mt-0.5" />
                  <div className="text-xs sm:text-sm">
                    <p className="font-medium text-amber-700 dark:text-amber-400 mb-1">
                      Pilot Release Notice
                    </p>
                    <ul className="text-amber-600 dark:text-amber-500 space-y-0.5 sm:space-y-1 text-[11px] sm:text-xs">
                      <li>• Beta version, may contain bugs</li>
                      <li>• Android only (iOS coming soon)</li>
                      <li>• Enable &quot;Install from unknown sources&quot;</li>
                      <li>• Data may reset between updates</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Report Bugs */}
              <div className="mt-3 sm:mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <Bug weight="regular" className="w-4 h-4" />
                <span>Found a bug?</span>
                <a
                  href="https://github.com/Afnanksalal/co-op/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Report it on GitHub
                </a>
              </div>
            </div>
          </motion.div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center p-12 rounded-2xl border border-border/40 bg-card/50"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">
              Ready to cross the gaps?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join founders worldwide who use Co-Op to make better decisions faster.
            </p>
            <Link href="/login?mode=signup">
              <Button size="lg" className="h-12 px-8">
                Get Started Free <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif text-sm text-muted-foreground">© {new Date().getFullYear()} Co-Op</span>
          <div className="flex items-center gap-4 sm:gap-6 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <a href="https://github.com/Afnanksalal/co-op" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
