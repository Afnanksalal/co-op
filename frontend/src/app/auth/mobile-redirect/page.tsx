'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Spinner } from '@phosphor-icons/react';

/**
 * Mobile Redirect Page (Legacy/Fallback)
 * 
 * This page handles any legacy redirects. The main flow now uses mobile-login.
 */
function MobileRedirectContent() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check for error
    const error = searchParams.get('error') || searchParams.get('error_description');
    if (error) {
      window.location.href = `coop://auth/error?message=${encodeURIComponent(error)}`;
      return;
    }

    // Check for tokens in query params
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      const params = new URLSearchParams({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: searchParams.get('expires_at') || '',
      });
      window.location.href = `coop://auth/callback?${params.toString()}`;
      return;
    }

    // Check hash for tokens (implicit flow)
    const hash = window.location.hash.substring(1);
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      
      if (hashAccessToken) {
        const params = new URLSearchParams({
          access_token: hashAccessToken,
          refresh_token: hashRefreshToken || '',
          expires_at: hashParams.get('expires_at') || '',
        });
        window.location.href = `coop://auth/callback?${params.toString()}`;
        return;
      }
    }

    // If we have a code, redirect to mobile-login to handle it
    const code = searchParams.get('code');
    if (code) {
      window.location.href = `/auth/mobile-login?code=${code}`;
      return;
    }

    // No credentials found
    window.location.href = 'coop://auth/error?message=no_credentials';
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Spinner weight="bold" className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign in...</p>
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
