'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Mobile OAuth Login Page
 * 
 * This page handles Google OAuth for the mobile app. The PKCE flow requires
 * the code verifier to be in the same browser context where OAuth was initiated.
 * 
 * CRITICAL: This entire flow runs in the system browser (not WebView) to ensure
 * the PKCE code verifier persists between OAuth initiation and code exchange.
 * 
 * Flow:
 * 1. User taps "Continue with Google" in WebView
 * 2. WebView detects /auth/mobile-login and opens it in system browser
 * 3. This page clears any stale PKCE data, then initiates OAuth
 * 4. Google shows account picker → user authenticates
 * 5. Google redirects back to this page with ?code=...
 * 6. This page exchanges code for session (PKCE verifier in same browser context)
 * 7. On success, triggers deep link coop://auth/callback?tokens...
 * 8. App receives deep link → WebView loads /auth/mobile-callback to set session
 */

// Storage key used by Supabase for PKCE
const STORAGE_KEY_PREFIX = 'sb-';
const CODE_VERIFIER_STORAGE_KEY = '-auth-token-code-verifier';

function LoadingSpinner() {
  return <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />;
}

function MobileLoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'init' | 'clearing' | 'redirecting' | 'exchanging' | 'success'>('init');
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;
    processedRef.current = true;

    const handleAuth = async () => {
      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const errorDesc = searchParams.get('error_description');

      // Handle OAuth errors from Google
      if (errorParam) {
        const msg = errorDesc || errorParam;
        setError(msg);
        triggerDeepLink(`coop://auth/error?message=${encodeURIComponent(msg)}`);
        return;
      }

      // Create Supabase client
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
      const supabase = createBrowserClient(supabaseUrl, supabaseKey);

      // Extract project ref from URL for storage key
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\./)?.[1] || '';
      const codeVerifierKey = `${STORAGE_KEY_PREFIX}${projectRef}${CODE_VERIFIER_STORAGE_KEY}`;

      // Step 2: We have a code from Google - exchange it for session
      if (code) {
        setStatus('exchanging');
        
        // Debug: Check if code verifier exists
        const storedVerifier = localStorage.getItem(codeVerifierKey);
        console.log('[MobileLogin] Code exchange starting');
        console.log('[MobileLogin] Code verifier exists:', !!storedVerifier);
        console.log('[MobileLogin] Code verifier key:', codeVerifierKey);
        
        if (!storedVerifier) {
          // No code verifier - this means the OAuth was initiated in a different context
          // or localStorage was cleared. We need to restart the flow.
          console.error('[MobileLogin] No code verifier found - restarting OAuth flow');
          setError('Session expired. Please try again.');
          
          // Clear the URL and restart
          window.history.replaceState(null, '', '/auth/mobile-login');
          setTimeout(() => {
            window.location.reload();
          }, 2000);
          return;
        }
        
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (exchangeError) {
            console.error('[MobileLogin] Code exchange failed:', exchangeError.message);
            setError(exchangeError.message);
            triggerDeepLink(`coop://auth/error?message=${encodeURIComponent(exchangeError.message)}`);
            return;
          }

          if (data.session) {
            setStatus('success');
            console.log('[MobileLogin] Session obtained successfully');
            
            const params = new URLSearchParams({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: String(data.session.expires_at || ''),
            });
            
            // Clean up - clear the code verifier after successful exchange
            localStorage.removeItem(codeVerifierKey);
            
            triggerDeepLink(`coop://auth/callback?${params.toString()}`);
            return;
          }

          setError('No session returned');
          triggerDeepLink('coop://auth/error?message=no_session');
        } catch (err) {
          console.error('[MobileLogin] Exchange error:', err);
          setError('Failed to complete authentication');
          triggerDeepLink('coop://auth/error?message=exchange_failed');
        }
        return;
      }

      // Step 1: No code - initiate OAuth flow
      // First, clear any stale PKCE data to prevent conflicts
      setStatus('clearing');
      
      // Clear all Supabase auth-related data to ensure fresh PKCE flow
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_KEY_PREFIX) && 
            (key.includes('auth-token') || key.includes('code-verifier'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log('[MobileLogin] Clearing stale key:', key);
        localStorage.removeItem(key);
      });
      
      setStatus('redirecting');
      console.log('[MobileLogin] Starting OAuth flow');
      
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/mobile-login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (oauthError) {
        console.error('[MobileLogin] OAuth error:', oauthError.message);
        setError(oauthError.message);
        return;
      }

      // Debug: Verify code verifier was stored
      setTimeout(() => {
        const verifier = localStorage.getItem(codeVerifierKey);
        console.log('[MobileLogin] Code verifier stored:', !!verifier);
      }, 100);

      if (data.url) {
        console.log('[MobileLogin] Redirecting to Google');
        window.location.href = data.url;
      }
    };

    handleAuth();
  }, [searchParams]);

  const triggerDeepLink = (url: string) => {
    console.log('[MobileLogin] Triggering deep link:', url);
    // Use a longer delay to ensure the page has finished processing
    setTimeout(() => {
      window.location.href = url;
    }, 800);
  };

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
          <p className="text-muted-foreground text-sm mb-4">Returning to app...</p>
          <a href="coop://auth/error?message=auth_failed" className="text-primary hover:underline font-medium">
            Tap here if not redirected
          </a>
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
        <p className="text-muted-foreground">
          {status === 'init' && 'Initializing...'}
          {status === 'clearing' && 'Preparing...'}
          {status === 'redirecting' && 'Connecting to Google...'}
          {status === 'exchanging' && 'Completing sign in...'}
          {status === 'success' && 'Opening app...'}
        </p>
      </div>
    </div>
  );
}

export default function MobileLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <MobileLoginContent />
    </Suspense>
  );
}
