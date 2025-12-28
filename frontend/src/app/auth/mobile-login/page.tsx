'use client';

import { useEffect, useState, Suspense, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CircleNotch } from '@phosphor-icons/react';

function MobileLoginContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'init' | 'processing' | 'success'>('init');
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const handleAuth = async () => {
      try {
        const errorParam = searchParams.get('error');
        const errorDesc = searchParams.get('error_description');
        
        if (errorParam) {
          const msg = errorDesc || errorParam;
          setError(msg);
          setTimeout(() => {
            window.location.href = `coop://auth/error?message=${encodeURIComponent(msg)}`;
          }, 2000);
          return;
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const code = searchParams.get('code');
        
        if (code) {
          setStatus('processing');
          
          const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);
          
          if (sessionError) {
            setError(sessionError.message);
            setTimeout(() => {
              window.location.href = `coop://auth/error?message=${encodeURIComponent(sessionError.message)}`;
            }, 1500);
            return;
          }

          if (data.session) {
            setStatus('success');
            const params = new URLSearchParams({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
              expires_at: String(data.session.expires_at || ''),
            });
            setTimeout(() => {
              window.location.href = `coop://auth/callback?${params.toString()}`;
            }, 500);
            return;
          }
          
          setError('Failed to create session');
          return;
        }

        await supabase.auth.signOut();
        
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
          setError(oauthError.message);
          return;
        }

        if (data.url) {
          window.location.href = data.url;
        }
      } catch (err) {
        console.error('[MobileLogin]', err);
        setError('An unexpected error occurred');
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
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
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
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MobileLoginContent />
    </Suspense>
  );
}
