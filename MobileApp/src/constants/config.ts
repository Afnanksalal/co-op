export const IS_DEV = __DEV__;

export const WEB_URL = 'https://co-op-dev.vercel.app';
export const API_URL = 'https://co-op-backend.onrender.com';
export const APP_SCHEME = 'coop';

export const COLORS = {
  dark: {
    background: '#0f1012',
    foreground: '#f2f2f2',
    card: '#141619',
    muted: '#1e2124',
    mutedForeground: '#8b8d91',
    border: '#282b30',
  },
  light: {
    background: '#ffffff',
    foreground: '#1a1c1e',
    card: '#ffffff',
    muted: '#f5f5f5',
    mutedForeground: '#6b7280',
    border: '#e5e7eb',
  },
} as const;

export const OAUTH_DOMAINS = [
  'accounts.google.com',
] as const;

export const EXTERNAL_AUTH_PATHS = [
  '/auth/mobile-login',
] as const;

export const ALLOWED_DOMAINS = [
  'co-op-dev.vercel.app',
  'co-op.vercel.app',
  'co-op-backend.onrender.com',
  'localhost',
] as const;

export const CONNECTION_TIMEOUT_MS = 10000;
export const THEME_DETECTION_DELAY_MS = 100;
export const MAX_FILE_SIZE_MB = 10;
export const ALLOWED_FILE_TYPES = ['application/pdf'] as const;
