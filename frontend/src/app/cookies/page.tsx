import type { Metadata } from 'next';
import { LegalShell } from '@/components/legal/legal-shell';

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'Cookie and local storage policy for Co-Op web account pages and desktop software.',
};

export default function CookiesPage() {
  return (
    <LegalShell
      title="Cookie Policy"
      updated="June 12, 2026"
      intro="Co-Op uses minimal browser storage for the public website and account center. The desktop app also uses local application storage for product functionality."
      sections={[
        {
          title: 'Essential account storage',
          body: 'The web account center may use cookies or local browser storage required for authentication, session continuity, security, and account navigation.',
        },
        {
          title: 'Desktop local storage',
          body: 'Co-Op Desktop uses local application storage for activation state, settings, local company context, and workflow history. This is product data, not website tracking.',
        },
        {
          title: 'Analytics and marketing',
          body: 'Co-Op does not currently require non-essential marketing cookies for the public pages. If analytics or advertising cookies are added, this policy will list the provider, purpose, retention period, and available controls.',
        },
        {
          title: 'Customer controls',
          body: 'Customers can clear browser storage through their browser settings and clear local desktop activation or product data through supported desktop workflows.',
        },
      ]}
    />
  );
}
