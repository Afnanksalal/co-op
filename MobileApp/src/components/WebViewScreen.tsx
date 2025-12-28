import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, Linking, AppState, Platform, KeyboardAvoidingView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useBackHandler, useDeepLink } from '../hooks';
import { shouldOpenExternally, isAllowedUrl, deepLinkToWebUrl } from '../utils';
import { WEB_URL, THEME_DETECTION_DELAY_MS } from '../constants';

interface Props {
  onError: () => void;
}

export function WebViewScreen({ onError }: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [webViewKey, setWebViewKey] = useState(0);
  const [targetUrl, setTargetUrl] = useState(WEB_URL);
  const [shouldClearStorage, setShouldClearStorage] = useState(false);

  useBackHandler(webViewRef, canGoBack);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && webViewRef.current) {
        webViewRef.current.injectJavaScript(`
          (function() {
            if (window.location.pathname === '/login' || window.location.pathname === '/') {
              var keys = Object.keys(localStorage);
              for (var i = 0; i < keys.length; i++) {
                if (keys[i].includes('supabase') && keys[i].includes('auth')) {
                  try {
                    var data = JSON.parse(localStorage.getItem(keys[i]));
                    if (data && data.access_token) {
                      window.location.href = '/dashboard';
                      return;
                    }
                  } catch(e) {}
                }
              }
            }
          })();
          true;
        `);
      }
    });
    return () => subscription.remove();
  }, []);

  const handleDeepLink = useCallback((url: string) => {
    const webUrl = deepLinkToWebUrl(url);
    if (webUrl) {
      // Check if this is a logout completion - need to clear WebView storage
      if (url.includes('logout/complete')) {
        setShouldClearStorage(true);
      }
      setTargetUrl(webUrl);
      setWebViewKey(k => k + 1);
    }
  }, []);

  useDeepLink(handleDeepLink);

  const injectedCSSScript = useMemo(() => `
    (function(){
      document.documentElement.style.setProperty('--safe-area-top', '${insets.top}px');
      document.documentElement.style.setProperty('--safe-area-bottom', '${insets.bottom}px');
      if (!document.documentElement.classList.contains('mobile-app')) {
        document.documentElement.classList.add('mobile-app');
      }
      ${shouldClearStorage ? `
        // Clear all auth-related storage after logout
        var keys = Object.keys(localStorage);
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (key.includes('supabase') || key.includes('sb-') || key.includes('pkce') || key.includes('code_verifier') || key.includes('auth')) {
            localStorage.removeItem(key);
          }
        }
        sessionStorage.clear();
      ` : ''}
    })();true;
  `, [insets.top, insets.bottom, shouldClearStorage]);

  const injectedPostLoadScript = useMemo(() => `
    (function(){
      if(window.__COOP_INJECTED__) return;
      window.__COOP_INJECTED__ = true;
      
      function detectTheme(){
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:"theme",
          isDark:document.documentElement.classList.contains("dark")
        }));
      }
      setTimeout(detectTheme, ${THEME_DETECTION_DELAY_MS});
      new MutationObserver(detectTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"]
      });
      
      document.addEventListener("touchstart", function(){}, {passive:true});
      document.addEventListener("touchmove", function(){}, {passive:true});
      
      if(window.location.pathname === "/" || window.location.pathname === ""){
        setTimeout(function(){
          var keys = Object.keys(localStorage);
          for(var i=0; i<keys.length; i++){
            if(keys[i].includes("supabase") && keys[i].includes("auth")){
              try{
                var data = JSON.parse(localStorage.getItem(keys[i]));
                if(data && data.access_token){
                  window.location.href = "/dashboard";
                  return;
                }
              }catch(e){}
            }
          }
        }, 500);
      }
    })();true;
  `, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'theme' && typeof data.isDark === 'boolean') {
        setIsDarkMode(data.isDark);
      }
    } catch {}
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }): boolean => {
    const { url } = request;
    
    if (shouldOpenExternally(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    
    if (!isAllowedUrl(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    
    return true;
  }, []);

  const handleLoadEnd = useCallback(() => {
    webViewRef.current?.injectJavaScript(injectedCSSScript);
    // Reset the clear storage flag after it's been applied
    if (shouldClearStorage) {
      setShouldClearStorage(false);
    }
  }, [injectedCSSScript, shouldClearStorage]);

  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    webViewRef.current?.injectJavaScript(injectedCSSScript);
  }, [injectedCSSScript]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={isDarkMode ? 'light' : 'dark'} translucent backgroundColor="transparent" />
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ uri: targetUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onError={onError}
        onHttpError={onError}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onLoadEnd={handleLoadEnd}
        injectedJavaScriptBeforeContentLoaded={injectedCSSScript}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        injectedJavaScript={injectedPostLoadScript}
        injectedJavaScriptForMainFrameOnly
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        allowFileAccess
        allowsInlineMediaPlayback
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        cacheEnabled
        showsVerticalScrollIndicator
        scrollEnabled
        bounces
        nestedScrollEnabled
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="compatibility"
        androidLayerType="hardware"
        keyboardDisplayRequiresUserAction={false}
        applicationNameForUserAgent="CoOpMobile/1.0"
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1012',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});
