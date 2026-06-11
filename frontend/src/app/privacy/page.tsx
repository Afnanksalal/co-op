'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
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
        <h1 className="mb-4 font-serif text-4xl font-medium tracking-normal">Privacy Policy</h1>
        <p className="mb-12 text-muted-foreground">Last updated: June 11, 2026</p>

        <div className="space-y-8">
          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">1. What The Cloud Stores</h2>
            <p className="leading-8 text-muted-foreground">
              The Co-Op cloud control plane stores account information, authentication records, payment and license metadata, issued license prefixes, hashed license keys, hashed activation tokens, device names you provide, application version, activation status, and heartbeat timestamps.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">2. What Stays Local</h2>
            <p className="leading-8 text-muted-foreground">
              Co-Op Desktop is designed for local-first operation. Business workflows, local memory, model provider settings, provider API keys, and company data are stored on the installed machine unless you explicitly configure an external provider or sync path.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">3. Activation Data</h2>
            <p className="leading-8 text-muted-foreground">
              During activation and heartbeat checks, the desktop app sends your license key or activation token with a machine fingerprint hash. We do not need raw hardware details to validate entitlement.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">4. Model Providers</h2>
            <p className="leading-8 text-muted-foreground">
              If you connect Ollama, requests stay on your local model host. If you configure an OpenAI-compatible or managed provider, prompts and outputs may be processed by that provider according to your configuration and their policies.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">5. Security</h2>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>License keys and activation tokens are stored as keyed hashes in the backend.</li>
              <li>Cloud account authentication is handled through Supabase.</li>
              <li>Desktop activation state is stored locally on the installed machine.</li>
              <li>Production deployments must use strong license pepper and admin API secrets.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">6. Your Choices</h2>
            <p className="leading-8 text-muted-foreground">
              You can clear local activation state from Co-Op Desktop, deactivate devices through supported account workflows, and request account/license data deletion where legally permitted.
            </p>
          </section>

          <section>
            <h2 className="mb-4 font-serif text-2xl font-medium tracking-normal">7. Contact</h2>
            <p className="leading-8 text-muted-foreground">
              For privacy inquiries, contact{' '}
              <a href="mailto:privacy@co-op.software" className="text-foreground underline">privacy@co-op.software</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
