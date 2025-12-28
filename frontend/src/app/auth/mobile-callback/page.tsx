'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import { Spinner } from '@phosphor-icons/react';

type CallbackState = 'loading' | 'error' | 'success';

/**
 * Mobile OAuth Callback Page
 * 
 * Handles OAuth callback for mobile app. For implicit flow, tokens come in URL fragment.
 * For redirects from mobile-redirect, tokens come in query params.
 */
function MobileCallbackContent() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const supabase = createClient();
      
      try {
        console.log('[MobileCallback] Processing callback');
        console.log('[MobileCallback] Full URL:', window.location.href);
        
        // Check for error in query params or hash
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        
        const errorMsg = searchParams.get('error_description') || 
                        searchParams.get('error') ||
                        hashParams.get('error_description') ||
                        hashParams.get('error');
        
        if (errorMsg) {
          console.error('[MobileCallback] Error:', errorMsg);
          setError(errorMsg);
          setState('error');
          return;
        }

        // Try to get tokens from query params first (from mobile-redirect)
        let accessToken = searchParams.get('access_token');
        let refreshToken = searchParams.get('refresh_token');
        
        // If not in query params, try URL fragment (implicit flow)
        if (!accessToken && hash) {
          console.log('[MobileCallback] Checking URL fragment for tokens');
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
        
        // If still no tokens, check if we already have a session
        if (!accessToken) {
          console.log('[MobileCallback] No tokens found, checking existing session...');
          
          // Give Supabase a moment to process
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            console.log('[MobileCallback] Existing session found!');
            setState('success');
            await redirectToDashboard(sessionData.session);
            return;
          }
          
          console.error('[MobileCallback] No tokens and no session');
          setError('No authentication data received');
          setState('error');
          return;
        }

        console.log('[MobileCallback] Setting session with tokens');
        
        // Set the session manually - this persists to localStorage
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('[MobileCallback] Session error:', sessionError);
          setError(sessionError.message);
          setState('error');
          return;
        }

        if (!data.session) {
          console.error('[MobileCallback] No session created');
          setError('Failed to create session');
          setState('error');
          return;
        }

        console.log('[MobileCallback] Session created successfully');
        
        // Clear URL for security
        window.history.replaceState(null, '', '/auth/mobile-callback');

        setState('success');
        await redirectToDashboard(data.session);
        
      } catch (err) {
        console.error('[MobileCallback] Error:', err);
        setError('Authentication failed');
        setState('error');
      }
    };

    const redirectToDashboard = async (session: { user: { user_metadata?: { onboarding_completed?: boolean } } }) => {
      // Check onboarding status
      let needsOnboarding = true;
      try {
        const status = await api.getOnboardingStatus();
        needsOnboarding = !status.completed;
      } catch {
        needsOnboarding = !session.user.user_metadata?.onboarding_completed;
      }

      // Small delay to ensure session is persisted
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate to appropriate page
      window.location.href = needsOnboarding ? '/onboarding' : '/dashboard';
    };

    handleCallback();
  }, [searchParams]);

  if (state === 'error') {
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
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {state === 'success' ? 'Redirecting to dashboard...' : 'Completing sign in...'}
        </p>
      </div>
    </div>
  );
}

export default function MobileCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MobileCallbackContent />
    </Suspense>
  );
}
