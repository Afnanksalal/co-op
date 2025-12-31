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
        <p className="text-muted-foreground mb-12">Last updated: December 31, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">1. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">We collect information you provide directly:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Account information (email, name, authentication provider)</li>
              <li>Startup profile data (company name, industry, sector, stage, funding details)</li>
              <li>Chat conversations with AI agents</li>
              <li>Uploaded documents (pitch decks, secure documents)</li>
              <li>Cap table configurations and financial models</li>
              <li>Lead and campaign data for outreach features</li>
              <li>Usage data, preferences, and session history</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">2. How We Use Your Information</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">Your data is used to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2">
              <li>Provide personalized AI advisory responses via our LLM Council</li>
              <li>Analyze pitch decks and generate investor-specific recommendations</li>
              <li>Calculate cap table scenarios and dilution models</li>
              <li>Power secure document RAG (Retrieval-Augmented Generation) for contextual AI responses</li>
              <li>Discover and enrich leads for customer outreach campaigns</li>
              <li>Monitor competitors and deliver real-time alerts</li>
              <li>Improve our AI models and service quality</li>
              <li>Communicate important updates and security notices</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">3. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement enterprise-grade security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>All data encrypted in transit (TLS 1.3)</li>
              <li>Database encryption at rest (PostgreSQL)</li>
              <li>AES-256-GCM encryption for secure documents</li>
              <li>Secure authentication via Supabase with JWT tokens</li>
              <li>Token blacklisting for immediate session revocation</li>
              <li>Rate limiting and DDoS protection</li>
              <li>Comprehensive audit logging</li>
              <li>Regular security audits and penetration testing</li>
              <li>Circuit breaker patterns for service resilience</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">4. Document Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you upload documents (pitch decks, secure documents):
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Files are processed and text is extracted for AI analysis</li>
              <li>Secure documents are encrypted with AES-256-GCM before storage</li>
              <li>Original files for secure documents are deleted after processing (only encrypted chunks stored)</li>
              <li>Document chunks are stored in isolated vector databases per user</li>
              <li>Auto-expiry available for sensitive documents</li>
              <li>You can delete your documents at any time</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">5. AI Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our LLM Council architecture processes your queries through multiple AI providers:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Queries are sent to 2-3 AI models for cross-validation</li>
              <li>Providers include Groq (Llama), Google AI (Gemini), and HuggingFace</li>
              <li>Queries are anonymized where possible</li>
              <li>We do not use your data to train third-party AI models</li>
              <li>RAG context is retrieved from your documents and our curated knowledge bases</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">6. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We do not sell your personal data. We may share data with:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>AI model providers (anonymized queries for response generation)</li>
              <li>Infrastructure providers (Supabase, Vercel, Render, Upstash, Koyeb)</li>
              <li>Email service providers (for outreach campaigns and notifications)</li>
              <li>Law enforcement when legally required</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">7. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">You have the right to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Access your personal data</li>
              <li>Request data correction or deletion</li>
              <li>Export your data (sessions, cap tables, documents)</li>
              <li>Delete individual documents, sessions, or your entire account</li>
              <li>Opt out of non-essential communications</li>
              <li>Revoke API keys and webhook access</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">8. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. Upon account deletion, 
              we remove your personal data within 30 days, except where retention is required by law.
              Secure documents with auto-expiry are automatically deleted after their TTL expires.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">9. Cookies & Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies and local storage for authentication, session management, 
              and user preferences (theme, sidebar state). We do not use tracking cookies or 
              third-party advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">10. Self-Hosted Instances</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you self-host Co-Op, you are responsible for your own data handling and privacy 
              compliance. This policy applies only to the hosted version at co-op.software.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">11. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this policy from time to time. We will notify you of significant changes 
              via email or in-app notification. Continued use of the Service after changes constitutes 
              acceptance of the updated policy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">12. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For privacy inquiries, contact us at{' '}
              <a href="mailto:privacy@co-op.software" className="text-foreground underline">privacy@co-op.software</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
