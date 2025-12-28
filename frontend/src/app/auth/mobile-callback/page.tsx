'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient, clearAllAuthStorage } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import Link from 'next/link';

/**
 * Mobile Auth Callback Page
 * 
 * Runs inside WebView after receiving deep link from system browser.
 * Sets session in WebView's localStorage and redirects to dashboard.
 * 
 * SECURITY: Clears any existing session before setting new one to prevent
 * session mixing between different users.
 */

function MobileCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleCallback = async () => {
      const errorMsg = searchParams.get('error') || 
                       searchParams.get('error_description') || 
                       searchParams.get('message');
      
      if (errorMsg && !searchParams.get('access_token')) {
        setError(decodeURIComponent(errorMsg));
        return;
      }

      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');

      if (!accessToken) {
        setError('No authentication data received');
        return;
      }

      try {
        // SECURITY: Clear any existing session before setting new one
        // This prevents session mixing between different users
        clearAllAuthStorage();
        
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
          // SECURITY: Store user ID for session integrity validation
          if (data.session.user?.id) {
            localStorage.setItem('coop-current-user-id', data.session.user.id);
          }
          
          window.history.replaceState(null, '', '/auth/mobile-callback');
          
          // Check onboarding status from API (database) instead of user_metadata
          try {
            const status = await api.getOnboardingStatus();
            window.location.href = status.completed ? '/dashboard' : '/onboarding';
          } catch {
            // If API fails, default to onboarding for new users
            window.location.href = '/onboarding';
          }
          return;
        }

        setError('Failed to create session');
      } catch {
        setError('Authentication failed');
      }
    };

    handleCallback();
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Link href="/" className="mb-8">
          <span className="font-serif text-2xl font-semibold tracking-tight">Co-Op</span>
        </Link>
        
        <div className="w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-5">
            <svg className="w-7 h-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="font-serif text-xl font-medium mb-2">Authentication Failed</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button 
            onClick={() => window.location.href = '/login'} 
            className="text-sm text-primary hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8">
        <span className="font-serif text-2xl font-semibold tracking-tight">Co-Op</span>
      </Link>
      
      <div className="w-full max-w-sm text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-5" />
        <p className="text-muted-foreground text-sm">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function MobileCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <span className="font-serif text-2xl font-semibold tracking-tight mb-8">Co-Op</span>
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <MobileCallbackContent />
    </Suspense>
  );
}
