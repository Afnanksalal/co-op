# Co-Op Frontend

Next.js 14 frontend for the Co-Op AI Advisory platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Icons**: Phosphor Icons
- **State**: Zustand
- **Auth**: Supabase Auth
- **Animations**: Framer Motion

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3000/api/v1)

3. Run development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── agents/         # Agent-specific pages
│   │   ├── analytics/      # Admin analytics
│   │   ├── chat/           # Main chat interface
│   │   ├── dashboard/      # Dashboard home
│   │   ├── sessions/       # Session history
│   │   └── settings/       # User settings
│   ├── auth/               # Auth callback
│   ├── login/              # Login page
│   └── onboarding/         # Onboarding flow
├── components/
│   └── ui/                 # Reusable UI components
└── lib/
    ├── api/                # API client and types
    ├── hooks/              # Custom React hooks
    ├── supabase/           # Supabase client setup
    ├── store.ts            # Zustand stores
    └── utils.ts            # Utility functions
```

## Features

- **Authentication**: Google OAuth and email/password via Supabase
- **Onboarding**: Multi-step startup profile setup
- **Chat**: Real-time AI agent conversations with SSE streaming
- **Sessions**: Conversation history and management
- **API Keys**: Programmatic access management
- **Webhooks**: Event notification configuration
- **Analytics**: Admin dashboard with platform stats (admin only)
- **RAG Management**: Document upload and vectorization (admin only)

## API Integration

The frontend connects to the NestJS backend via the API client at `src/lib/api/client.ts`. All API types are defined in `src/lib/api/types.ts` and match the backend DTOs.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format with Prettier
