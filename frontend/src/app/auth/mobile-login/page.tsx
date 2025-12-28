'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@phosphor-icons/react';

/**
 * Mobile Login Page
 * 
 * This page runs in the SYSTEM BROWSER (not WebView) and initiates the OAuth flow.
 * Since the entire flow happens in the browser, the PKCE code verifier is stored
 * and retrieved from the same context, avoiding the WebView/browser mismatch.
 */
function MobileLoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const startOAuth = async () => {
      const supabase = createClient();
      
      // Check if we have an error from a previous attempt
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(errorParam);
        return;
      }

      // Start OAuth flow - this will redirect to Google
      // After Google auth, Supabase redirects to /auth/mobile-redirect
      // The code verifier is stored in THIS browser's localStorage
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/mobile-redirect`,
        },
      });

      if (error) {
        setError(error.message);
      }
    };

    startOAuth();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-destructive mb-4">{error}</p>
          <a
            href="coop://auth/error?message=auth_failed"
            className="text-primary hover:underline font-medium"
          >
            Return to app
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting to Google...</p>
      </div>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MobileLoginContent />
    </Suspense>
  );
}
