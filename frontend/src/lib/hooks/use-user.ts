'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, clearAllAuthStorage, validateSessionIntegrity, clearSupabaseClient } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import { useUserStore, useSessionStore, useChatStore } from '@/lib/store';

export function useUser() {
  const router = useRouter();
  const { user, isLoading, setUser, setLoading, clear } = useUserStore();
  const clearSessions = useSessionStore((state) => state.clear);
  const clearChat = useChatStore((state) => state.clearMessages);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      // SECURITY: Validate session integrity before fetching user
      const isValid = await validateSessionIntegrity();
      if (!isValid) {
        console.warn('Session integrity check failed - forcing re-login');
        clear();
        clearSessions();
        clearChat();
        router.push('/login?error=session_invalid');
        return null;
      }

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        clear();
        return null;
      }

      const userData = await api.getMe();
      
      // SECURITY: Store user ID for session integrity validation
      if (typeof window !== 'undefined' && userData?.id) {
        localStorage.setItem('coop-current-user-id', userData.id);
      }
      
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      clear();
      return null;
    }
  }, [setUser, setLoading, clear, clearSessions, clearChat, router]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    
    // Check if in mobile app
    const isMobileApp = typeof window !== 'undefined' && 
      (document.documentElement.classList.contains('mobile-app') ||
       navigator.userAgent.includes('CoOpMobile'));
    
    try {
      // Try to invalidate token on backend first
      await api.logout().catch(() => {});
    } catch {
      // Ignore backend logout errors
    }
    
    await supabase.auth.signOut();
    
    // SECURITY: Clear ALL auth-related storage to prevent session leakage
    clearAllAuthStorage();
    clearSupabaseClient();
    
    // Clear all app state
    clear();
    clearSessions();
    clearChat();
    
    if (isMobileApp) {
      // For mobile: Open logout page in system browser to clear browser session
      window.location.href = `${window.location.origin}/auth/mobile-logout`;
    } else {
      router.push('/');
    }
  }, [router, clear, clearSessions, clearChat]);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to refresh user:', error);
      return null;
    }
  }, [setUser]);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    hasCompletedOnboarding: user?.onboardingCompleted ?? false,
    startup: user?.startup ?? null,
    fetchUser,
    refreshUser,
    signOut,
  };
}

export function useRequireAuth(options?: { requireOnboarding?: boolean }) {
  const router = useRouter();
  const { user, fetchUser } = useUser();
  const hasChecked = useRef(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    
    const checkAuth = async () => {
      try {
        const userData = await fetchUser();
        
        if (!userData) {
          router.push('/login');
          return;
        }

        if (options?.requireOnboarding && !userData.onboardingCompleted) {
          router.push('/onboarding');
          return;
        }
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, isLoading };
}

export function useRequireAdmin() {
  const router = useRouter();
  const hasChecked = useRef(false);
  const [state, setState] = useState<{
    isLoading: boolean;
    isAdmin: boolean;
    user: Awaited<ReturnType<typeof api.getMe>> | null;
  }>({ isLoading: true, isAdmin: false, user: null });

  useEffect(() => {
    if (hasChecked.current) return;
    hasChecked.current = true;
    
    const checkAuth = async () => {
      try {
        // SECURITY: Validate session integrity first
        const { validateSessionIntegrity, clearAllAuthStorage } = await import('@/lib/supabase/client');
        const isValid = await validateSessionIntegrity();
        if (!isValid) {
          clearAllAuthStorage();
          setState({ isLoading: false, isAdmin: false, user: null });
          router.push('/login?error=session_invalid');
          return;
        }

        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setState({ isLoading: false, isAdmin: false, user: null });
          router.push('/login');
          return;
        }

        const userData = await api.getMe();
        
        // SECURITY: Store user ID for session integrity validation
        if (typeof window !== 'undefined' && userData?.id) {
          localStorage.setItem('coop-current-user-id', userData.id);
        }
        
        if (userData.role !== 'admin') {
          setState({ isLoading: false, isAdmin: false, user: userData });
          router.push('/dashboard');
          return;
        }
        
        setState({ isLoading: false, isAdmin: true, user: userData });
      } catch {
        setState({ isLoading: false, isAdmin: false, user: null });
        router.push('/login');
      }
    };

    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return state;
}
