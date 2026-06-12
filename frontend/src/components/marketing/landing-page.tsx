'use client';

import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  DownloadSimple,
  Key,
  ShieldCheck,
  Sparkle,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroScreenshot, ScreenshotStrip } from './product-screenshots';
import { MotionRoot, Reveal, RevealGroup, m } from './motion';
import { faqs, pillars, trustItems, workflow } from './data';
import { MarketingFooter, MarketingHeader } from './marketing-chrome';

export function LandingPage() {
  return (
    <MotionRoot>
      <main className="min-h-screen overflow-hidden bg-background text-foreground">
        <MarketingHeader />
        <section className="relative border-b border-border/60">
          <div className="container-wide grid items-center gap-10 py-10 lg:grid-cols-[0.82fr_1.18fr]">
            <m.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}>
              <m.div variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }}>
                <Badge variant="secondary" className="mb-5 w-fit border-border bg-card">
                  Local-first business management
                </Badge>
              </m.div>
              <m.h1
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="max-w-3xl text-balance font-serif text-5xl font-semibold leading-[1.02] tracking-normal sm:text-6xl lg:text-7xl"
              >
                Co-Op
              </m.h1>
              <m.p
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground"
              >
                Keep company context, plans, research, customer follow-up, and day-to-day decisions
                organized in one desktop workspace.
              </m.p>
              <m.div
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="mt-8 flex flex-wrap gap-3"
              >
                <Link href="/download">
                  <Button size="lg" className="h-12 px-6">
                    Download software
                    <DownloadSimple weight="bold" className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/account">
                  <Button variant="outline" size="lg" className="h-12 px-6">
                    Manage license
                    <ArrowRight weight="bold" className="h-4 w-4" />
                  </Button>
                </Link>
              </m.div>
              <m.div
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="mt-8 grid max-w-xl gap-3 text-sm text-muted-foreground sm:grid-cols-3"
              >
                {['Desktop workspace', 'Cloud license', 'Private assistant setup'].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-500" weight="fill" />
                    {item}
                  </div>
                ))}
              </m.div>
            </m.div>
            <HeroScreenshot />
          </div>
        </section>

        <section id="product" className="container-wide py-20">
          <Reveal className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Product</p>
            <h2 className="mt-3 text-balance font-serif text-4xl font-semibold tracking-normal sm:text-5xl">
              Clear daily work for the person running the business.
            </h2>
            <p className="mt-4 text-lg leading-8 text-muted-foreground">
              Co-Op keeps the main operating areas simple: ask, files, research, customers, plans,
              money, settings, and license access.
            </p>
          </Reveal>
          <RevealGroup className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map(({ icon: Icon, title, copy }) => (
              <m.article
                key={title}
                variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                className="rounded-lg border border-border bg-card p-5 shadow-soft"
              >
                <Icon className="mb-5 h-6 w-6 text-muted-foreground" />
                <h3 className="text-base font-semibold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
              </m.article>
            ))}
          </RevealGroup>
        </section>

        <section className="border-y border-border/60 bg-muted/25 py-20">
          <div className="container-wide">
            <Reveal className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Screens</p>
                <h2 className="mt-3 text-balance font-serif text-4xl font-semibold tracking-normal">
                  Product areas that map to everyday work.
                </h2>
              </div>
              <Link href="/download">
                <Button variant="outline">
                  View product areas
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </Reveal>
            <RevealGroup>
              <ScreenshotStrip />
            </RevealGroup>
          </div>
        </section>

        <section id="workflow" className="container-wide py-20">
          <Reveal className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">Workflow</p>
              <h2 className="mt-3 text-balance font-serif text-4xl font-semibold tracking-normal">
                Simple setup with clear responsibilities.
              </h2>
              <p className="mt-4 text-lg leading-8 text-muted-foreground">
                The web account handles access and downloads. The installed app handles company
                context and work history.
              </p>
            </div>
            <div className="grid gap-3">
              {workflow.map(([title, copy], index) => (
                <div key={title} className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-[48px_1fr]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-md bg-foreground text-background">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="security" className="border-y border-border/60 bg-[#101418] py-20 text-white">
          <div className="container-wide grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <Reveal>
              <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-200">Local-first by design</Badge>
              <h2 className="mt-5 text-balance font-serif text-4xl font-semibold tracking-normal sm:text-5xl">
                Account access in the cloud. Company work on the machine.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#aeb8c8]">
                The cloud service checks account and license access. The desktop app manages
                files, assistant settings, local history, and the work itself.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link href="/security">
                  <Button variant="secondary">
                    Security overview
                    <ShieldCheck className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/privacy">
                  <Button variant="outline" className="border-white/20 bg-transparent text-white hover:bg-white/10">
                    Privacy policy
                  </Button>
                </Link>
              </div>
            </Reveal>
            <RevealGroup className="grid gap-3 sm:grid-cols-2">
              {trustItems.map((item) => (
                <m.div
                  key={item}
                  variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
                  className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/[0.04] p-4"
                >
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" />
                  <span className="text-sm leading-6 text-[#d6dce7]">{item}</span>
                </m.div>
              ))}
            </RevealGroup>
          </div>
        </section>

        <section className="container-wide py-20">
          <Reveal className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-muted-foreground">FAQ</p>
              <h2 className="mt-3 text-balance font-serif text-4xl font-semibold tracking-normal">
                Straight answers for buyers and operators.
              </h2>
            </div>
            <div className="divide-y divide-border rounded-lg border border-border bg-card">
              {faqs.map(({ q, a }) => (
                <div key={q} className="p-5">
                  <h3 className="font-semibold">{q}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{a}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="container-wide pb-20">
          <Reveal className="overflow-hidden rounded-lg border border-border bg-card p-8 shadow-soft sm:p-10">
            <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-foreground text-background">
                  <Sparkle className="h-6 w-6" />
                </div>
                <h2 className="text-balance font-serif text-4xl font-semibold tracking-normal">
                  Start with the desktop app.
                </h2>
                <p className="mt-4 max-w-2xl text-muted-foreground">
                  Create an account, download the installer, activate with a license key, and keep
                  company work inside the desktop app.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href="/download">
                  <Button size="lg">
                    Download
                    <DownloadSimple className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/account">
                  <Button size="lg" variant="outline">
                    Account center
                    <Key className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </Reveal>
        </section>
        <MarketingFooter />
      </main>
    </MotionRoot>
  );
}
