/**
 * Deep Link Handler
 * Handles app scheme and universal links for OAuth callbacks
 */

import { useEffect, useRef, useCallback } from 'react';
import { Linking, AppState, AppStateStatus, Platform } from 'react-native';

export function useDeepLink(onDeepLink: (url: string) => void): void {
  const appState = useRef(AppState.currentState);
  const lastProcessedUrl = useRef<string | null>(null);
  const lastProcessedTime = useRef<number>(0);

  const handleUrl = useCallback((url: string | null, source: string) => {
    console.log(`[DeepLink] handleUrl called from ${source}:`, url);
    
    if (!url) {
      console.log('[DeepLink] No URL received');
      return;
    }
    
    // Only process coop:// URLs
    if (!url.startsWith('coop://')) {
      console.log('[DeepLink] Not a coop:// URL, ignoring:', url);
      return;
    }
    
    const now = Date.now();
    
    // Prevent processing the same URL within 3 seconds
    if (lastProcessedUrl.current === url && (now - lastProcessedTime.current) < 3000) {
      console.log('[DeepLink] URL processed recently, skipping');
      return;
    }
    
    console.log('[DeepLink] Processing URL:', url);
    lastProcessedUrl.current = url;
    lastProcessedTime.current = now;
    
    // Call the handler
    onDeepLink(url);
    
    // Clear after 10 seconds to allow re-processing
    setTimeout(() => {
      if (lastProcessedUrl.current === url) {
        lastProcessedUrl.current = null;
      }
    }, 10000);
  }, [onDeepLink]);

  useEffect(() => {
    console.log('[DeepLink] Setting up listeners, Platform:', Platform.OS);
    
    // Handle deep link when app receives URL event (app already running)
    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      console.log('[DeepLink] ===== URL EVENT =====');
      console.log('[DeepLink] URL:', url);
      handleUrl(url, 'url_event');
    });

    // Handle deep link when app is opened from closed state
    const checkInitialUrl = async () => {
      try {
        const url = await Linking.getInitialURL();
        console.log('[DeepLink] Initial URL check:', url);
        if (url) {
          handleUrl(url, 'initial_url');
        }
      } catch (e) {
        console.log('[DeepLink] Error getting initial URL:', e);
      }
    };
    
    checkInitialUrl();

    // Re-check when app comes to foreground
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      const prevState = appState.current;
      console.log('[DeepLink] App state:', prevState, '->', nextAppState);
      
      if (prevState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('[DeepLink] App came to foreground');
        
        // On Android, we might need to check for pending intents
        // On iOS, the URL event should fire automatically
        if (Platform.OS === 'android') {
          // Small delay to let the system process the intent
          setTimeout(async () => {
            try {
              const url = await Linking.getInitialURL();
              console.log('[DeepLink] URL after foreground (Android):', url);
              if (url) {
                handleUrl(url, 'foreground_android');
              }
            } catch (e) {
              console.log('[DeepLink] Error:', e);
            }
          }, 100);
        }
      }
      
      appState.current = nextAppState;
    });

    return () => {
      console.log('[DeepLink] Cleaning up listeners');
      linkSubscription.remove();
      appStateSubscription.remove();
    };
  }, [handleUrl]);
}
