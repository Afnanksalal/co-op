/**
 * WebView Screen
 * WebView wrapper with OAuth handling, theme detection, and full web ecosystem support
 */

import React, { useRef, useState, useCallback, useMemo, useEffect } from 'react';
import { StyleSheet, Linking, AppState, Platform, KeyboardAvoidingView } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewNavigation, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { useBackHandler, useDeepLink } from '../hooks';
import { shouldOpenExternally, isAllowedUrl, deepLinkToWebUrl } from '../utils';
import { WEB_URL, THEME_DETECTION_DELAY_MS } from '../constants';

interface WebViewScreenProps {
  onError: () => void;
}

export function WebViewScreen({ onError }: WebViewScreenProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [webViewKey, setWebViewKey] = useState(0);
  const [targetUrl, setTargetUrl] = useState(WEB_URL);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useBackHandler(webViewRef, canGoBack);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'background' && webViewRef.current) {
        webViewRef.current.clearCache?.(false);
      }
      
      // When app comes to foreground, inject script to check auth and redirect
      if (nextAppState === 'active' && webViewRef.current) {
        console.log('[WebView] App came to foreground, checking auth state');
        
        // Inject script to check localStorage for auth and redirect if logged in
        const checkAuthScript = `
          (function() {
            console.log('[WebView Inject] Checking auth state...');
            var currentPath = window.location.pathname;
            console.log('[WebView Inject] Current path:', currentPath);
            
            // Only check on login page
            if (currentPath === '/login' || currentPath === '/') {
              var keys = Object.keys(localStorage);
              for (var i = 0; i < keys.length; i++) {
                if (keys[i].includes('supabase') && keys[i].includes('auth')) {
                  try {
                    var data = JSON.parse(localStorage.getItem(keys[i]));
                    if (data && data.access_token) {
                      console.log('[WebView Inject] Found auth token, redirecting to dashboard');
                      window.location.href = '/dashboard';
                      return;
                    }
                  } catch(e) {
                    console.log('[WebView Inject] Error parsing auth:', e);
                  }
                }
              }
              console.log('[WebView Inject] No auth token found');
            }
          })();
          true;
        `;
        
        // Small delay to let the WebView settle
        setTimeout(() => {
          webViewRef.current?.injectJavaScript(checkAuthScript);
        }, 500);
      }
    });
    return () => subscription.remove();
  }, []);

  const handleDeepLink = useCallback((url: string) => {
    console.log('[WebView] ========== DEEP LINK RECEIVED ==========');
    console.log('[WebView] Raw URL:', url);
    
    const webUrl = deepLinkToWebUrl(url);
    console.log('[WebView] Converted web URL:', webUrl);
    
    if (webUrl) {
      console.log('[WebView] Updating WebView to:', webUrl);
      
      // Update state to trigger re-render
      setTargetUrl(webUrl);
      setWebViewKey(k => k + 1);
      
      // Also try direct navigation as backup
      setTimeout(() => {
        if (webViewRef.current) {
          console.log('[WebView] Injecting navigation script');
          webViewRef.current.injectJavaScript(`
            console.log('[Injected] Navigating to: ${webUrl}');
            window.location.href = '${webUrl}';
            true;
          `);
        }
      }, 100);
    } else {
      console.log('[WebView] No web URL generated, ignoring');
    }
  }, []);

  useDeepLink(handleDeepLink);

  // CSS injection - runs BEFORE content loads on EVERY page
  const injectedCSSScript = useMemo(() => {
    const top = insets.top;
    const bottom = insets.bottom;
    
    return `(function(){
      // Set CSS custom properties for safe area (works with frontend globals.css)
      document.documentElement.style.setProperty('--safe-area-top', '${top}px');
      document.documentElement.style.setProperty('--safe-area-bottom', '${bottom}px');
      
      // Add mobile-app class if not already present
      if (!document.documentElement.classList.contains('mobile-app')) {
        document.documentElement.classList.add('mobile-app');
      }
    })();true;`;
  }, [insets.top, insets.bottom]);

  // Post-load script - runs AFTER content loads
  const injectedPostLoadScript = useMemo(() => {
    const delay = THEME_DETECTION_DELAY_MS;
    
    return `(function(){
      // Prevent duplicate injection
      if(window.__COOP_POSTLOAD_INJECTED__) return;
      window.__COOP_POSTLOAD_INJECTED__ = true;
      
      // === THEME DETECTION ===
      function detectTheme(){
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:"theme",
          isDark:document.documentElement.classList.contains("dark")
        }));
      }
      setTimeout(detectTheme, ${delay});
      new MutationObserver(detectTheme).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"]
      });
      
      // === PASSIVE TOUCH LISTENERS ===
      document.addEventListener("touchstart", function(){}, {passive:true});
      document.addEventListener("touchmove", function(){}, {passive:true});
      
      // === AUTH CHECK & REDIRECT (home page only) ===
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
      
      // === NETWORK STATUS ===
      function reportNetworkStatus(){
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type:"network",
          online:navigator.onLine
        }));
      }
      window.addEventListener("online", reportNetworkStatus);
      window.addEventListener("offline", reportNetworkStatus);
      
      // === KEYBOARD HANDLING ===
      var lastHeight = window.innerHeight;
      window.addEventListener("resize", function(){
        var newHeight = window.innerHeight;
        if(newHeight < lastHeight - 100){
          setTimeout(function(){
            var el = document.activeElement;
            if(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")){
              el.scrollIntoView({behavior:"smooth", block:"center"});
            }
          }, 100);
        }
        lastHeight = newHeight;
      });
      
      // === ERROR INTERCEPTION ===
      var originalConsoleError = console.error;
      console.error = function(){
        originalConsoleError.apply(console, arguments);
        if(arguments[0] && typeof arguments[0] === "string" && arguments[0].includes("API Error")){
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type:"error",
            message:arguments[0]
          }));
        }
      };
    })();true;`;
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'theme':
          if (typeof data.isDark === 'boolean') {
            setIsDarkMode(data.isDark);
          }
          break;
        case 'network':
          // Could show native network indicator
          break;
        case 'error':
          // Could show native toast
          break;
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  const handleShouldStartLoadWithRequest = useCallback((request: { url: string }): boolean => {
    const { url } = request;
    
    // Handle OAuth providers - open in system browser
    if (shouldOpenExternally(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    
    // Block non-allowed domains for security
    if (!isAllowedUrl(url)) {
      Linking.openURL(url).catch(() => {});
      return false;
    }
    
    return true;
  }, []);

  // Re-inject CSS on each page load/navigation
  const handleLoadEnd = useCallback(() => {
    console.log('[WebView] Load ended, current URL:', targetUrl);
    // Always re-inject to handle SPA navigation
    webViewRef.current?.injectJavaScript(injectedCSSScript);
  }, [injectedCSSScript, targetUrl]);

  // Log when targetUrl or key changes
  useEffect(() => {
    console.log('[WebView] State changed - targetUrl:', targetUrl, 'key:', webViewKey);
  }, [targetUrl, webViewKey]);

  // Handle navigation state change (for SPA client-side routing)
  const handleNavigationStateChange = useCallback((navState: WebViewNavigation) => {
    setCanGoBack(navState.canGoBack);
    
    if (isInitialLoad && navState.url) {
      setIsInitialLoad(false);
    }
    
    // Re-inject CSS on every navigation (handles SPA routing)
    webViewRef.current?.injectJavaScript(injectedCSSScript);
  }, [isInitialLoad, injectedCSSScript]);

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <StatusBar 
        style={isDarkMode ? 'light' : 'dark'} 
        translucent 
        backgroundColor="transparent" 
      />
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
        
        // CSS injection - runs before content loads
        injectedJavaScriptBeforeContentLoaded={injectedCSSScript}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly
        
        // Post-load script - runs after content loads
        injectedJavaScript={injectedPostLoadScript}
        injectedJavaScriptForMainFrameOnly
        
        // === CORE ===
        javaScriptEnabled
        domStorageEnabled
        
        // === AUTH & COOKIES ===
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        
        // === FILE UPLOAD ===
        allowFileAccess
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        
        // === MEDIA ===
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        
        // === UX ===
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        
        // === PERFORMANCE ===
        cacheEnabled
        cacheMode="LOAD_DEFAULT"
        startInLoadingState={false}
        
        // === SCROLLING ===
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator
        scrollEnabled
        bounces
        overScrollMode="always"
        nestedScrollEnabled
        
        // === SECURITY ===
        javaScriptCanOpenWindowsAutomatically={false}
        mixedContentMode="compatibility"
        
        // === ANDROID SPECIFIC ===
        androidLayerType="hardware"
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        
        // === TEXT INPUT ===
        keyboardDisplayRequiresUserAction={false}
        hideKeyboardAccessoryView={false}
        
        // === USER AGENT ===
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
