'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Spinner } from '@phosphor-icons/react';

/**
 * Mobile Login Page
 * 
 * This page runs in the SYSTEM BROWSER and initiates OAuth.
 * The key is that both OAuth initiation AND callback happen in the same browser tab,
 * so the PKCE verifier is available when exchanging the code.
 */
function MobileLoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'init' | 'processing' | 'success'>('init');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const handleAuth = async () => {
      // Check if we have an error from a previous attempt
      const errorParam = searchParams.get('error');
      if (errorParam) {
        setError(errorParam);
        return;
      }

      // Create Supabase client
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Check if we're returning from OAuth (have a code)
      const code = searchParams.get('code');
      
      if (code) {
        console.log('[MobileLogin] Got auth code, exchanging...');
        setStatus('processing');
        
        try {
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (sessionError) {
            console.error('[MobileLogin] Exchange error:', sessionError.message);
            // Trigger deep link with error
            window.location.href = `coop://auth/error?message=${encodeURIComponent(sessionError.message)}`;
            return;
          }

          if (data.session) {
            console.log('[MobileLogin] Session created!');
            setStatus('success');
            
            // Trigger deep link with tokens
            const params = new URLSearchParams({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: String(data.session.expires_at || ''),
            });
            window.location.href = `coop://auth/callback?${params.toString()}`;
            return;
          }
        } catch (err) {
          console.error('[MobileLogin] Exception:', err);
          window.location.href = 'coop://auth/error?message=exchange_failed';
          return;
        }
      }

      // Check if we already have a session
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        console.log('[MobileLogin] Already have session!');
        setStatus('success');
        const params = new URLSearchParams({
          access_token: sessionData.session.access_token,
          refresh_token: sessionData.session.refresh_token,
          expires_at: String(sessionData.session.expires_at || ''),
        });
        window.location.href = `coop://auth/callback?${params.toString()}`;
        return;
      }

      // No code and no session - start OAuth
      // IMPORTANT: Redirect back to THIS SAME PAGE so the code exchange happens here
      // where the PKCE verifier is stored
      console.log('[MobileLogin] Starting OAuth...');
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirect back to THIS page, not mobile-redirect
          redirectTo: `${window.location.origin}/auth/mobile-login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    };

    handleAuth();
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
            className="inline-block mt-4 text-primary hover:underline font-medium"
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
        <p className="text-muted-foreground">
          {status === 'init' && 'Connecting to Google...'}
          {status === 'processing' && 'Completing sign in...'}
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
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MobileLoginContent />
    </Suspense>
  );
}
