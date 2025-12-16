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
        <p className="text-muted-foreground mb-12">Last updated: December 15, 2025</p>

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
              financial, investor relations, and competitive analysis matters. The Service uses multiple AI 
              models to cross-validate responses for accuracy.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">3. Pilot Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              Co-Op is currently in a pilot phase. During this period:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Free users receive 30 AI requests per month</li>
              <li>Premium features are coming soon</li>
              <li>Service availability and features may change without notice</li>
              <li>We may limit or modify access at our discretion</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">4. User Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed">You agree to:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
              <li>Provide accurate information during registration</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the Service only for lawful purposes</li>
              <li>Not attempt to reverse engineer or exploit the Service</li>
              <li>Not share your account with others</li>
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">5. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Co-Op is not a substitute for professional advice.</strong> The AI-generated content 
              is for informational purposes only and should not be considered legal, financial, or 
              investment advice. Always consult qualified professionals for important business decisions.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">6. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Co-Op and its creators shall not be liable for any 
              indirect, incidental, special, consequential, or punitive damages resulting from your use 
              of the Service.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              Co-Op is open-source software. The source code is available under the project&apos;s license 
              on GitHub. Your data and content remain your property.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">8. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these terms from time to time. Continued use of the Service after changes 
              constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="font-serif text-2xl font-medium mb-4">9. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please contact us at{' '}
              <a href="mailto:legal@co-op.ai" className="text-foreground underline">legal@co-op.ai</a>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
