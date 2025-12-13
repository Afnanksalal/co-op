'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Scales, ChartLineUp, UsersThree, Globe, Sparkle } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { LandingBackground } from '@/components/ui/background';

const features = [
  {
    icon: Scales,
    title: 'Legal',
    description: 'Corporate structure, contracts, compliance guidance',
  },
  {
    icon: ChartLineUp,
    title: 'Finance',
    description: 'Financial modeling, metrics, runway calculations',
  },
  {
    icon: UsersThree,
    title: 'Investor',
    description: 'VC matching, pitch optimization, fundraising',
  },
  {
    icon: Globe,
    title: 'Competitor',
    description: 'Market analysis, competitive positioning',
  },
];

export default function HomePage() {
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.push('/dashboard');
      }
    };
    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen bg-background relative">
      <LandingBackground />

      {/* Header */}
      <header className="relative z-10 border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold tracking-tight">
            Co-Op
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>
                Get Started
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="relative z-10">
        <section className="max-w-6xl mx-auto px-6 py-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-sm mb-8">
              <Sparkle weight="fill" className="w-4 h-4" />
              AI-Powered Advisory for Startups
            </div>

            <h1 className="font-serif text-5xl md:text-6xl font-medium tracking-tight mb-6 leading-[1.1]">
              Your AI
              <br />
              Advisory Board
            </h1>

            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Expert guidance across legal, finance, investor relations, and competitive analysis.
              Multiple AI models cross-validate every response.
            </p>

            <div className="flex items-center justify-center gap-4">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8">
                  Start Free
                  <ArrowRight weight="bold" className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl font-medium tracking-tight mb-4">
              Four Expert Agents
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Each agent specializes in a critical area of startup operations,
              powered by curated knowledge bases and real-time research.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.3, duration: 0.5 }}
                className="p-6 rounded-xl border border-border/40 bg-card/50 hover:border-border transition-colors"
              >
                <feature.icon weight="light" className="w-8 h-8 mb-4 text-foreground/70" />
                <h3 className="font-serif text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* How it Works */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="font-serif text-3xl font-medium tracking-tight mb-4">
              How It Works
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Tell us about your startup',
                description: 'Complete a quick onboarding to help our agents understand your business.',
              },
              {
                step: '02',
                title: 'Ask any question',
                description: 'Get expert advice on legal, finance, investors, or competitors.',
              },
              {
                step: '03',
                title: 'Get validated answers',
                description: 'Multiple AI models cross-check responses for accuracy and depth.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index + 0.5, duration: 0.5 }}
                className="text-center"
              >
                <div className="text-4xl font-serif font-medium text-muted-foreground/30 mb-4">
                  {item.step}
                </div>
                <h3 className="font-serif text-lg font-medium mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="text-center p-12 rounded-2xl border border-border/40 bg-card/50"
          >
            <h2 className="font-serif text-3xl font-medium tracking-tight mb-4">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8 max-w-md mx-auto">
              Join founders who use Co-Op to make better decisions faster.
            </p>
            <Link href="/login">
              <Button size="lg" className="h-12 px-8">
                Get Started Free
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/40">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between">
          <span className="font-serif text-sm text-muted-foreground">
            © {new Date().getFullYear()} Co-Op
          </span>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
