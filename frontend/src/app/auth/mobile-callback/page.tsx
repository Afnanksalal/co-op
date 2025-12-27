'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import { CircleNotch } from '@phosphor-icons/react';

type CallbackState = 'loading' | 'error' | 'success';

/**
 * Mobile OAuth Callback Page
 * 
 * Handles OAuth callback for mobile app. Receives tokens via URL fragment
 * (implicit flow) and establishes the Supabase session.
 */
export default function MobileCallbackPage() {
  const [state, setState] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const supabase = createClient();
      
      try {
        // Get the full URL including hash
        const fullUrl = window.location.href;
        const hash = window.location.hash.substring(1);
        
        console.log('[MobileCallback] Processing callback');
        console.log('[MobileCallback] URL:', fullUrl.substring(0, 100));
        
        // Check for error in hash or query params
        const hashParams = new URLSearchParams(hash);
        const queryParams = new URLSearchParams(window.location.search);
        
        const errorMsg = hashParams.get('error_description') || 
                        hashParams.get('error') || 
                        queryParams.get('error_description') ||
                        queryParams.get('error');
        
        if (errorMsg) {
          console.error('[MobileCallback] Error:', errorMsg);
          setError(errorMsg);
          setState('error');
          return;
        }

        // Try to get tokens from hash (implicit flow)
        let accessToken = hashParams.get('access_token');
        let refreshToken = hashParams.get('refresh_token');
        
        // If no tokens in hash, Supabase might have already processed them
        // Check if we have a session
        if (!accessToken) {
          console.log('[MobileCallback] No tokens in hash, checking session...');
          
          // Give Supabase a moment to process the hash
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (sessionData.session) {
            console.log('[MobileCallback] Session found!');
            setState('success');
            
            // Check onboarding
            let needsOnboarding = true;
            try {
              const status = await api.getOnboardingStatus();
              needsOnboarding = !status.completed;
            } catch {
              needsOnboarding = !sessionData.session.user.user_metadata?.onboarding_completed;
            }
            
            window.location.href = needsOnboarding ? '/onboarding' : '/dashboard';
            return;
          }
          
          console.error('[MobileCallback] No tokens and no session');
          setError('No authentication data received');
          setState('error');
          return;
        }

        console.log('[MobileCallback] Setting session with tokens');
        
        // Set the session manually
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
        
        // Clear URL hash
        window.history.replaceState(null, '', '/auth/mobile-callback');

        // Check onboarding
        let needsOnboarding = true;
        try {
          const status = await api.getOnboardingStatus();
          needsOnboarding = !status.completed;
        } catch {
          needsOnboarding = !data.session.user.user_metadata?.onboarding_completed;
        }

        setState('success');
        
        // Redirect
        await new Promise(resolve => setTimeout(resolve, 300));
        window.location.href = needsOnboarding ? '/onboarding' : '/dashboard';
        
      } catch (err) {
        console.error('[MobileCallback] Error:', err);
        setError('Authentication failed');
        setState('error');
      }
    };

    handleCallback();
  }, []);

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
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">
          {state === 'success' ? 'Redirecting...' : 'Completing sign in...'}
        </p>
      </div>
    </div>
  );
}
