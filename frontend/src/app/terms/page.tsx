'use client';

import Link from 'next/link';
import { ArrowLeft } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export default function TermsPage() {
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
        <h1 className="font-serif text-4xl font-medium mb-4">Terms of Service</h1>
        <p className="text-muted-foreground mb-12">Last updated: December 31, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Co-Op (&quot;the Service&quot;), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Co-Op is an AI-powered advisory platform that provides startup founders with insights on legal, 
              financial, investor relations, and competitive analysis matters. The Service includes:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>AI agents powered by our LLM Council (multiple models cross-validating responses)</li>
              <li>Pitch deck analysis with investor-specific recommendations</li>
              <li>Cap table simulation and dilution modeling</li>
              <li>Secure document storage with RAG integration</li>
              <li>Customer outreach with AI-powered lead discovery</li>
              <li>Competitor monitoring and market alerts</li>
              <li>Investor database and matching</li>
              <li>Financial calculators and modeling tools</li>
              <li>REST API, MCP Protocol, and webhook integrations</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">3. Pilot Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              Co-Op is currently in a pilot phase. During this period:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Free users receive 3 AI agent requests per month</li>
              <li>Up to 3 competitor alerts per user</li>
              <li>Up to 5 leads and 5 campaigns for outreach</li>
              <li>1 API key and 1 webhook per user</li>
              <li>Full access to pitch deck analyzer and cap table simulator</li>
              <li>Service availability and features may change without notice</li>
              <li>We may limit or modify access at our discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">4. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">You agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Provide accurate information during registration and onboarding</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to reverse engineer, exploit, or abuse the Service</li>
              <li>Not share your account or API keys with others</li>
              <li>Not use the Service to send spam or unsolicited communications</li>
              <li>Comply with all applicable laws regarding outreach and email campaigns</li>
              <li>Respect rate limits and fair usage policies</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">5. Document Upload & Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              When uploading documents to Co-Op:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>You retain ownership of all uploaded content</li>
              <li>You grant us license to process documents for AI analysis</li>
              <li>Pitch decks are stored for analysis and future reference</li>
              <li>Secure documents are encrypted and can be set to auto-expire</li>
              <li>You are responsible for ensuring you have rights to upload content</li>
              <li>We may reject or remove content that violates these terms</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">6. Outreach & Email Campaigns</h2>
            <p className="text-muted-foreground leading-relaxed">
              When using our outreach features:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>You must comply with CAN-SPAM, GDPR, and other applicable email laws</li>
              <li>You must have a legitimate business purpose for contacting leads</li>
              <li>You must honor unsubscribe requests promptly</li>
              <li>We may suspend accounts that generate excessive bounces or spam complaints</li>
              <li>AI-generated email content is your responsibility to review before sending</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">7. API & Integration Usage</h2>
            <p className="text-muted-foreground leading-relaxed">
              When using our APIs, MCP Protocol, or webhooks:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>API keys are confidential and must not be shared</li>
              <li>You must respect rate limits (documented in API responses)</li>
              <li>Webhook endpoints must be secure (HTTPS) and respond promptly</li>
              <li>We may revoke access for abuse or excessive usage</li>
              <li>API access is subject to the same usage limits as the web interface</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">8. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Co-Op is not a substitute for professional advice.</strong> The AI-generated content 
              is for informational purposes only and should not be considered legal, financial, tax, or 
              investment advice. Our LLM Council cross-validates responses for accuracy, but AI can make 
              mistakes. Always consult qualified professionals for important business decisions.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Co-Op and its creators shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages resulting from your use 
              of the Service, including but not limited to:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Decisions made based on AI-generated advice</li>
              <li>Loss of data or business interruption</li>
              <li>Inaccuracies in pitch deck analysis or cap table calculations</li>
              <li>Failed outreach campaigns or lead quality issues</li>
              <li>Third-party service outages affecting our platform</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">10. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Co-Op is open-source software. The source code is available under the project&apos;s license 
              on GitHub. Your data and content remain your property. AI-generated responses are provided 
              for your use but may not be unique to you.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">11. Account Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may suspend or terminate your account if you:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Violate these Terms of Service</li>
              <li>Engage in abusive or fraudulent behavior</li>
              <li>Attempt to circumvent rate limits or security measures</li>
              <li>Use the Service for illegal purposes</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-4">
              You may delete your account at any time. Upon deletion, your data will be removed within 30 days.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">12. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. We will notify you of significant changes 
              via email or in-app notification. Continued use of the Service after changes constitutes 
              acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">13. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These terms shall be governed by and construed in accordance with applicable laws. 
              Any disputes shall be resolved through good-faith negotiation or, if necessary, 
              binding arbitration.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please contact us at{' '}
              <a href="mailto:legal@co-op.software" className="text-foreground underline">legal@co-op.software</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
