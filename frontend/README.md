# Co-Op Frontend

Premium dark-themed web application for the Co-Op AI Advisory Platform. Built with Next.js 14, shadcn/ui, Framer Motion, and Tailwind CSS.

## Design Philosophy

- **Ultra Premium Dark**: Near-black backgrounds with refined purple accents
- **Luxury Typography**: Cormorant Garamond serif for headings, Inter for body
- **Elegant Icons**: Phosphor Icons with light weight for a refined look
- **Smooth Animations**: Framer Motion for fluid transitions
- **Minimal & Clean**: No background colors on icons, subtle borders, refined spacing

## Tech Stack

| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type safety |
| Tailwind CSS | Utility-first styling |
| shadcn/ui | Radix-based component library |
| Phosphor Icons | Premium icon library |
| Framer Motion | Animations |
| Supabase | Authentication |
| Zustand | State management |
| React Hook Form | Form handling |
| Zod | Validation |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Protected dashboard routes
│   │   ├── dashboard/      # Main dashboard
│   │   ├── chat/           # AI chat interface
│   │   ├── sessions/       # Session history
│   │   ├── agents/         # Individual agent pages
│   │   ├── analytics/      # Usage analytics
│   │   └── settings/       # User settings
│   │       ├── api-keys/   # API key management
│   │       └── webhooks/   # Webhook configuration
│   ├── auth/               # Auth callback
│   ├── login/              # Login page
│   ├── onboarding/         # User onboarding flow
│   └── page.tsx            # Landing page
├── components/
│   └── ui/                 # shadcn/ui components
│       ├── button.tsx
│       ├── card.tsx
│       ├── input.tsx
│       ├── select.tsx
│       └── ...
├── lib/
│   ├── api/                # API client & types
│   │   ├── client.ts       # Fetch wrapper
│   │   └── types.ts        # TypeScript types
│   ├── supabase/           # Supabase clients
│   │   ├── client.ts       # Browser client
│   │   └── server.ts       # Server client
│   └── utils.ts            # Utility functions
└── styles/
    └── globals.css         # Global styles & CSS variables
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your credentials
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_API_URL

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

```env
# Supabase (Auth)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# Backend API
NEXT_PUBLIC_API_URL="https://co-op-80fi.onrender.com/api/v1"
```

## Features

### Landing Page
- Hero section with animated gradient background
- Agent showcase cards
- Feature highlights
- CTA sections

### Authentication
- Google OAuth via Supabase
- Email/password authentication
- Protected routes with middleware

### Onboarding
- Multi-step form wizard
- Sector selection (critical for RAG)
- Company profile setup
- Animated transitions

### Dashboard
- Quick stats overview
- Agent selection grid
- Recent sessions list
- Quick action cards

### Chat Interface
- Real-time agent selection
- Message streaming with SSE
- Confidence scores display
- Source citations
- Copy to clipboard

### Settings
- Account information
- Startup profile editing
- API key management
- Webhook configuration

## Design System

### Colors (CSS Variables)

```css
--background: 0 0% 3%;        /* Near black */
--foreground: 0 0% 95%;       /* Off white */
--primary: 263 70% 58%;       /* Purple accent */
--card: 0 0% 6%;              /* Card background */
--muted: 0 0% 15%;            /* Muted elements */
--border: 0 0% 14%;           /* Borders */
```

### Typography

- **Headings**: Cormorant Garamond (luxury serif)
- **Body**: Inter (sans-serif)
- **Code**: JetBrains Mono (monospace)

### Components

All components follow shadcn/ui patterns with custom styling:

- `Button` - Multiple variants (default, outline, ghost, glow)
- `Card` - With hover and glow effects
- `Input` - With icon support and error states
- `Select` - Radix-based dropdown
- `Badge` - Status indicators
- `Avatar` - User avatars with fallback

## Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run start     # Start production server
npm run lint      # Run ESLint
npm run format    # Format with Prettier
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## API Integration

The frontend communicates with the backend via REST API:

```typescript
import { api } from '@/lib/api/client';

// Get current user
const user = await api.get<User>('/users/me');

// Run agent query
const results = await api.post<AgentPhaseResult[]>('/agents/run', {
  agentType: 'legal',
  prompt: 'What legal structure should I use?',
  sessionId: session.id,
  startupId: user.startup.id,
});

// Queue async task
const { taskId } = await api.post('/agents/queue', { ... });

// Stream task status
api.streamTask(taskId, onUpdate, onDone);
```

## Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Run `npm run lint` and `npm run format`
5. Submit pull request

## License

MIT
