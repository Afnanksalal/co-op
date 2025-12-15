# Co-Op Frontend

<p>
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Radix_UI-Latest-purple" alt="Radix UI">
</p>

Modern web application for the Co-Op AI advisory platform. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API (Required)
NEXT_PUBLIC_API_URL=https://co-op-80fi.onrender.com/api/v1

# App URL (Optional)
NEXT_PUBLIC_APP_URL=https://co-op-dev.vercel.app
```

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Authenticated routes
│   │   ├── admin/              # Admin panel
│   │   ├── agents/[agent]/     # Individual agents
│   │   ├── analytics/          # Analytics dashboard
│   │   ├── chat/               # Multi-agent chat
│   │   ├── dashboard/          # Main dashboard
│   │   ├── developers/         # API documentation
│   │   ├── sessions/           # Session history
│   │   └── settings/           # User settings
│   ├── auth/callback/          # OAuth callback
│   ├── login/                  # Login page
│   ├── onboarding/             # Onboarding flow
│   ├── privacy/                # Privacy policy
│   ├── terms/                  # Terms of service
│   └── page.tsx                # Landing page
│
├── components/ui/              # Reusable UI components
│
├── lib/
│   ├── api/                    # API client + types
│   ├── hooks/                  # Custom hooks
│   ├── supabase/               # Supabase clients
│   ├── store.ts                # Zustand stores
│   └── utils.ts                # Utilities
│
└── middleware.ts               # Auth middleware
```


## Features

### Dashboard
- Startup profile overview
- Quick access to AI agents
- Recent session history
- Key metrics

### AI Agents
Four specialized agents with real-time streaming:

| Agent | Purpose | Data Source |
|-------|---------|-------------|
| Legal | Corporate structure, compliance | RAG documents |
| Finance | Financial modeling, metrics | RAG documents |
| Investor | VC matching, pitch optimization | Web research |
| Competitor | Market analysis, positioning | Web research |

### Chat Interface
- Multi-agent conversations (A2A mode)
- Real-time streaming responses
- Session persistence
- Notion export
- Message history

### Onboarding
- User type selection (Existing Startup / Idea Stage)
- Simplified flow for idea stage
- Full profile for existing founders
- Exit option to return to homepage

### Settings
- Profile editing
- API key management
- Webhook configuration

### Admin Panel
- RAG document management
- PDF upload and vectorization
- Analytics dashboard

## Scripts

```bash
npm run dev           # Development server
npm run build         # Production build
npm run start         # Start production
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run typecheck     # TypeScript checking
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Set root directory to `Frontend`
4. Add environment variables
5. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 |
| Components | Radix UI |
| State | Zustand |
| Auth | Supabase Auth |
| Animations | Framer Motion |
| Icons | Phosphor Icons |

## API Client

```typescript
import { api } from '@/lib/api/client';

// User
const user = await api.getMe();
await api.completeOnboarding(data);

// Sessions
const session = await api.createSession({ startupId });
const messages = await api.getSessionMessages(sessionId);

// Agents
const { taskId } = await api.queueAgent({
  agentType: 'legal',
  prompt: 'What legal structure should I use?',
  sessionId,
  startupId,
  documents: [],
});
const status = await api.getTaskStatus(taskId);
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
