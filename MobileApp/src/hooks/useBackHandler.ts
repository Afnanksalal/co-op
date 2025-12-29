// Android back button handler for WebView navigation

import { useEffect } from 'react';
import { BackHandler, Platform } from 'react-native';

export function useBackHandler(
  webViewRef: React.RefObject<{ goBack: () => void } | null>,
  canGoBack: boolean
): void {
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const handleBackPress = (): boolean => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // Prevent default back behavior
      }
      return false; // Allow default back behavior (exit app)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => subscription.remove();
  }, [canGoBack, webViewRef]);
}
