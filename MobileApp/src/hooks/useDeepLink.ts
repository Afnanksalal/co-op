/**
 * Deep Link Handler
 * Handles app scheme and universal links for OAuth callbacks
 */

import { useEffect, useRef, useCallback } from 'react';
import { Linking, AppState, AppStateStatus } from 'react-native';

export function useDeepLink(onDeepLink: (url: string) => void): void {
  const appState = useRef(AppState.currentState);
  const lastProcessedUrl = useRef<string | null>(null);

  // Memoize the handler to prevent unnecessary re-subscriptions
  const handleUrl = useCallback((url: string | null) => {
    if (!url) return;
    
    // Prevent processing the same URL twice (can happen with app state changes)
    if (lastProcessedUrl.current === url) return;
    lastProcessedUrl.current = url;
    
    // Reset after a short delay to allow re-processing if user tries again
    setTimeout(() => {
      if (lastProcessedUrl.current === url) {
        lastProcessedUrl.current = null;
      }
    }, 2000);
    
    onDeepLink(url);
  }, [onDeepLink]);

  useEffect(() => {
    // Handle deep link when app is already open
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Handle deep link when app is opened from closed state
    Linking.getInitialURL().then(handleUrl);

    // Re-check for deep links when app comes to foreground
    // This handles OAuth callbacks that might have been missed
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // Small delay to ensure the deep link is available
        setTimeout(() => {
          Linking.getInitialURL().then(handleUrl);
        }, 100);
      }
      appState.current = nextAppState;
    });

    return () => {
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [handleUrl]);
}
