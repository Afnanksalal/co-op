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
  BookmarkSimple,
  Bell,
  MagnifyingGlass,
  Calculator,
  FileText,
  Envelope,
  DeviceMobile,
  NotePencil,
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
  { icon: Bell, title: 'Competitor Alerts', description: 'Real-time monitoring with email notifications for market changes' },
  { icon: MagnifyingGlass, title: 'Investor Database', description: 'Search 20+ VCs by stage, sector, and region' },
  { icon: Envelope, title: 'Customer Outreach', description: 'AI-powered lead discovery and personalized email campaigns' },
  { icon: Calculator, title: 'Financial Calculators', description: 'Runway, burn rate, valuation, and unit economics tools' },
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
      { text: 'Competitor alerts (3 max)', included: true },
      { text: 'Investor database access', included: true },
      { text: 'Financial calculators', included: true },
      { text: 'Secure document storage', included: true },
      { text: 'Session export & bookmarks', included: true },
      { text: 'API & webhook access', included: true },
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

const roadmapItems = [
  { phase: 'Now', title: 'Full Platform', items: ['4 AI agents + A2A mode', 'Competitor alerts & investor DB', 'Customer outreach & campaigns', 'Notion export & secure docs'] },
  { phase: 'Q1 2026', title: 'Team Features', items: ['Multiple founders per startup', 'Team collaboration', 'Shared sessions', 'Role-based access'] },
  { phase: 'Q2 2026', title: 'Integrations', items: ['Slack notifications', 'CRM sync (HubSpot, Salesforce)', 'Calendar follow-ups', 'Google Drive sync'] },
  { phase: 'Q3 2026', title: 'Enterprise', items: ['SSO integration', 'Custom AI training', 'On-premise deployment', 'White-label options'] },
];

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
            <a href="#developers" className="text-muted-foreground hover:text-foreground transition-colors">Developers</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
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

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 pt-8 pb-12 sm:py-24 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
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
        <section id="roadmap" className="max-w-6xl mx-auto px-6 py-24 border-t border-border/40">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl md:text-4xl font-medium tracking-tight mb-4">Roadmap</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We&apos;re building in public. Here&apos;s what&apos;s coming next.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {roadmapItems.map((item, index) => (
              <motion.div
                key={item.phase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`p-6 rounded-xl border ${index === 0 ? 'border-primary/50 bg-primary/5' : 'border-border/40 bg-card/50'}`}
              >
                <Badge variant={index === 0 ? 'default' : 'secondary'} className="mb-3">
                  {item.phase}
                </Badge>
                <h3 className="font-serif text-lg font-medium mb-3">{item.title}</h3>
                <ul className="space-y-2">
                  {item.items.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle weight={index === 0 ? 'fill' : 'regular'} className={`w-4 h-4 ${index === 0 ? 'text-green-500' : ''}`} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

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
