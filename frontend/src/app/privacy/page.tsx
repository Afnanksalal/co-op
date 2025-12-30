'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/40">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl font-semibold">Co-Op</Link>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft weight="bold" className="w-4 h-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="font-serif text-4xl font-medium mb-4">Privacy Policy</h1>
        <p className="text-muted-foreground mb-12">Last updated: December 15, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We collect information you provide directly:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Account information (email, name)</li>
              <li>Startup profile data (company name, industry, stage, etc.)</li>
              <li>Chat conversations with AI agents</li>
              <li>Usage data and preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Your data is used to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide personalized AI advisory responses</li>
              <li>Improve our AI models and service quality</li>
              <li>Communicate important updates</li>
              <li>Ensure platform security</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">3. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>All data is encrypted in transit (TLS 1.3)</li>
              <li>Database encryption at rest</li>
              <li>Secure authentication via Supabase</li>
              <li>Regular security audits</li>
              <li>Access controls and audit logging</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">4. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>AI model providers (anonymized queries only)</li>
              <li>Infrastructure providers (Supabase, Vercel, Render)</li>
              <li>Law enforcement when legally required</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">5. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Access your personal data</li>
              <li>Request data correction or deletion</li>
              <li>Export your data</li>
              <li>Opt out of non-essential communications</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">6. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. Upon account deletion, 
              we remove your personal data within 30 days, except where retention is required by law.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">7. Cookies</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. 
              We do not use tracking cookies or third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">8. Self-Hosted Instances</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you self-host Co-Op, you are responsible for your own data handling and privacy 
              compliance. This policy applies only to the hosted version at co-op.software.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy inquiries, contact us at{' '}
              <a href="mailto:privacy@co-op.ai" className="text-foreground underline">privacy@co-op.ai</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
