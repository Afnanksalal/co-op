import type { Metadata, Viewport } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  title: {
    default: 'Co-Op | Local-First Business Orchestration',
    template: '%s | Co-Op',
  },
  description:
    'Co-Op is local-first business management software with a cloud license plane, desktop activation, Ollama support, and OpenAI-compatible bring-your-own-key routing.',
  keywords: [
    'local-first business software',
    'business orchestration',
    'desktop AI software',
    'Ollama business app',
    'bring your own key AI',
    'license management software',
    'self hosted business AI',
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
    title: 'Co-Op | Local-First Business Orchestration',
    description:
      'Desktop business orchestration with local data, cloud licensing, Ollama, and OpenAI-compatible BYOK routing.',
    images: [
      {
        url: '/logo.png',
        width: 512,
        height: 512,
        alt: 'Co-Op local-first business orchestration',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'Co-Op | Local-First Business Orchestration',
    description:
      'Desktop business orchestration with local data, cloud licensing, Ollama, and BYOK routing.',
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
    icon: [{ url: '/logo.png', type: 'image/png', sizes: '512x512' }],
    apple: [{ url: '/logo.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/logo.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Co-Op',
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

// Script to prevent flash of wrong theme before React hydration.
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
  })();
`;

// JSON-LD structured data for rich search results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Co-Op',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Windows, macOS, Linux',
  description:
    'Local-first business management desktop software with cloud license control and local/BYOK model routing.',
  url: siteUrl,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Cloud license activation',
    'Local desktop runtime',
    'Ollama provider routing',
    'OpenAI-compatible bring-your-own-key support',
    'Local workflow orchestration',
  ],
};

const apiOrigin = (() => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    return new URL(apiUrl).origin;
  } catch {
    return null;
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
        {apiOrigin && <link rel="dns-prefetch" href={apiOrigin} />}
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          position="top-right"
          expand={false}
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              color: 'hsl(var(--foreground))',
            },
            duration: 4000,
          }}
          containerAriaLabel="Notifications"
        />
      </body>
    </html>
  );
}
