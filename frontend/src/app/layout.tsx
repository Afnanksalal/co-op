import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import { Analytics } from '@vercel/analytics/next';
import { Toaster } from 'sonner';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: {
    default: 'Co-Op | AI Advisory Board for Startups',
    template: '%s | Co-Op',
  },
  description: 'Your AI-powered advisory board for startups. Get expert guidance on legal, finance, investor relations, and competitive analysis from multiple AI models that cross-validate every response.',
  keywords: ['startup advisor', 'AI advisory', 'legal advice', 'financial modeling', 'investor matching', 'competitor analysis', 'startup tools', 'founder tools', 'LLM council'],
  authors: [{ name: 'Co-Op' }],
  creator: 'Co-Op',
  publisher: 'Co-Op',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://co-op-dev.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Co-Op',
    title: 'Co-Op | AI Advisory Board for Startups',
    description: 'Your AI-powered advisory board. Expert guidance on legal, finance, investor relations, and competitive analysis.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Co-Op - AI Advisory Board for Startups',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Co-Op | AI Advisory Board for Startups',
    description: 'Your AI-powered advisory board. Expert guidance on legal, finance, investor relations, and competitive analysis.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Co-Op',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
