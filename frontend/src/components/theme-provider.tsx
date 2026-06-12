'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/store';

/**
 * Theme Provider - Applies theme globally across all pages
 * Uses zustand persist to maintain theme preference
 * Priority: system -> dark -> light (dark is fallback if system detection fails)
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUIStore();

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    if (new URLSearchParams(window.location.search).get('screenshot') === '1') {
      applyTheme(true);
      return;
    }

    if (theme === 'system') {
      // Try to detect system theme, default to dark if detection fails
      try {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        // If matchMedia is not supported or returns no preference, default to dark
        const prefersDark = mediaQuery.matches ?? true;
        applyTheme(prefersDark);

        const handler = (e: MediaQueryListEvent) => applyTheme(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
      } catch {
        // If system theme detection fails, default to dark
        applyTheme(true);
      }
    } else {
      applyTheme(theme === 'dark');
    }
  }, [theme]);

  return <>{children}</>;
}
