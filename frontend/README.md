# Co-Op Frontend

<p>
  <img src="https://img.shields.io/badge/Next.js-14-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss" alt="Tailwind">
  <img src="https://img.shields.io/badge/Radix_UI-Latest-purple" alt="Radix UI">
</p>

Modern, responsive web application for the Co-Op AI advisory platform. Built with Next.js 14 App Router, React 18, TypeScript, and Tailwind CSS.

## Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 |
| **Components** | Radix UI primitives |
| **State** | Zustand |
| **Forms** | React Hook Form + Zod |
| **Auth** | Supabase Auth |
| **Animations** | Framer Motion |
| **Icons** | Phosphor Icons |

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn
- Supabase project (for auth)
- Backend API running

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your credentials
# See Environment Variables section below

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create `.env.local` with:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Backend API (Required)
NEXT_PUBLIC_API_URL=https://co-op-80fi.onrender.com/api/v1

# App URL (Optional - for OAuth callbacks)
NEXT_PUBLIC_APP_URL=https://co-op-dev.vercel.app
```

## Project Structure

```
src/
├── app/                        # Next.js App Router
│   ├── (dashboard)/            # Authenticated routes (with sidebar)
│   │   ├── admin/              # Admin panel (RAG management)
│   │   ├── agents/[agent]/     # Individual agent pages
│   │   ├── analytics/          # Analytics dashboard
│   │   ├── chat/               # Multi-agent chat interface
│   │   ├── dashboard/          # Main dashboard
│   │   ├── developers/         # API documentation
│   │   ├── sessions/           # Session history
│   │   │   └── [id]/           # Session detail view
│   │   └── settings/           # User settings
│   │       ├── api-keys/       # API key management
│   │       └── webhooks/       # Webhook configuration
│   ├── auth/callback/          # OAuth callback handler
│   ├── login/                  # Login page
│   ├── onboarding/             # Multi-step onboarding flow
│   ├── globals.css             # Global styles
│   ├── layout.tsx              # Root layout
│   └── page.tsx                # Landing page
│
├── components/
│   └── ui/                     # Reusable UI components
│       ├── button.tsx          # Button variants
│       ├── card.tsx            # Card components
│       ├── dialog.tsx          # Modal dialogs
│       ├── dropdown-menu.tsx   # Dropdown menus
│       ├── input.tsx           # Form inputs
│       ├── select.tsx          # Select dropdowns
│       ├── tabs.tsx            # Tab navigation
│       └── ...                 # More components
│
├── lib/
│   ├── api/
│   │   ├── client.ts           # API client with auth
│   │   └── types.ts            # TypeScript types
│   ├── hooks/
│   │   ├── use-user.ts         # User state hook
│   │   └── use-sessions.ts     # Sessions hook
│   ├── supabase/
│   │   ├── client.ts           # Browser client
│   │   └── server.ts           # Server client
│   ├── store.ts                # Zustand stores
│   └── utils.ts                # Utility functions (cn, etc.)
│
└── middleware.ts               # Auth middleware
```

## Features

### 🏠 Dashboard
- Overview of startup profile
- Quick access to all AI agents
- Recent session history
- Key metrics and stats

### 🤖 AI Agents
Four specialized agents with real-time streaming:

| Agent | Purpose | Data Source |
|-------|---------|-------------|
| **Legal** | Corporate structure, compliance, contracts | RAG documents |
| **Finance** | Financial modeling, metrics, runway | RAG documents |
| **Investor** | VC matching, pitch optimization | Web research |
| **Competitor** | Market analysis, positioning | Web research |

### 💬 Chat Interface
- Multi-agent conversations
- Real-time streaming responses
- Session persistence
- Notion export integration
- Message history

### ⚙️ Settings
- **Profile** - Edit startup information
- **API Keys** - Generate and manage API keys
- **Webhooks** - Configure event notifications

### 👑 Admin Panel (Admin users only)
- RAG document management
- PDF upload and vectorization
- Domain/sector filtering
- Analytics dashboard

### 📱 Responsive Design
- Mobile-first approach
- Adaptive sidebar navigation
- Touch-friendly interactions

## Available Scripts

```bash
# Development
npm run dev           # Start dev server (port 3000)

# Build
npm run build         # Production build
npm run start         # Start production server

# Code Quality
npm run lint          # Run ESLint
npm run lint:fix      # Fix ESLint issues
npm run format        # Format with Prettier
npm run format:check  # Check formatting
npm run typecheck     # TypeScript type checking

# Maintenance
npm run clean         # Remove .next and node_modules
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Set root directory to `Frontend`
4. Add environment variables
5. Deploy

The `vercel.json` configuration handles:
- API rewrites to backend
- Security headers (CSP, HSTS, etc.)
- CORS configuration

### Manual Deployment

```bash
npm run build
npm run start
```

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

## API Client

The frontend includes a typed API client (`src/lib/api/client.ts`):

```typescript
import { api } from '@/lib/api/client';

// User endpoints
const user = await api.getMe();
const status = await api.getOnboardingStatus();
await api.completeOnboarding(data);

// Session endpoints
const session = await api.createSession({ startupId });
const sessions = await api.getSessions();
const messages = await api.getSessionMessages(sessionId);

// Agent endpoints
const results = await api.runAgent({
  agentType: 'legal',
  prompt: 'What legal structure should I use?',
  sessionId,
  startupId,
  documents: [],
});

// Async agent with polling
const { taskId } = await api.queueAgent(data);
const status = await api.getTaskStatus(taskId);

// API keys & webhooks
const keys = await api.getApiKeys();
const webhooks = await api.getWebhooks();
```

## Authentication Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Login     │────▶│  Supabase   │────▶│  Callback   │
│   Page      │     │   OAuth     │     │   Route     │
└─────────────┘     └─────────────┘     └─────────────┘
                                               │
                    ┌──────────────────────────┘
                    ▼
            ┌───────────────┐
            │  Onboarding   │ (if not completed)
            │    Flow       │
            └───────────────┘
                    │
                    ▼
            ┌───────────────┐
            │   Dashboard   │
            └───────────────┘
```

The middleware (`src/middleware.ts`) handles:
- Redirecting unauthenticated users to login
- Redirecting authenticated users without onboarding
- Protecting dashboard routes

## Styling

### Tailwind Configuration

Custom theme extensions in `tailwind.config.ts`:
- Custom colors (primary, muted, etc.)
- Custom fonts (serif for headings)
- Animation utilities

### Component Patterns

Using `class-variance-authority` for variant-based styling:

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline: "border border-input bg-background hover:bg-accent",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
  }
);
```

### Dark Mode

The app uses a dark theme by default with CSS variables:

```css
:root {
  --background: 0 0% 7%;
  --foreground: 0 0% 95%;
  --primary: 0 0% 98%;
  --muted: 0 0% 15%;
  /* ... */
}
```

## Code Quality

### ESLint Configuration

- Next.js recommended rules
- TypeScript strict mode
- Import sorting

### Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run `npm run lint` and `npm run format`
5. Commit with conventional commits (`feat:`, `fix:`, etc.)
6. Submit a pull request

## License

MIT License - see [LICENSE](../LICENSE) for details.
