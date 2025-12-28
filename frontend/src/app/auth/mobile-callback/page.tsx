'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CircleNotch } from '@phosphor-icons/react';

function MobileCallbackContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const handleCallback = async () => {
      const supabase = createClient();
      
      try {
        const hash = window.location.hash.substring(1);
        const hashParams = hash ? new URLSearchParams(hash) : null;
        
        const errorMsg = searchParams.get('error_description') || 
                        searchParams.get('error') ||
                        searchParams.get('message') ||
                        hashParams?.get('error');
        
        if (errorMsg) {
          setError(decodeURIComponent(errorMsg));
          return;
        }

        let accessToken = searchParams.get('access_token');
        let refreshToken = searchParams.get('refresh_token');
        
        if (!accessToken && hashParams) {
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
        
        if (accessToken) {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) {
            setError(sessionError.message);
            return;
          }

          if (data.session) {
            window.history.replaceState(null, '', '/auth/mobile-callback');
            const needsOnboarding = !data.session.user.user_metadata?.onboarding_completed;
            window.location.href = needsOnboarding ? '/onboarding' : '/dashboard';
            return;
          }
          
          setError('Failed to create session');
          return;
        }
        
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (sessionData.session) {
          const needsOnboarding = !sessionData.session.user.user_metadata?.onboarding_completed;
          window.location.href = needsOnboarding ? '/onboarding' : '/dashboard';
          return;
        }
        
        setError('No authentication data received');
      } catch (err) {
        console.error('[MobileCallback]', err);
        setError('Authentication failed');
      }
    };

    handleCallback();
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
          <button onClick={() => window.location.href = '/login'} className="text-primary hover:underline font-medium">
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
        <p className="text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function MobileCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <MobileCallbackContent />
    </Suspense>
  );
}
