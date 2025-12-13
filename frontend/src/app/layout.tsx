import type { Metadata } from 'next';
import { Inter, Cormorant_Garamond, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Co-Op | AI Advisory for Startups',
  description: 'AI-powered advisory platform providing expert guidance across legal, finance, investor relations, and competitive analysis.',
  keywords: ['startup', 'AI', 'advisory', 'legal', 'finance', 'investor', 'LLM'],
  authors: [{ name: 'Co-Op' }],
  openGraph: {
    title: 'Co-Op | AI Advisory for Startups',
    description: 'AI-powered advisory platform for startups',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${cormorant.variable} ${jetbrains.variable} font-sans antialiased`}>
        {/* Main content */}
        <TooltipProvider delayDuration={300}>
          {children}
        </TooltipProvider>
        
        {/* Toast notifications */}
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
      </body>
    </html>
  );
}
