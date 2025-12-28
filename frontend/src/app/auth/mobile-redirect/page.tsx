'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Spinner } from '@phosphor-icons/react';

/**
 * Mobile Redirect Page
 * 
 * This page runs in the SYSTEM BROWSER after OAuth callback.
 * It exchanges the auth code for a session (PKCE verifier is in this browser's storage),
 * then triggers a deep link to return to the app with the tokens.
 */
function MobileRedirectContent() {
  const searchParams = useSearchParams();
  const [showManualButton, setShowManualButton] = useState(false);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'processing' | 'ready' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      // Check for error first
      const error = searchParams.get('error') || searchParams.get('error_description');
      if (error) {
        const url = `coop://auth/error?message=${encodeURIComponent(error)}`;
        setDeepLinkUrl(url);
        setStatus('ready');
        window.location.href = url;
        setTimeout(() => setShowManualButton(true), 2000);
        return;
      }

      // Check for auth code (PKCE flow)
      const code = searchParams.get('code');
      
      if (code) {
        console.log('[MobileRedirect] Got auth code, exchanging for session...');
        
        const supabase = createClient();
        
        // Exchange code for session - this works because the PKCE verifier
        // was stored in THIS browser's localStorage when OAuth started
        const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
        
        if (sessionError) {
          console.error('[MobileRedirect] Session error:', sessionError);
          const url = `coop://auth/error?message=${encodeURIComponent(sessionError.message)}`;
          setDeepLinkUrl(url);
          setErrorMessage(sessionError.message);
          setStatus('error');
          window.location.href = url;
          setTimeout(() => setShowManualButton(true), 2000);
          return;
        }

        if (data.session) {
          console.log('[MobileRedirect] Session created, triggering deep link');
          
          // Build deep link with tokens
          const params = new URLSearchParams({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            expires_at: String(data.session.expires_at || ''),
          });
          const url = `coop://auth/callback?${params.toString()}`;
          
          setDeepLinkUrl(url);
          setStatus('ready');
          
          // Trigger deep link
          window.location.href = url;
          setTimeout(() => setShowManualButton(true), 2000);
          return;
        }
      }

      // Check URL hash for tokens (implicit flow fallback)
      const hash = window.location.hash.substring(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken && refreshToken) {
          const params = new URLSearchParams({
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_at: hashParams.get('expires_at') || hashParams.get('expires_in') || '',
          });
          const url = `coop://auth/callback?${params.toString()}`;
          
          setDeepLinkUrl(url);
          setStatus('ready');
          window.location.href = url;
          setTimeout(() => setShowManualButton(true), 2000);
          return;
        }
      }

      // No code or tokens found
      console.error('[MobileRedirect] No auth code or tokens found');
      const url = 'coop://auth/error?message=auth_failed';
      setDeepLinkUrl(url);
      setErrorMessage('Authentication failed - no credentials received');
      setStatus('error');
      window.location.href = url;
      setTimeout(() => setShowManualButton(true), 2000);
    };

    handleCallback();
  }, [searchParams]);

  const handleManualOpen = () => {
    if (deepLinkUrl) {
      window.location.href = deepLinkUrl;
    }
  };

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <p className="text-destructive mb-4">{errorMessage}</p>
          <button
            onClick={handleManualOpen}
            className="text-primary hover:underline font-medium"
          >
            Return to app
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        {!showManualButton ? (
          <>
            <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              {status === 'processing' ? 'Completing sign in...' : 'Opening Co-Op app...'}
            </p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-2">Open in App</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Tap the button below to complete sign in
            </p>
            <button
              onClick={handleManualOpen}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 px-4 font-medium hover:bg-primary/90 transition-colors"
            >
              Open Co-Op App
            </button>
            <p className="text-xs text-muted-foreground mt-4">
              If the app doesn&apos;t open, make sure Co-Op is installed
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function MobileRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MobileRedirectContent />
    </Suspense>
  );
}
