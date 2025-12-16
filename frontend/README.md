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
│   │   │   └── investors/      # Investor management
│   │   ├── agents/[agent]/     # Individual agents
│   │   ├── analytics/          # Admin analytics
│   │   ├── bookmarks/          # Saved responses
│   │   ├── chat/               # Multi-agent chat
│   │   ├── dashboard/          # Main dashboard
│   │   ├── developers/         # API documentation
│   │   ├── sessions/           # Session history
│   │   ├── tools/              # Startup tools
│   │   │   ├── calculators/    # Financial calculators
│   │   │   ├── investors/      # Investor database
│   │   │   └── alerts/         # Competitor alerts
│   │   ├── usage/              # Personal analytics
│   │   └── settings/           # User settings
│   ├── auth/callback/          # OAuth callback
│   ├── login/                  # Login page
│   ├── onboarding/             # Onboarding flow
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
Four specialized agents with real-time SSE streaming:

| Agent | Purpose | Data Source |
|-------|---------|-------------|
| Legal | Corporate structure, compliance | RAG documents |
| Finance | Financial modeling, metrics | RAG documents |
| Investor | VC matching, pitch optimization | Web research |
| Competitor | Market analysis, positioning | Web research |

### Chat Interface
- Multi-agent conversations (A2A mode)
- True SSE streaming with fallback polling
- Document upload for context (PDF, DOC, TXT)
- Session persistence
- Thinking steps visualization
- Notion export
- Bookmark responses

### Sessions
- Session history with search
- Pin/favorite important sessions
- Export to Markdown/JSON
- Email session summaries
- Continue previous conversations

### Bookmarks
- Save AI responses
- Search across bookmarks
- Tag organization
- Quick copy to clipboard

### Usage Analytics
- Personal usage dashboard
- Session and message counts
- Agent usage breakdown
- Activity heatmap
- Monthly quota tracking

### PWA Support
- Installable app
- Shortcuts (New Chat, Sessions)
- Share target for text

### Tools
- **Financial Calculators** - Runway, burn rate, valuation, unit economics
- **Investor Database** - 20+ real investors, filter by stage/sector/region
- **Competitor Alerts** - Real-time monitoring with email notifications

### Settings
- Profile editing
- API key management
- Webhook configuration

### Admin Panel
- RAG document management
- PDF upload and vectorization
- Platform analytics
- **Investor Management** - Add, edit, delete investors

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
| Components | Radix UI + shadcn/ui |
| State | Zustand |
| Auth | Supabase Auth |
| Animations | Framer Motion |
| Icons | Phosphor Icons |
| Analytics | Vercel Analytics |

## API Client

```typescript
import { api } from '@/lib/api/client';

// User
const user = await api.getMe();
await api.completeOnboarding(data);

// Sessions
const session = await api.createSession({ startupId });
await api.toggleSessionPin(sessionId);
await api.exportSession(sessionId, { format: 'markdown' });
await api.emailSession(sessionId, { email: 'user@example.com' });

// Agents with SSE streaming
const { taskId } = await api.queueAgent({
  agentType: 'legal',
  prompt: 'What legal structure should I use?',
  sessionId,
  startupId,
  documents: [],
});

// Connect to SSE stream
api.streamAgentTask(taskId, (event) => {
  switch (event.type) {
    case 'progress': // Processing update
    case 'thinking': // AI reasoning step
    case 'chunk':    // Content streaming
    case 'done':     // Task complete
    case 'error':    // Task failed
  }
});

// Bookmarks
await api.createBookmark({ title, content, tags });
const bookmarks = await api.getBookmarks(search);

// Documents
await api.uploadDocument(file, sessionId);
const docs = await api.getDocuments(sessionId);

// Analytics
const analytics = await api.getMyAnalytics();
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
