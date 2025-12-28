/**
 * URL Utilities
 * Security-focused URL validation and manipulation
 */

import { OAUTH_DOMAINS, ALLOWED_DOMAINS, APP_SCHEME, WEB_URL, EXTERNAL_AUTH_PATHS } from '../constants';

/**
 * Check if URL should open in external browser (OAuth flows)
 */
export function shouldOpenExternally(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Google OAuth MUST open in system browser (Google blocks WebView)
    if (OAUTH_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      return true;
    }
    
    // Check if it's an auth path that needs to open externally
    if (ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      // Check if it's a path that should open in system browser
      if (EXTERNAL_AUTH_PATHS.some(path => urlObj.pathname.startsWith(path))) {
        return true;
      }
      return false;
    }
    
    // Open other external links in browser
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if URL is allowed for WebView navigation (security)
 */
export function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Allow blob URLs for file downloads
    if (urlObj.protocol === 'blob:') {
      return true;
    }
    
    // Allow data URLs for inline content
    if (urlObj.protocol === 'data:') {
      return true;
    }
    
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Parse auth tokens from deep link URL
 */
export function parseAuthTokensFromDeepLink(deepLink: string): {
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
} | null {
  try {
    // Check if this is an auth callback
    if (!deepLink.includes('auth/callback')) {
      return null;
    }
    
    // Try query params first (new format)
    const queryIndex = deepLink.indexOf('?');
    if (queryIndex !== -1) {
      const query = deepLink.substring(queryIndex + 1);
      const params = new URLSearchParams(query);
      
      const error = params.get('error');
      if (error) {
        return {
          error,
          error_description: params.get('error_description') || undefined,
        };
      }
      
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      
      if (access_token && refresh_token) {
        return {
          access_token,
          refresh_token,
          expires_at: params.get('expires_at') || undefined,
          token_type: params.get('token_type') || 'bearer',
        };
      }
    }
    
    // Fallback: try hash fragment (legacy format)
    const hashIndex = deepLink.indexOf('#');
    if (hashIndex !== -1) {
      const fragment = deepLink.substring(hashIndex + 1);
      const params = new URLSearchParams(fragment);
      
      const error = params.get('error');
      if (error) {
        return {
          error,
          error_description: params.get('error_description') || undefined,
        };
      }
      
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      
      if (access_token && refresh_token) {
        return {
          access_token,
          refresh_token,
          expires_at: params.get('expires_at') || undefined,
          token_type: params.get('token_type') || 'bearer',
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if a deep link is an auth-related callback
 */
export function isAuthDeepLink(deepLink: string): boolean {
  return deepLink.includes('auth/callback') || deepLink.includes('auth/error');
}

/**
 * Convert deep link to web URL for WebView navigation
 */
export function deepLinkToWebUrl(deepLink: string): string | null {
  console.log('[URL] Converting deep link:', deepLink);
  
  try {
    if (!deepLink.startsWith(`${APP_SCHEME}://`)) {
      console.log('[URL] Not a coop:// URL');
      return null;
    }
    
    // Extract everything after coop://
    const afterScheme = deepLink.substring(`${APP_SCHEME}://`.length);
    console.log('[URL] After scheme:', afterScheme);
    
    // For auth/callback, pass tokens via query params to mobile-callback page
    if (afterScheme.startsWith('auth/callback')) {
      const queryIndex = deepLink.indexOf('?');
      if (queryIndex !== -1) {
        const query = deepLink.substring(queryIndex);
        const result = `${WEB_URL}/auth/mobile-callback${query}`;
        console.log('[URL] Auth callback result:', result);
        return result;
      }
      
      // Fallback: check for hash fragment (legacy)
      const hashIndex = deepLink.indexOf('#');
      if (hashIndex !== -1) {
        // Convert hash to query params
        const hash = deepLink.substring(hashIndex + 1);
        const result = `${WEB_URL}/auth/mobile-callback?${hash}`;
        console.log('[URL] Auth callback result (from hash):', result);
        return result;
      }
      
      return `${WEB_URL}/auth/mobile-callback`;
    }
    
    // For auth/error
    if (afterScheme.startsWith('auth/error')) {
      const queryIndex = deepLink.indexOf('?');
      if (queryIndex !== -1) {
        const query = deepLink.substring(queryIndex);
        return `${WEB_URL}/login${query}`;
      }
      return `${WEB_URL}/login?error=auth_failed`;
    }
    
    // For other paths
    const pathOnly = afterScheme.split('#')[0].split('?')[0];
    return `${WEB_URL}/${pathOnly}`;
  } catch (e) {
    console.log('[URL] Error:', e);
    return null;
  }
}

/**
 * Extract path from URL
 */
export function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return '/';
  }
}

/**
 * Check if URL is a file download
 */
export function isDownloadUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();
    const downloadExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.json', '.md', '.txt'];
    return downloadExtensions.some(ext => path.endsWith(ext));
  } catch {
    return false;
  }
}
