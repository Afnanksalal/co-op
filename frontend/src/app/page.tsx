import type { Metadata } from 'next';
import { LandingPage } from '@/components/marketing/landing-page';

export const metadata: Metadata = {
  title: 'Local-First Business Management Software',
  description:
    'Co-Op keeps company context, plans, research, customer follow-up, and day-to-day decisions organized in a desktop workspace with cloud license access.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return <LandingPage />;
}
