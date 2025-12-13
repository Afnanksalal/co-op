'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { api } from '@/lib/api/client';
import { useUserStore } from '@/lib/store';
import type { User } from '@/lib/api/types';

export function useUser() {
  const router = useRouter();
  const { user, isLoading, setUser, setLoading, clear } = useUserStore();

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        clear();
        return null;
      }

      const userData = await api.getMe();
      setUser(userData);
      return userData;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      clear();
      return null;
    }
  }, [setUser, setLoading, clear]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    clear();
    router.push('/login');
  }, [router, clear]);

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
  const { user, isLoading, fetchUser } = useUser();

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await fetchUser();
      
      if (!userData) {
        router.push('/login');
        return;
      }

      if (options?.requireOnboarding && !userData.onboardingCompleted) {
        router.push('/onboarding');
        return;
      }
    };

    checkAuth();
  }, [fetchUser, router, options?.requireOnboarding]);

  return { user, isLoading };
}

export function useRequireAdmin() {
  const router = useRouter();
  const { user, isLoading, fetchUser } = useUser();

  useEffect(() => {
    const checkAuth = async () => {
      const userData = await fetchUser();
      
      if (!userData) {
        router.push('/login');
        return;
      }

      if (userData.role !== 'admin') {
        router.push('/dashboard');
        return;
      }
    };

    checkAuth();
  }, [fetchUser, router]);

  return { user, isLoading, isAdmin: user?.role === 'admin' };
}
