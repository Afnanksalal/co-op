import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Co-Op handles cloud account data, license data, and local desktop data.',
};

export default function PrivacyPage() {
  return (
    <LegalShell
      title="Privacy Policy"
      updated="June 12, 2026"
      intro="Co-Op is local-first desktop business software with a cloud license service. This policy explains what the cloud stores, what stays on the customer machine, and what changes when a customer connects outside providers."
      sections={[
        {
          title: 'Cloud account and license data',
          body: 'The Co-Op cloud service stores account identity, authentication metadata, payment and license status records, license prefixes, hashed license keys, hashed activation tokens, device labels, activation status, application version, and license refresh timestamps.',
        },
        {
          title: 'Local desktop data',
          body: 'Co-Op Desktop stores company profile data, local files, saved research, customer work, workflow history, assistant settings, provider keys, and activation state on the installed machine unless the customer configures an external provider or export path.',
        },
        {
          title: 'Activation and heartbeat',
          body: 'During activation and license refresh, the desktop app sends the license key or activation token with a machine fingerprint hash. The cloud service uses this information to validate license status, device limits, expiration, and revocation status.',
        },
        {
          title: 'AI and research providers',
          body: 'If a customer uses a local assistant, requests are sent to the configured local service. If a customer connects a private assistant provider, Firecrawl, email provider, or other integration, data sent to that provider is governed by the customer configuration and the terms of that provider.',
        },
        {
          title: 'Security practices',
          items: [
            'Raw license keys and activation tokens are not stored by the backend as plaintext.',
            'Provider keys are designed to stay in the desktop app, not the cloud license service.',
            'Cloud services should run with strong license pepper, admin API secrets, TLS, and least-privilege database credentials.',
            'Sensitive logs must not include license keys, provider keys, workflow prompts, or customer outputs.',
          ],
        },
        {
          title: 'Customer choices',
          body: 'Customers can clear local activation state from the desktop app, deactivate devices through supported account workflows, rotate connected provider keys, remove local files, and request deletion of cloud account or license data where legally permitted.',
        },
        {
          title: 'Contact',
          body: 'For privacy requests, contact contact@co-op.software.',
        },
      ]}
    />
  );
}
