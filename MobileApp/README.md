# Co-Op Mobile App

<p>
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo">
  <img src="https://img.shields.io/badge/React_Native-0.81-61dafb?logo=react" alt="React Native">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Hermes-Enabled-orange" alt="Hermes">
  <img src="https://img.shields.io/badge/Platform-iOS%20%7C%20Android-lightgrey" alt="Platform">
</p>

Native mobile application for the Co-Op AI advisory platform. Built with Expo SDK 54, React Native 0.81, and Hermes engine for optimal performance.

## Quick Start

```bash
npm install
npm start
```

Scan the QR code with Expo Go (Android) or Camera app (iOS).

## Features

- **WebView Wrapper** - Native container for Co-Op web app
- **Google OAuth** - Implicit flow via system browser with deep link callback
- **Deep Linking** - `coop://` custom scheme for auth and navigation
- **Theme Sync** - Status bar matches website light/dark mode
- **Offline Handling** - Connection detection with retry UI
- **Back Navigation** - Android hardware back button support
- **Edge-to-Edge** - Full screen with safe area padding injection
- **Hermes Engine** - Optimized JavaScript runtime for better performance
- **New Architecture** - React Native's new architecture enabled
- **Animation Disabled** - CSS animations disabled for mobile performance

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
│       └── url.ts             # URL validation & conversion
```

## Authentication Flow

The mobile app uses OAuth implicit flow to handle Google authentication, avoiding PKCE localStorage issues in Chrome Custom Tabs:

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

### Login Flow
1. User taps "Continue with Google" in WebView
2. WebView opens `/auth/mobile-login` in system browser
3. Browser initiates OAuth with implicit flow (`prompt: consent select_account`)
4. User authenticates with Google (always shows account picker)
5. Google redirects back with tokens in URL hash (`#access_token=...`)
6. Page extracts tokens and triggers deep link `coop://auth/callback?tokens...`
7. App receives deep link, WebView loads `/auth/mobile-callback`
8. Session established in WebView, redirects to dashboard

### Logout Flow
1. User taps logout in WebView
2. WebView clears localStorage
3. Opens `/auth/mobile-logout` in system browser
4. Browser clears its localStorage and Supabase session
5. Triggers deep link `coop://logout/complete`
6. App receives deep link, WebView loads `/login`

This ensures account switching works correctly by clearing both WebView and browser sessions.

## Deep Linking

| Type | URL | Description |
|------|-----|-------------|
| Auth Callback | `coop://auth/callback?access_token=...` | Successful login |
| Auth Error | `coop://auth/error?message=...` | Login failed |
| Logout Complete | `coop://logout/complete` | Logout finished |

## Configuration

```typescript
// src/constants/config.ts
export const WEB_URL = 'https://co-op.software';
export const API_URL = 'https://api.co-op.software';
export const APP_SCHEME = 'coop';

export const ALLOWED_DOMAINS = [
  'co-op.software',
  'api.co-op.software',
  'rag.co-op.software',
  'localhost',
];

export const OAUTH_DOMAINS = [
  'accounts.google.com',
];

export const EXTERNAL_AUTH_PATHS = [
  '/auth/mobile-login',
  '/auth/mobile-logout',
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

## Development Build

```bash
# Generate native projects
npx expo prebuild

# Run on Android
npx expo run:android

# Run on iOS
npx expo run:ios
```

## Security

- **URL Allowlisting** - Only trusted domains can load in WebView
- **OAuth via Browser** - System browser for auth (Google blocks WebView)
- **Session Isolation** - WebView and browser have separate storage
- **Minimal JS Injection** - Only safe area and theme detection
- **Account Picker** - Always shows Google account selection on login

## Performance

- **Hermes Engine** - Enabled for faster JS execution and lower memory
- **New Architecture** - React Native's new architecture for better performance
- **Animations Disabled** - CSS animations disabled in mobile WebView
- **Hardware Acceleration** - Android hardware layer type enabled

## Tech Stack

- **Framework**: Expo SDK 54
- **Runtime**: React Native 0.81
- **JS Engine**: Hermes
- **Language**: TypeScript 5
- **WebView**: react-native-webview 13.15
- **Navigation**: expo-linking

## Scripts

```bash
npm start            # Start Expo dev server
npm run android      # Run on Android
npm run ios          # Run on iOS
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript check
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
