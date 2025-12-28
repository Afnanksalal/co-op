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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://co-op-dev.vercel.app';

export const metadata: Metadata = {
  title: {
    default: 'Co-Op | AI Advisory Board for Startups',
    template: '%s | Co-Op',
  },
  description: 'Free AI-powered advisory board for startups. Get expert guidance on legal compliance, financial modeling, investor matching, and competitor analysis. Multiple AI models cross-validate every response for accuracy.',
  keywords: [
    'startup advisor',
    'AI advisory board',
    'startup legal advice',
    'financial modeling for startups',
    'investor matching',
    'competitor analysis tool',
    'startup tools',
    'founder tools',
    'AI startup assistant',
    'LLM council',
    'startup fundraising',
    'pitch deck review',
    'runway calculator',
    'burn rate calculator',
    'valuation calculator',
    'startup compliance',
    'free startup tools',
    'AI for founders',
    'startup mentor',
    'virtual advisory board',
  ],
  authors: [{ name: 'Co-Op', url: siteUrl }],
  creator: 'Co-Op',
  publisher: 'Co-Op',
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: 'Co-Op',
    title: 'Co-Op | AI Advisory Board for Startups',
    description: 'Free AI-powered advisory board. Expert guidance on legal, finance, investor relations, and competitive analysis. Multiple AI models ensure accurate, reliable advice.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Co-Op - AI Advisory Board for Startups',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Co-Op | AI Advisory Board for Startups',
    description: 'Free AI-powered advisory board. Expert guidance on legal, finance, investor relations, and competitive analysis.',
    images: ['/logo.png'],
    creator: '@coop_ai',
    site: '@coop_ai',
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/logo.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Co-Op',
    startupImage: '/logo.png',
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  category: 'technology',
  classification: 'Business Software',
  referrer: 'origin-when-cross-origin',
  applicationName: 'Co-Op',
  generator: 'Next.js',
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
    'msapplication-TileColor': '#0f1012',
    'msapplication-config': '/browserconfig.xml',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1012' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  colorScheme: 'dark light',
};

import { ThemeProvider } from '@/components/theme-provider';

// Script to prevent flash of wrong theme - runs before React hydration
// Also handles mobile app safe area detection
const themeScript = `
  (function() {
    try {
      var stored = localStorage.getItem('co-op-ui');
      var theme = stored ? JSON.parse(stored).state?.theme : 'system';
      var isDark = theme === 'dark' || (theme === 'system' && (window.matchMedia('(prefers-color-scheme: dark)').matches ?? true));
      if (isDark) document.documentElement.classList.add('dark');
    } catch (e) {
      document.documentElement.classList.add('dark');
    }
    
    // Detect mobile app WebView and apply safe area padding
    if (window.ReactNativeWebView || navigator.userAgent.includes('CoOpMobile')) {
      document.documentElement.classList.add('mobile-app');
      // Disable framer-motion animations in mobile app
      window.__FRAMER_MOTION_REDUCED_MOTION__ = true;
    }
  })();
`;

// JSON-LD structured data for rich search results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Co-Op',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description: 'Free AI-powered advisory board for startups. Get expert guidance on legal compliance, financial modeling, investor matching, and competitor analysis.',
  url: 'https://co-op-dev.vercel.app',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '100',
  },
  featureList: [
    'AI Legal Advisor',
    'Financial Modeling',
    'Investor Matching',
    'Competitor Analysis',
    'Runway Calculator',
    'Burn Rate Calculator',
    'Valuation Calculator',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://co-op-80fi.onrender.com" />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
            className: 'toast-mobile-safe',
          }}
          offset="60px"
        />
        <Analytics />
      </body>
    </html>
  );
}
