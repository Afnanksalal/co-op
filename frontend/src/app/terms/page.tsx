import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms for Co-Op accounts, license activation, desktop software, and local-first workflows.',
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      updated="June 12, 2026"
      intro="These terms describe the intended commercial relationship for Co-Op: a cloud account and license service paired with installed local-first desktop business software."
      sections={[
        {
          title: 'Product scope',
          body: 'Co-Op provides local-first business management software. The cloud service manages accounts, downloads, payment and license status, licenses, activation, heartbeat, and revocation. The installed desktop app handles business workflows, local files, assistant/provider settings, local history, and company data.',
        },
        {
          title: 'Accounts and licenses',
          body: 'Customers are responsible for keeping account credentials and license keys secure. Licenses may be limited by plan, seats, devices, expiration, payment status, and permitted use. Co-Op may suspend or revoke access for fraud, payment failure, abuse, or breach of these terms.',
        },
        {
          title: 'Customer data and providers',
          body: 'The customer controls what data is placed into the desktop app and what providers are connected. Use of local assistant runtimes, private assistant providers, Firecrawl, email providers, or other integrations is governed by the customer configuration and the terms of those providers.',
        },
        {
          title: 'Acceptable use',
          items: [
            'Do not bypass, reverse engineer, or tamper with license enforcement.',
            'Do not use Co-Op for unlawful, deceptive, abusive, or rights-infringing activity.',
            'Do not share activation tokens, license keys, or account access outside the licensed organization.',
            'Review AI output before using it for legal, financial, HR, regulated, or high-impact decisions.',
          ],
        },
        {
          title: 'Software updates',
          body: 'Co-Op may publish updates to improve security, compatibility, licensing behavior, and product functionality. Customers are responsible for installing updates needed for security and continued compatibility.',
        },
        {
          title: 'Disclaimer',
          body: 'Co-Op is business software and is not a substitute for qualified professional advice. AI-generated output can be incomplete, stale, or incorrect. Customers remain responsible for decisions made using the software.',
        },
        {
          title: 'Contact',
          body: 'For legal questions, contact contact@co-op.software.',
        },
      ]}
    />
  );
}
