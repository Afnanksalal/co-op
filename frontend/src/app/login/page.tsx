'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Envelope, GoogleLogo, Lock } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LandingBackground } from '@/components/ui/background';
import { clearAllAuthStorage, createClient } from '@/lib/supabase/client';

function safeNext(value: string | null, fallback: string): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return fallback;
  return value;
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const errorMsg = searchParams.get('message') || searchParams.get('error');
    if (errorMsg) {
      toast.error(decodeURIComponent(errorMsg));
      window.history.replaceState(null, '', '/login');
    }

    const supabase = createClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace(safeNext(searchParams.get('next'), '/download'));
      }
    }).catch(() => undefined);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        router.replace(safeNext(searchParams.get('next'), '/download'));
      }
    });

    return () => subscription.unsubscribe();
  }, [router, searchParams]);

  async function handleGoogleSignIn() {
    setIsLoading(true);
    const supabase = createClient();
    const isTauri = typeof window !== 'undefined' && Boolean((window as unknown as { __TAURI__?: unknown }).__TAURI__);
    const next = safeNext(searchParams.get('next'), isTauri ? '/activate' : '/download');

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${isTauri ? '/auth/tauri-callback' : '/auth/callback'}?next=${encodeURIComponent(next)}`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  }

  async function handleEmailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    const supabase = createClient();
    const next = safeNext(searchParams.get('next'), '/download');

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        toast.success('Account created');
        router.replace(next);
      } else {
        toast.success('Check your email for the confirmation link');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        router.replace(next);
      }
    }

    setIsLoading(false);
  }

  async function resetLocalAuth() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut().catch(() => undefined);
    clearAllAuthStorage();
    toast.success('Local session cleared');
    setIsLoading(false);
  }

  return (
    <main className="relative flex min-h-screen bg-background">
      <LandingBackground />

      <section className="hidden w-1/2 border-r border-border/50 p-12 lg:flex lg:flex-col lg:justify-center">
        <Link href="/" className="mb-14 font-serif text-3xl font-semibold tracking-normal">
          Co-Op
        </Link>
        <div className="max-w-md space-y-6">
          <h1 className="font-serif text-5xl font-medium leading-tight tracking-normal">
            Cloud account for local-first software.
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">
            Manage licenses, downloads, payments, and device activations in the cloud while company work runs inside Co-Op Desktop.
          </p>
          <div className="space-y-3 pt-6 text-sm text-muted-foreground">
            {[
              'License ownership and billing in the control plane',
              'Device-bound desktop activation',
              'Ollama and OpenAI-compatible BYOK support',
              'Local data plane for business orchestration',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-foreground/50" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex flex-1 items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-sm animate-fade-in">
          <div className="mb-10 lg:hidden">
            <Link href="/" className="font-serif text-2xl font-semibold tracking-normal">Co-Op</Link>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-medium tracking-normal">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {isSignUp ? 'Create an account to manage licenses and downloads.' : 'Sign in to manage your license.'}
            </p>
          </div>

          <div className="space-y-6">
            <Button variant="outline" className="h-11 w-full" onClick={() => void handleGoogleSignIn()} disabled={isLoading}>
              <GoogleLogo weight="bold" className="h-5 w-5" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">Or</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Envelope className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" className="pl-10" value={email} onChange={event => setEmail(event.target.value)} required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" className="pl-10" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} />
                </div>
              </div>

              <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                {isLoading ? 'Working...' : isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight weight="bold" className="h-4 w-4" />
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-foreground hover:underline">
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>

            <button type="button" onClick={() => void resetLocalAuth()} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
              Clear this browser session
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
