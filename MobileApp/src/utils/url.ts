/**
 * URL Utilities
 * Security-focused URL validation and manipulation
 */

import { OAUTH_DOMAINS, ALLOWED_DOMAINS, APP_SCHEME, WEB_URL } from '../constants';

/**
 * Check if URL should open in external browser (OAuth flows)
 */
export function shouldOpenExternally(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return OAUTH_DOMAINS.some(domain => urlObj.hostname.includes(domain));
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
 * Parse auth tokens from deep link URL fragment
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
    
    const hashIndex = deepLink.indexOf('#');
    if (hashIndex === -1) return null;
    
    const fragment = deepLink.substring(hashIndex + 1);
    const params = new URLSearchParams(fragment);
    
    // Check for error response first (OAuth denial, etc.)
    const error = params.get('error');
    if (error) {
      return {
        error,
        error_description: params.get('error_description') || undefined,
      };
    }
    
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    
    if (!access_token || !refresh_token) {
      return null;
    }
    
    return {
      access_token,
      refresh_token,
      expires_at: params.get('expires_at') || undefined,
      token_type: params.get('token_type') || 'bearer',
    };
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
 * Convert deep link to web URL
 */
export function deepLinkToWebUrl(deepLink: string): string | null {
  try {
    // Handle coop:// scheme
    if (deepLink.startsWith(`${APP_SCHEME}://`)) {
      const path = deepLink.replace(`${APP_SCHEME}://`, '');
      
      // Handle auth callback with tokens - redirect to special page that will set session
      // Match both 'auth/callback#...' and 'auth/callback?...' patterns
      if (path.startsWith('auth/callback')) {
        // Pass the full fragment/query to the web app
        const hashIndex = deepLink.indexOf('#');
        const queryIndex = deepLink.indexOf('?');
        
        // Prefer hash fragment (tokens), fall back to query params (errors)
        if (hashIndex !== -1) {
          const fragment = deepLink.substring(hashIndex);
          return `${WEB_URL}/auth/mobile-callback${fragment}`;
        } else if (queryIndex !== -1) {
          // Convert query params to hash for consistency
          const query = deepLink.substring(queryIndex + 1);
          return `${WEB_URL}/auth/mobile-callback#${query}`;
        }
        
        return `${WEB_URL}/auth/mobile-callback`;
      }
      
      // Handle auth error deep links
      if (path.startsWith('auth/error')) {
        const queryIndex = deepLink.indexOf('?');
        if (queryIndex !== -1) {
          const query = deepLink.substring(queryIndex + 1);
          const params = new URLSearchParams(query);
          const message = params.get('message') || 'auth_failed';
          return `${WEB_URL}/login?error=${encodeURIComponent(message)}`;
        }
        return `${WEB_URL}/login?error=auth_failed`;
      }
      
      // Handle login deep link with error
      if (path.startsWith('login')) {
        const queryIndex = deepLink.indexOf('?');
        if (queryIndex !== -1) {
          const query = deepLink.substring(queryIndex);
          return `${WEB_URL}/login${query}`;
        }
        return `${WEB_URL}/login`;
      }
      
      return `${WEB_URL}/${path}`;
    }
    
    // Handle https:// links to our domain
    if (deepLink.includes('co-op-dev.vercel.app') || deepLink.includes('co-op.vercel.app')) {
      return deepLink;
    }
    
    return null;
  } catch {
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
