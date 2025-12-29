// Deep link handler for OAuth callbacks

import { useEffect, useRef, useCallback } from 'react';
import { Linking, AppState, AppStateStatus, Platform } from 'react-native';

export function useDeepLink(onDeepLink: (url: string) => void): void {
  const appState = useRef(AppState.currentState);
  const lastProcessedUrl = useRef<string | null>(null);
  const lastProcessedTime = useRef<number>(0);

  const handleUrl = useCallback((url: string | null) => {
    if (!url) return;
    
    // Only process coop:// URLs
    if (!url.startsWith('coop://')) return;
    
    const now = Date.now();
    
    // Prevent processing the same URL within 3 seconds
    if (lastProcessedUrl.current === url && (now - lastProcessedTime.current) < 3000) {
      return;
    }
    
    lastProcessedUrl.current = url;
    lastProcessedTime.current = now;
    
    onDeepLink(url);
    
    // Clear after 10 seconds to allow re-processing
    setTimeout(() => {
      if (lastProcessedUrl.current === url) {
        lastProcessedUrl.current = null;
      }
    }, 10000);
  }, [onDeepLink]);

  useEffect(() => {
    // Handle deep link when app receives URL event
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url);
    });

    // Handle deep link when app is opened from closed state
    const checkInitialUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) handleUrl(url);
      } catch {
        // Ignore errors
      }
    };
    
    checkInitialUrl();

    // Re-check when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const prevState = appState.current;
      
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        if (Platform.OS === 'android') {
          setTimeout(async () => {
            try {
              const url = await Linking.getInitialURL();
              if (url) handleUrl(url);
            } catch {
              // Ignore errors
            }
          }, 100);
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [handleUrl]);
}
