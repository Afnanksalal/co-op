'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Envelope, Lock, ArrowRight, GoogleLogo, CircleNotch } from '@phosphor-icons/react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LandingBackground } from '@/components/ui/background';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
      }
    };
    checkSession();

    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, searchParams]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const supabase = createClient();

    // Check if in mobile app
    const isMobileApp = typeof window !== 'undefined' && 
      (document.documentElement.classList.contains('mobile-app') ||
       navigator.userAgent.includes('CoOpMobile'));

    if (isMobileApp) {
      // For mobile: Open the mobile-login page in system browser
      // This page will initiate OAuth, and the entire flow happens in the browser
      // avoiding the PKCE code verifier mismatch between WebView and browser
      window.location.href = `${window.location.origin}/auth/mobile-login`;
      return;
    }

    // For web: Use standard PKCE flow
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const supabase = createClient();

    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        toast.success('Account created successfully!');
        router.push('/onboarding');
      } else if (data.user && !data.session) {
        toast.success('Check your email for the confirmation link');
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(error.message);
      } else {
        const next = searchParams.get('next') || '/dashboard';
        router.push(next);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex relative">
      <LandingBackground />

      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-border/40">
        <div className="relative z-10 flex flex-col justify-center px-16">
          <Link href="/" className="mb-16">
            <span className="font-serif text-3xl font-semibold tracking-tight">Co-Op</span>
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <h1 className="font-serif text-5xl font-medium tracking-tight mb-6 leading-[1.1]">
              Your AI
              <br />
              Advisory Board
            </h1>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              Expert guidance for founders at every stage. Legal, finance, investor relations, and competitive analysis.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-16 space-y-4"
          >
            {[
              'Built for serial founders & first-time entrepreneurs',
              'Multiple AI models cross-validate responses',
              'Real-time web research for market intelligence',
              'Curated knowledge base for legal & finance',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1 h-1 rounded-full bg-foreground/40" />
                <span className="text-muted-foreground text-sm">{feature}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="lg:hidden mb-10">
            <Link href="/">
              <span className="font-serif text-2xl font-semibold tracking-tight">Co-Op</span>
            </Link>
          </div>

          <div className="mb-8">
            <h2 className="font-serif text-3xl font-medium tracking-tight mb-2">
              {isSignUp ? 'Create account' : 'Welcome back'}
            </h2>
            <p className="text-muted-foreground text-sm">
              {isSignUp ? 'Start your journey with AI-powered advisory' : 'Sign in to continue'}
            </p>
          </div>

          <div className="space-y-6">
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <GoogleLogo weight="bold" className="w-5 h-5" />
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-3 text-muted-foreground">Or</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Envelope weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock weight="regular" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full h-11" disabled={isLoading}>
                {isLoading ? 'Loading...' : isSignUp ? 'Create Account' : 'Sign In'}
                <ArrowRight weight="bold" className="w-4 h-4" />
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-foreground hover:underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <CircleNotch weight="bold" className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
