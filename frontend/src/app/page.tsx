'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
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
} from '@phosphor-icons/react/dist/ssr';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LandingBackground } from '@/components/ui/background';

// Multilingual "Op" translations
const opTranslations = [
  { text: 'Op', label: 'English' },
  { text: 'ഓപ്', label: 'Malayalam' },
  { text: 'ऑप', label: 'Hindi' },
  { text: 'ஆப்', label: 'Tamil' },
  { text: 'ఆప్', label: 'Telugu' },
  { text: 'অপ', label: 'Bengali' },
  { text: 'أوب', label: 'Arabic' },
  { text: '合作', label: 'Chinese' },
  { text: 'オプ', label: 'Japanese' },
  { text: '옵', label: 'Korean' },
];

const agents = [
  { icon: Scales, title: 'Legal', description: 'Corporate structure, contracts, compliance' },
  { icon: ChartLineUp, title: 'Finance', description: 'Financial modeling, metrics, runway' },
  { icon: UsersThree, title: 'Investor', description: 'VC matching, pitch optimization' },
  { icon: Globe, title: 'Competitor', description: 'Market analysis, positioning' },
];

const pricingPlans = [
  {
    name: 'Pilot',
    price: 'Free',
    description: 'Try Co-Op during our pilot phase',
    features: [
      { text: '30 AI requests/month', included: true },
      { text: 'All 4 AI agents', included: true },
      { text: 'Multi-agent A2A mode', included: true },
      { text: 'Session history', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Community support', included: true },
      { text: 'Priority support', included: false },
      { text: 'Custom integrations', included: false },
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
      { text: 'All 4 AI agents', included: true },
      { text: 'Full source code', included: true },
      { text: 'Bring your own API keys', included: true },
      { text: 'Complete data control', included: true },
      { text: 'Community support', included: true },
      { text: 'Managed infrastructure', included: false },
      { text: 'Priority support', included: false },
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
      { text: 'All 4 AI agents', included: true },
      { text: 'Priority processing', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'API access', included: true },
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
  { phase: 'Now', title: 'Pilot Launch', items: ['Single founder per startup', '30 free requests/month', '4 AI agents', 'A2A multi-agent mode'] },
  { phase: 'Q1 2026', title: 'Team Features', items: ['Multiple founders per startup', 'Team collaboration', 'Shared sessions', 'Role-based access'] },
  { phase: 'Q2 2026', title: 'Idea Stage', items: ['Idea validation flow', 'Market research agent', 'Business model canvas', 'Competitor discovery'] },
  { phase: 'Q3 2026', title: 'Enterprise', items: ['SSO integration', 'Custom AI training', 'On-premise deployment', 'SLA guarantees'] },
];

export default function HomePage() {
  const [currentOpIndex, setCurrentOpIndex] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkSession();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentOpIndex((prev) => (prev + 1) % opTranslations.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

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
        <section className="max-w-6xl mx-auto px-6 py-24 md:py-32 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm mb-8">
              <Sparkle weight="fill" className="w-4 h-4" />
              AI-Powered Advisory Platform
            </div>

            {/* Animated Co-Op Logo */}
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-medium tracking-tight mb-8 leading-[1.2]">
              <span className="inline-flex items-center justify-center">
                <span>Co-</span>
                <span className="relative inline-flex w-[80px] sm:w-[100px] md:w-[120px] lg:w-[140px] h-[1.2em] overflow-hidden ml-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentOpIndex}
                      initial={{ y: '100%', opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: '-100%', opacity: 0 }}
                      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      {opTranslations[currentOpIndex].text}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </h1>
            
            {/* Language indicator */}
            <motion.p 
              key={currentOpIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground/60 mb-6 h-4"
            >
              {opTranslations[currentOpIndex].label}
            </motion.p>

            <p className="text-2xl md:text-3xl text-muted-foreground font-serif mb-4">
              Cross the gaps. Build the future.
            </p>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
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
                {['Advanced financial modeling', 'Complex legal structures', 'Investor relationship strategies', 'Competitive intelligence'].map((item) => (
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
                  <p className="text-sm text-muted-foreground">Validate your concept with AI</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Have an idea but haven&apos;t started? Our A2A (Agent-to-Agent) protocol helps validate and refine your concept.
              </p>
              <ul className="space-y-3 mb-6">
                {['Idea validation & refinement', 'Market opportunity analysis', 'Business model exploration', 'Multi-agent brainstorming (A2A)'].map((item) => (
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
