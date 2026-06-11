'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Link href="/" className="font-serif text-xl font-semibold tracking-normal">Co-Op</Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft weight="bold" className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="mb-4 font-serif text-4xl font-medium tracking-normal">Terms of Service</h1>
        <p className="mb-12 text-muted-foreground">Last updated: June 11, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">1. Product Scope</h2>
            <p className="leading-8 text-muted-foreground">
              Co-Op provides local-first business management software. The cloud service manages accounts, downloads, payments, licenses, and device entitlement. Business workflows, local model settings, provider keys, and local state are handled in the installed desktop software unless you configure an external provider.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">2. Accounts And Licenses</h2>
            <p className="leading-8 text-muted-foreground">
              You are responsible for keeping account credentials and license keys secure. Licenses may be bound to devices, seats, plans, expiration dates, and usage rules. We may suspend or revoke licenses for fraud, payment failure, abuse, or breach of these terms.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">3. Local Data And Providers</h2>
            <p className="leading-8 text-muted-foreground">
              Co-Op Desktop is designed to keep business data local. If you connect Ollama, OpenAI-compatible endpoints, or other providers, your use of those services is governed by their terms and your configuration choices.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">4. Acceptable Use</h2>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>Do not reverse engineer license checks or bypass entitlement controls.</li>
              <li>Do not use Co-Op for unlawful, abusive, or deceptive activity.</li>
              <li>Do not share accounts, activation tokens, or license keys outside your licensed organization.</li>
              <li>Review AI output before acting on it, especially for legal, financial, HR, or regulated decisions.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">5. Disclaimer</h2>
            <p className="leading-8 text-muted-foreground">
              Co-Op is business software, not a substitute for qualified professional advice. AI-generated output can be incomplete or incorrect. You are responsible for decisions made using the software.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">6. Contact</h2>
            <p className="leading-8 text-muted-foreground">
              For legal questions, contact{' '}
              <a href="mailto:legal@co-op.software" className="text-foreground underline">legal@co-op.software</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
