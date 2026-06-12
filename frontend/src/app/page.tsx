'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle,
  CloudCheck,
  Database,
  DownloadSimple,
  Fingerprint,
  FlowArrow,
  HardDrives,
  Key,
  LockKey,
  ShieldCheck,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const productPillars = [
  {
    icon: HardDrives,
    title: 'Local-first workspace',
    description:
      'Company files, private settings, decisions, and work history live on the installed machine by default.',
  },
  {
    icon: CloudCheck,
    title: 'Cloud license plane',
    description:
      'Accounts, payments, license keys, device activations, and revocation stay in the managed cloud control plane.',
  },
  {
    icon: FlowArrow,
    title: 'Business orchestration',
    description:
      'Run legal, finance, sales, operations, and strategy workflows with traceable tasks, approvals, and review gates.',
  },
  {
    icon: ShieldCheck,
    title: 'Controlled AI setup',
    description:
      'Use local AI or connect a private AI provider under clear review and spending controls.',
  },
];

const operatingSystem = [
  'Private business memory',
  'Local company files and evidence',
  'Local AI or private provider setup',
  'Extra review only for important decisions',
  'Human approvals before sensitive actions',
  'Traceable work history',
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Co-Op" width={32} height={32} className="rounded-md" />
            <span className="font-serif text-xl font-semibold">Co-Op</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#platform" className="hover:text-foreground">
              Platform
            </a>
            <a href="#security" className="hover:text-foreground">
              Security
            </a>
            <Link href="/download" className="hover:text-foreground">
              Download
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/account" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Account
              </Button>
            </Link>
            <Link href="/download">
              <Button size="sm">
                <DownloadSimple weight="bold" className="h-4 w-4" />
                Download
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="border-b border-border/60">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_0.9fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <Badge variant="secondary" className="mb-5 w-fit">
              Local-first business operating system
            </Badge>
            <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
              Co-Op gives your business a private operating workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Install the desktop app, activate with a cloud license key, choose local AI or a
              private provider, and run business work without turning every company decision into
              hosted chat data.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/download">
                <Button size="lg" className="h-12 px-6">
                  Get the software
                  <ArrowRight weight="bold" className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/account">
                <Button variant="outline" size="lg" className="h-12 px-6">
                  Manage license
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4 shadow-soft">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="Co-Op desktop"
                  width={36}
                  height={36}
                  className="rounded-md"
                />
                <div>
                  <p className="text-sm font-medium">Co-Op Desktop</p>
                  <p className="text-xs text-muted-foreground">Licensed local runtime</p>
                </div>
              </div>
              <Badge className="badge-success">Active</Badge>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: 'License', value: 'Team plan', icon: Key },
                { label: 'Company data', value: 'Stored locally', icon: Database },
                { label: 'AI setup', value: 'Owner controlled', icon: HardDrives },
                { label: 'Review', value: 'On demand', icon: LockKey },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-md border border-border bg-background p-4">
                  <Icon className="mb-4 h-5 w-5 text-muted-foreground" />
                  <p className="text-xs uppercase text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-border bg-background p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                <FlowArrow className="h-4 w-4" />
                Operations run
              </div>
              <div className="space-y-3">
                {[
                  'Use local company context',
                  'Send only through the chosen AI setup',
                  'Require approval for sensitive actions',
                  'Save traceable work history',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle weight="fill" className="h-4 w-4 text-green-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-normal">
            Built like serious business software
          </h2>
          <p className="mt-3 text-muted-foreground">
            Co-Op separates the paid cloud control plane from the private local work plane, closer
            to desktop CAD/accounting products than a hosted chatbot.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {productPillars.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon className="mb-5 h-6 w-6 text-muted-foreground" />
              <h3 className="text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="security" className="border-y border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="text-3xl font-semibold tracking-normal">
              License in the cloud. Work stays local.
            </h2>
            <p className="mt-4 text-muted-foreground">
              The desktop app sends a hashed machine fingerprint to activate and refresh
              entitlement. Business data, provider keys, local memory, and orchestration state are
              designed to stay on the customer machine unless configured otherwise.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/activate">
                <Button variant="outline">
                  <Fingerprint className="h-4 w-4" />
                  Desktop activation
                </Button>
              </Link>
              <Link href="/download">
                <Button>
                  Download installer
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {operatingSystem.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-md border border-border bg-background p-4 text-sm"
              >
                <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 text-green-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <span>&copy; {new Date().getFullYear()} Co-Op Software</span>
        <div className="flex gap-5">
          <Link href="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link href="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link href="/download" className="hover:text-foreground">
            Download
          </Link>
        </div>
      </footer>
    </main>
  );
}
