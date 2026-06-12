import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Security',
  description: 'Security overview for Co-Op local-first desktop software and cloud licensing.',
};

export default function SecurityPage() {
  return (
    <LegalShell
      title="Security Overview"
      updated="June 12, 2026"
      intro="Co-Op is designed around a narrow cloud license service and a private desktop workspace. This page summarizes the intended security posture for production customers."
      sections={[
        {
          title: 'Data boundary',
          body: 'The backend validates identity, payment status, license generation, activation, heartbeat, and revocation. The desktop app owns company files, workflow history, provider configuration, customer context, and local execution.',
        },
        {
          title: 'Secret handling',
          items: [
            'Raw license keys, activation tokens, provider keys, prompts, and customer outputs must not be logged.',
            'License keys and activation tokens are handled as keyed hashes in the backend.',
            'Desktop provider keys are kept out of the cloud license service.',
            'Production operators must rotate admin secrets and license pepper if exposure is suspected.',
          ],
        },
        {
          title: 'Local storage',
          body: 'Co-Op Desktop uses local storage for activation state, workspace data, files, search memory, workflow traces, and provider configuration. Customers should protect the device with OS-level disk encryption and account controls.',
        },
        {
          title: 'Network behavior',
          body: 'Normal business workflows should not require Co-Op cloud services after activation. Network calls happen when validating a license, using a configured provider, running web research, sending email, or checking license status.',
        },
        {
          title: 'Reporting',
          body: 'Security reports can be sent to contact@co-op.software with clear reproduction details and impact.',
        },
      ]}
    />
  );
}
