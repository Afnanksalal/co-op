'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import { CircleNotch } from '@phosphor-icons/react';

type CallbackState = 'loading' | 'error' | 'success';

/**
 * Mobile OAuth Callback Page
 * 
 * This page receives OAuth tokens via URL fragment from the mobile app deep link
 * and sets the Supabase session in the browser/WebView context.
 * 
 * Edge cases handled:
 * - Expired tokens
 * - Network errors
 * - Existing session conflicts
 * - Proper onboarding status check via API
 * - Race conditions with session propagation
 */
export default function MobileCallbackPage() {
  const router = useRouter();
  const [state, setState] = useState<CallbackState>('loading');
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double processing (React strict mode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const supabase = createClient();
      
      try {
        // Get tokens from URL fragment (hash)
        const hash = window.location.hash.substring(1);
        
        // Handle error params in hash (e.g., from OAuth denial)
        if (hash.includes('error=')) {
          const params = new URLSearchParams(hash);
          const errorMsg = params.get('error_description') || params.get('error') || 'Authentication failed';
          setError(errorMsg);
          setState('error');
          return;
        }
        
        if (!hash) {
          setError('No authentication data received. Please try signing in again.');
          setState('error');
          return;
        }

        const params = new URLSearchParams(hash);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        const expires_at = params.get('expires_at');

        if (!access_token || !refresh_token) {
          setError('Invalid authentication data. Please try signing in again.');
          setState('error');
          return;
        }

        // Check if token is already expired (edge case: slow redirect)
        if (expires_at) {
          const expiresAtMs = parseInt(expires_at) * 1000;
          if (Date.now() > expiresAtMs) {
            setError('Session expired. Please sign in again.');
            setState('error');
            return;
          }
        }

        // Clear any existing session first to avoid conflicts
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          await supabase.auth.signOut({ scope: 'local' });
        }

        // Set the new session
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        });

        if (sessionError) {
          console.error('Failed to set session:', sessionError);
          
          // Handle specific error cases
          if (sessionError.message.includes('expired') || sessionError.message.includes('invalid')) {
            setError('Session expired or invalid. Please sign in again.');
          } else if (sessionError.message.includes('network') || sessionError.message.includes('fetch')) {
            setError('Network error. Please check your connection and try again.');
          } else {
            setError(sessionError.message);
          }
          setState('error');
          return;
        }

        // Verify session was actually set
        if (!data.session || !data.user) {
          setError('Failed to establish session. Please try again.');
          setState('error');
          return;
        }

        // Clear the URL hash immediately for security
        window.history.replaceState(null, '', '/auth/mobile-callback');

        // Check onboarding status via API (more reliable than user_metadata)
        let needsOnboarding = true;
        try {
          const status = await api.getOnboardingStatus();
          needsOnboarding = !status.completed;
        } catch (apiError) {
          // If API fails, fall back to user metadata check
          console.warn('Failed to check onboarding via API, using metadata:', apiError);
          const userMeta = data.user.user_metadata || {};
          needsOnboarding = !userMeta.onboarding_completed;
        }

        setState('success');

        // Wait for session to fully propagate before redirect
        // Using a slightly longer delay for mobile WebView context
        await new Promise(resolve => setTimeout(resolve, 300));

        // Final session verification before redirect
        const { data: finalCheck } = await supabase.auth.getSession();
        if (!finalCheck.session) {
          setError('Session was not persisted. Please try again.');
          setState('error');
          return;
        }

        // Redirect based on onboarding status
        if (needsOnboarding) {
          router.replace('/onboarding');
        } else {
          router.replace('/dashboard');
        }
      } catch (err) {
        console.error('Mobile callback error:', err);
        
        // Handle network/fetch errors
        if (err instanceof TypeError && err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
        } else {
          setError('Authentication failed. Please try again.');
        }
        setState('error');
      }
    };

    handleCallback();
  }, [router]);

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
            onClick={() => router.push('/login')}
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
