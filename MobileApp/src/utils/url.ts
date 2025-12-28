import { OAUTH_DOMAINS, ALLOWED_DOMAINS, APP_SCHEME, WEB_URL, EXTERNAL_AUTH_PATHS } from '../constants';

export function shouldOpenExternally(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    if (OAUTH_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      return true;
    }
    
    if (ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain))) {
      if (EXTERNAL_AUTH_PATHS.some(path => urlObj.pathname.startsWith(path))) {
        return true;
      }
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export function isAllowedUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.protocol === 'blob:' || urlObj.protocol === 'data:') {
      return true;
    }
    
    return ALLOWED_DOMAINS.some(domain => urlObj.hostname.includes(domain));
  } catch {
    return false;
  }
}

export function isAuthDeepLink(deepLink: string): boolean {
  return deepLink.includes('auth/callback') || deepLink.includes('auth/error');
}

export function deepLinkToWebUrl(deepLink: string): string | null {
  try {
    if (!deepLink.startsWith(`${APP_SCHEME}://`)) return null;
    
    const afterScheme = deepLink.substring(`${APP_SCHEME}://`.length);
    
    if (afterScheme.startsWith('auth/callback') || afterScheme.startsWith('auth/error')) {
      const queryIndex = deepLink.indexOf('?');
      if (queryIndex !== -1) {
        return `${WEB_URL}/auth/mobile-callback${deepLink.substring(queryIndex)}`;
      }
      return `${WEB_URL}/auth/mobile-callback`;
    }
    
    const pathOnly = afterScheme.split('#')[0].split('?')[0];
    return `${WEB_URL}/${pathOnly}`;
  } catch {
    return null;
  }
}

export function getUrlPath(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search + urlObj.hash;
  } catch {
    return '/';
  }
}

export function isDownloadUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname.toLowerCase();
    return ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv'].some(ext => path.endsWith(ext));
  } catch {
    return false;
  }
}
