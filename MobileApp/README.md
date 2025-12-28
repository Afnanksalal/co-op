# Co-Op Mobile App

<p>
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo">
  <img src="https://img.shields.io/badge/React_Native-0.76-61dafb?logo=react" alt="React Native">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey" alt="Platform">
</p>

Native mobile application for the Co-Op AI advisory platform. Built with Expo SDK 54 and React Native, wrapping the web app with native features and OAuth support.

## Quick Start

```bash
npm install
npm start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

## Features

- **WebView Wrapper** - Native container for Co-Op web app
- **Google OAuth** - Authentication via system browser with deep link callback
- **Deep Linking** - `coop://` custom scheme for auth callbacks
- **Theme Sync** - Status bar matches website light/dark mode
- **Offline Handling** - Connection detection with retry UI
- **Back Navigation** - Android hardware back button support
- **Edge-to-Edge** - Full screen with safe area padding injection

## Project Structure

```
MobileApp/
├── App.tsx                    # Entry point
├── app.json                   # Expo configuration
├── src/
│   ├── components/
│   │   ├── LoadingScreen.tsx  # Loading state
│   │   ├── ErrorScreen.tsx    # Offline/error states
│   │   └── WebViewScreen.tsx  # Main WebView
│   ├── constants/
│   │   └── config.ts          # URLs, colors, domains
│   ├── hooks/
│   │   ├── useConnection.ts   # Network state
│   │   ├── useBackHandler.ts  # Android back button
│   │   └── useDeepLink.ts     # Deep link handling
│   ├── screens/
│   │   └── MainScreen.tsx     # Screen orchestration
│   └── utils/
│       └── url.ts             # URL validation
```

## Authentication Flow

The mobile app uses a specialized OAuth flow to handle Google authentication:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   WebView   │────▶│   System    │────▶│   Google    │
│  /login     │     │   Browser   │     │   OAuth     │
└─────────────┘     └─────────────┘     └─────────────┘
       ▲                   │                   │
       │                   │                   ▼
       │                   │            ┌─────────────┐
       │                   └───────────▶│ /mobile-    │
       │                                │   login     │
       │                                └─────────────┘
       │                                       │
       │            ┌─────────────┐            │
       └────────────│  Deep Link  │◀───────────┘
                    │  coop://    │
                    └─────────────┘
```

1. User taps "Continue with Google" in WebView
2. WebView opens `/auth/mobile-login` in system browser
3. Browser initiates OAuth, redirects to Google
4. User authenticates with Google
5. Google redirects back to `/auth/mobile-login?code=...`
6. Page exchanges code for session tokens
7. Page triggers deep link `coop://auth/callback?tokens...`
8. App receives deep link, WebView loads `/auth/mobile-callback`
9. Session established in WebView, redirects to dashboard

This flow ensures PKCE code verifier consistency by keeping the entire OAuth process in the same browser context.

## Deep Linking

| Type | URL |
|------|-----|
| Custom Scheme | `coop://auth/callback` |
| Error Callback | `coop://auth/error?message=...` |

## Configuration

```typescript
// src/constants/config.ts
export const WEB_URL = 'https://co-op-dev.vercel.app';
export const APP_SCHEME = 'coop';

export const ALLOWED_DOMAINS = [
  'co-op-dev.vercel.app',
  'co-op.vercel.app',
];

export const OAUTH_DOMAINS = [
  'accounts.google.com',
];

export const EXTERNAL_AUTH_PATHS = [
  '/auth/mobile-login',
];
```

## Building for Production

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android
eas build --platform android --profile production

# Build for iOS
eas build --platform ios --profile production
```

## Security

- **URL Allowlisting** - Only trusted domains can load in WebView
- **OAuth via Browser** - System browser for auth (Google blocks WebView)
- **Session Isolation** - WebView and browser have separate storage
- **Minimal JS Injection** - Only safe area and theme detection

## Tech Stack

- **Framework**: Expo SDK 54
- **Runtime**: React Native 0.76
- **Language**: TypeScript 5
- **WebView**: react-native-webview
- **Navigation**: expo-linking

## Scripts

```bash
npm start            # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
