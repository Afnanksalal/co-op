'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Mobile Auth Callback Page
 * 
 * This page runs inside the WebView after receiving a deep link from the
 * system browser. It receives the access/refresh tokens and sets them
 * in the WebView's localStorage, then redirects to the dashboard.
 */

function LoadingSpinner() {
  return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
}

function MobileCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      // Check for error messages
      const errorMsg = searchParams.get('error') || 
                       searchParams.get('error_description') || 
                       searchParams.get('message');
      
      if (errorMsg && !searchParams.get('access_token')) {
        setError(decodeURIComponent(errorMsg));
        return;
      }

      // Get tokens from URL params
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken) {
        setError('No authentication data received');
        return;
      }

      try {
        const supabase = createClient();
        
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          setError(sessionError.message);
          return;
        }

        if (data.session) {
          // Clear URL params for security
          window.history.replaceState(null, '', '/auth/mobile-callback');
          
          // Redirect based on onboarding status
          const needsOnboarding = !data.session.user.user_metadata?.onboarding_completed;
          window.location.href = needsOnboarding ? '/onboarding' : '/dashboard';
          return;
        }

        setError('Failed to create session');
      } catch (err) {
        console.error('[MobileCallback]', err);
        setError('Authentication failed');
      }
    };

    handleCallback();
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
          <button 
            onClick={() => window.location.href = '/login'} 
            className="text-primary hover:underline font-medium"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4">
          <LoadingSpinner />
        </div>
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function MobileCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <MobileCallbackContent />
    </Suspense>
  );
}
