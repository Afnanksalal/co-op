'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  ArrowRight,
  Scales,
  ChartLineUp,
  UsersThree,
  Globe,
  Sparkle,
  Lightning,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LandingBackground } from '@/components/ui/background';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const agents = [
  {
    icon: Scales,
    name: 'Legal',
    description: 'Corporate structure, contracts, compliance',
  },
  {
    icon: ChartLineUp,
    name: 'Finance',
    description: 'Financial modeling, metrics, valuation',
  },
  {
    icon: UsersThree,
    name: 'Investor',
    description: 'VC matching, pitch optimization',
  },
  {
    icon: Globe,
    name: 'Competitor',
    description: 'Market analysis, positioning',
  },
];

const features = [
  {
    icon: Sparkle,
    title: 'LLM Council',
    description: 'Multiple models collaborate for accuracy',
  },
  {
    icon: Lightning,
    title: 'Real-time Research',
    description: 'Live web intelligence gathering',
  },
  {
    icon: ShieldCheck,
    title: 'RAG Knowledge',
    description: 'Curated document libraries',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background relative">
      <LandingBackground />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="font-serif text-2xl font-semibold tracking-tight">Co-Op</span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-40 pb-32 px-6">

        <motion.div
          className="max-w-4xl mx-auto text-center relative z-10"
          initial="initial"
          animate="animate"
          variants={stagger}
        >
          <motion.p
            variants={fadeInUp}
            className="text-sm text-muted-foreground tracking-widest uppercase mb-6"
          >
            AI Advisory Platform
          </motion.p>

          <motion.h1
            variants={fadeInUp}
            className="font-serif text-6xl md:text-7xl lg:text-8xl font-medium tracking-tight mb-8 leading-[0.95]"
          >
            Your Advisory
            <br />
            <span className="text-primary/90">Board</span>
          </motion.h1>

          <motion.p
            variants={fadeInUp}
            className="text-lg text-muted-foreground max-w-xl mx-auto mb-12 leading-relaxed"
          >
            Expert guidance across legal, finance, investor relations, and competitive analysis.
            Multiple AI models collaborate for accuracy.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4">
            <Link href="/login">
              <Button size="lg" className="group px-8">
                Start Free
                <ArrowRight
                  weight="bold"
                  className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                />
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* Agents */}
      <section className="py-32 px-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm text-muted-foreground tracking-widest uppercase mb-4">
              Specialized Agents
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
              Four domains of expertise
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-4">
            {agents.map((agent, index) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <Card hover className="h-full border-border/40">
                  <CardContent className="p-8">
                    <agent.icon weight="light" className="w-8 h-8 text-foreground/70 mb-6" />
                    <h3 className="font-serif text-2xl font-medium mb-2">{agent.name}</h3>
                    <p className="text-muted-foreground">{agent.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-32 px-6 border-t border-border/40 bg-card/30">
        <div className="max-w-5xl mx-auto">
          <motion.div
            className="text-center mb-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-sm text-muted-foreground tracking-widest uppercase mb-4">
              Architecture
            </p>
            <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight">
              Built different
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-12">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <feature.icon weight="light" className="w-8 h-8 text-foreground/70 mx-auto mb-5" />
                <h3 className="font-serif text-xl font-medium mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6 border-t border-border/40">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="font-serif text-4xl md:text-5xl font-medium tracking-tight mb-6">
            Ready to start?
          </h2>
          <p className="text-muted-foreground mb-10">
            Join founders making better decisions with AI-powered advisory.
          </p>
          <Link href="/login">
            <Button size="lg" className="px-10">
              Get Started
              <ArrowRight weight="bold" className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border/40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-serif text-lg">Co-Op</span>
          <p className="text-sm text-muted-foreground">© 2024</p>
        </div>
      </footer>
    </div>
  );
}
