'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Suspense } from 'react';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (error) {
        setStatus('error');
        setErrorMessage(errorDescription || error);
        setTimeout(() => router.replace(`/login?error=${encodeURIComponent(errorDescription || error)}`), 2000);
        return;
      }

      if (!code) {
        setStatus('error');
        setErrorMessage('No authorization code received');
        setTimeout(() => router.replace('/login?error=auth_failed'), 2000);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          setStatus('error');
          setErrorMessage(exchangeError.message);
          setTimeout(() => router.replace(`/login?error=${encodeURIComponent(exchangeError.message)}`), 2000);
          return;
        }

        if (data.session) {
          // Store user ID for session integrity validation
          if (data.session.user?.id) {
            localStorage.setItem('coop-current-user-id', data.session.user.id);
          }

          const requestedNext = searchParams.get('next');
          const next = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/activate';
          router.replace(next);
        } else {
          setStatus('error');
          setErrorMessage('Session exchange failed');
          setTimeout(() => router.replace('/login?error=auth_failed'), 2000);
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Authentication failed');
        setTimeout(() => router.replace('/login?error=auth_failed'), 2000);
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      {status === 'processing' ? (
        <>
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Completing sign in...</p>
        </>
      ) : (
        <>
          <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
            <span className="text-destructive text-lg">✕</span>
          </div>
          <p className="text-muted-foreground text-sm">{errorMessage}</p>
          <p className="text-muted-foreground text-xs">Redirecting to login...</p>
        </>
      )}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
