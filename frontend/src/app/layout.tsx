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

const configuredSiteUrl = process.env.NEXT_PUBLIC_APP_URL;
const isLocalSiteUrl =
  configuredSiteUrl?.includes('localhost') || configuredSiteUrl?.includes('127.0.0.1');
const siteUrl =
  process.env.NODE_ENV === 'production' && isLocalSiteUrl
    ? 'https://co-op.software'
    : configuredSiteUrl || 'https://co-op.software';
const productName = 'Co-Op';
const productTitle = 'Co-Op | Local-First Business Management Software';
const productDescription =
  'Co-Op is local-first desktop software for managing company context, plans, research, customer follow-up, and business decisions with cloud license access.';

export const metadata: Metadata = {
  title: {
    default: productTitle,
    template: '%s | Co-Op',
  },
  description: productDescription,
  keywords: [
    'local-first business software',
    'business management software',
    'desktop business software',
    'private company workspace',
    'business planning software',
    'customer follow-up software',
    'private assistant business software',
    'bring your own key business software',
    'license management software',
  ],
  authors: [{ name: productName, url: siteUrl }],
  creator: productName,
  publisher: productName,
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    siteName: productName,
    title: productTitle,
    description: productDescription,
    images: [
      {
        url: '/software-dashboard.png',
        width: 1280,
        height: 720,
        alt: 'Co-Op desktop dashboard showing company context, files, plans, customers, and research',
        type: 'image/png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: productTitle,
    description: productDescription,
    images: ['/software-dashboard.png'],
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
    'application-name': productName,
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

const jsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: productName,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: productName,
    url: siteUrl,
    description: productDescription,
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: productName,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Windows, macOS, Linux',
    description: productDescription,
    url: siteUrl,
    image: `${siteUrl}/software-dashboard.png`,
    softwareVersion: '1.0.0',
    featureList: [
      'Local desktop workspace',
      'Cloud license activation',
      'Company file context',
      'Business planning and research',
      'Customer follow-up workflows',
      'Private assistant and provider settings',
    ],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Where does company work happen in Co-Op?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Company work happens in the desktop app. The cloud account manages identity, downloads, license access, activation, and license status checks.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can Co-Op use local or private AI providers?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Co-Op can use a local assistant or a private provider configured by the customer.',
        },
      },
    ],
  },
];

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
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
        />
        <link rel="alternate" type="text/plain" href="/llms.txt" title="llms.txt" />
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
