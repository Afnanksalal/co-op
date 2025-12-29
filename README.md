<p align="center">
  <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/NestJS-11-red?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/Python-3.11-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/Expo-54-000020?logo=expo" alt="Expo">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen" alt="PRs Welcome">
</p>

<h1 align="center">Co-Op</h1>

<p align="center">
  <strong>AI-Powered Advisory Platform for Startups</strong>
</p>

<p align="center">
  Expert guidance across legal, finance, investor relations, and competitive analysis.<br/>
  Powered by a multi-model LLM Council architecture with mandatory cross-critique.
</p>

<p align="center">
  <a href="https://co-op-dev.vercel.app">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#deployment">Deployment</a> •
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## Overview

Co-Op is an open-source AI advisory platform that provides startup founders with expert guidance across multiple domains. Unlike single-model AI chatbots, Co-Op uses a unique **LLM Council** architecture where multiple AI models collaborate and cross-critique each other's responses to ensure accuracy and reduce hallucinations.

### Key Features

| Feature | Description |
|---------|-------------|
| **LLM Council** | 2-5 AI models cross-critique every response |
| **4 Expert Agents** | Legal, Finance, Investor, Competitor |
| **Real-time Streaming** | True SSE streaming with fallback polling |
| **RAG Knowledge Base** | Sector-specific document search with caching |
| **MCP Protocol** | Use agents in Claude, Cursor, Kiro |
| **A2A Protocol** | Multi-agent collaboration mode |
| **Session Export** | Markdown/JSON export + email summaries |
| **Document Upload** | PDF, DOC, TXT context for chat |
| **Secure Documents** | AES-256 encrypted user documents with RAG |
| **Bookmarks** | Save and organize AI responses |
| **Usage Analytics** | Personal usage dashboard |
| **PWA Support** | Installable with shortcuts |
| **Mobile App** | Native iOS/Android app (Expo + Hermes) |
| **Financial Tools** | Runway, burn rate, valuation calculators |
| **Investor Database** | 20+ real investors with admin management |
| **Competitor Alerts** | Real-time monitoring with email notifications |
| **Customer Outreach** | AI-powered lead discovery & email campaigns |
| **Admin Dashboard** | User management, pilot usage tracking, status control |
| **Self-Hostable** | Deploy on your own infrastructure |

---

## Security & Scalability

| Security Feature | Implementation |
|------------------|----------------|
| **Authentication** | Supabase JWT with token verification |
| **Authorization** | Role-based access (user, admin) |
| **Rate Limiting** | Per-user throttling via Redis with configurable presets |
| **API Keys** | SHA-256 hashed, timing-safe comparison |
| **Encryption** | AES-256-GCM for sensitive data at rest |
| **Document Encryption** | User documents encrypted chunk-by-chunk |
| **Input Validation** | class-validator DTOs, whitelist mode |
| **SQL Injection** | Drizzle ORM parameterized queries |
| **CORS** | Configurable allowed origins |
| **Security Headers** | Helmet.js middleware |
| **Audit Logging** | Full audit trail for sensitive operations |
| **IP Validation** | Proxy-aware IP extraction with validation |
| **Error Sanitization** | Sensitive data filtered from error responses |

| Scalability Feature | Implementation |
|---------------------|----------------|
| **Serverless DB** | Neon PostgreSQL auto-scales |
| **Serverless Cache** | Upstash Redis pay-per-request |
| **Async Processing** | QStash message queue with webhooks |
| **Circuit Breaker** | Opossum for fault tolerance |
| **Retry Logic** | Exponential backoff with jitter |
| **RAG Caching** | 30-min TTL, SHA-256 cache keys |
| **SSE Reconnection** | Auto-reconnect with exponential backoff |
| **Horizontal Scaling** | Stateless services, Redis-backed state |
| **Embedding Timeout** | 30-second timeout on RAG embedding calls |

---

## AI Agents

| Agent | Expertise | Data Source |
|-------|-----------|-------------|
| **⚖️ Legal** | Corporate structure, IP, compliance, contracts | RAG (document search) |
| **💰 Finance** | Financial modeling, metrics, runway, valuation | RAG (document search) |
| **🤝 Investor** | VC matching, pitch optimization, fundraising | Web Research (Gemini + ScrapingBee fallback) |
| **🎯 Competitor** | Market landscape, positioning, intelligence | Web Research (Gemini + ScrapingBee fallback) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                  │
│                    Next.js 15 (Vercel)                              │
│    Dashboard • Chat • Sessions • Bookmarks • Usage • Outreach       │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                   │
│                    NestJS 11 (Render)                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                    Agent Orchestrator                         │  │
│  │     [Legal] [Finance] [Investor] [Competitor]                 │  │
│  │                         │                                     │  │
│  │                         ▼                                     │  │
│  │                    LLM Council                                │  │
│  │     [Llama 3.3] [Gemini 2.5] [DeepSeek R1] [Kimi K2]         │  │
│  │              Mandatory Cross-Critique                         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Outreach: Lead Discovery • Campaign Management • Email Track │  │
│  └───────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Security: Auth Guard • Rate Limiting • Encryption • Audit   │  │
│  │  Resilience: Circuit Breaker • Retry Service • Health Checks │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
           │                    │                    │
           ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐
│   RAG Service   │  │  Web Research   │  │      Data Layer         │
│ FastAPI (Koyeb) │  │ Gemini Search   │  │  PostgreSQL (Neon)      │
│ Upstash Vector  │  │   Grounding     │  │  Redis (Upstash)        │
│ Gemini Embed    │  │ + ScrapingBee   │  │  Supabase (Auth+Storage)│
│ Query Caching   │  │   (fallback)    │  │  QStash (Queue)         │
└─────────────────┘  └─────────────────┘  └─────────────────────────┘
```

---

## Project Structure

```
co-op/
├── Backend/                 # NestJS API server
│   ├── src/
│   │   ├── modules/         # Feature modules
│   │   │   ├── agents/      # AI agents + streaming
│   │   │   ├── sessions/    # Chat sessions + export
│   │   │   ├── outreach/    # Leads + campaigns + email tracking
│   │   │   ├── alerts/      # Competitor monitoring
│   │   │   ├── investors/   # Investor database
│   │   │   ├── bookmarks/   # Saved responses
│   │   │   ├── documents/   # Chat document upload
│   │   │   ├── secure-documents/  # Encrypted user docs
│   │   │   └── ...
│   │   ├── common/          # Shared services (LLM, RAG, cache, email)
│   │   └── database/        # Drizzle ORM schemas & migrations
│   └── README.md
│
├── Frontend/                # Next.js web application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── (dashboard)/ # Protected routes
│   │   │   │   ├── tools/outreach/  # Lead management + campaigns
│   │   │   │   ├── tools/alerts/    # Competitor alerts
│   │   │   │   ├── tools/investors/ # Investor search
│   │   │   │   └── ...
│   │   ├── components/      # UI components (Radix + custom)
│   │   └── lib/             # API client, hooks, stores
│   └── README.md
│
├── MobileApp/               # React Native mobile app (Expo SDK 54)
│   ├── src/
│   │   ├── components/      # WebView, Loading, Error screens
│   │   ├── hooks/           # Connection, back handler, deep link
│   │   ├── constants/       # App configuration
│   │   └── utils/           # URL validation & conversion
│   └── README.md
│
├── RAG/                     # Python vector search service
│   ├── app/                 # FastAPI application
│   └── README.md
│
├── ARCHITECTURE.md          # Detailed architecture documentation
├── CONTRIBUTING.md          # Contribution guidelines
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+ (for RAG service)
- PostgreSQL database (Neon recommended)
- Redis instance (Upstash recommended)
- Supabase project (Auth + Storage)
- At least 2 LLM API keys

### 1. Clone Repository

```bash
git clone https://github.com/Afnanksalal/co-op.git
cd co-op
```

### 2. Backend Setup

```bash
cd Backend
cp .env.example .env
# Configure environment variables (see .env.example for documentation)

npm install
npm run db:push
npm run dev
```

### 3. Frontend Setup

```bash
cd Frontend
cp .env.example .env.local
# Configure environment variables

npm install
npm run dev
```

### 4. RAG Service (Optional)

```bash
cd RAG
cp .env.example .env
# Configure environment variables

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 5. Mobile App (Optional)

```bash
cd MobileApp
npm install
npm start
# Scan QR code with Expo Go app

# Or build native app
npx expo prebuild
npx expo run:android  # or run:ios
```

---

## Deployment

### Production URLs

| Service | Platform | URL |
|---------|----------|-----|
| Frontend | Vercel | [co-op-dev.vercel.app](https://co-op-dev.vercel.app) |
| Backend | Render | `https://co-op-80fi.onrender.com` |
| RAG | Koyeb | `https://apparent-nanice-afnan-3cac971c.koyeb.app` |

### Infrastructure

| Component | Provider | Purpose |
|-----------|----------|---------|
| Database | [Neon](https://neon.tech) | Serverless PostgreSQL |
| Cache/Queue | [Upstash](https://upstash.com) | Redis + QStash + Vector |
| Auth/Storage | [Supabase](https://supabase.com) | Authentication + file storage |
| LLM | [Groq](https://console.groq.com) | Llama 3.3 70B, Kimi K2 |
| LLM | [Google AI](https://aistudio.google.com) | Gemini 2.5 Flash |
| LLM | [HuggingFace](https://huggingface.co) | DeepSeek R1, Phi-3, Qwen 2.5 |
| Email | [SendGrid](https://sendgrid.com) | Transactional emails |
| Research | [ScrapingBee](https://scrapingbee.com) | Web search fallback |

All services have free tiers available.

---

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript 5
- Tailwind CSS 3.4
- Radix UI + shadcn/ui
- Zustand (state management)
- Framer Motion (animations)
- Phosphor Icons
- Vercel Analytics

### Backend
- NestJS 11
- TypeScript 5
- Drizzle ORM
- Upstash QStash
- SendGrid (email)
- Opossum (circuit breaker)

### RAG Service
- FastAPI
- Upstash Vector
- Gemini Embeddings

---

## API Overview

### Authentication

```bash
# User auth (Supabase JWT)
curl -H "Authorization: Bearer <jwt>" \
  https://api.example.com/api/v1/users/me

# Service auth (API Key)
curl -H "X-API-Key: coop_xxxxx" \
  https://api.example.com/api/v1/mcp-server/discover
```

### Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/users/me/onboarding` | POST | Complete startup profile |
| `/sessions` | POST | Create advisory session |
| `/sessions/:id/export` | POST | Export session (MD/JSON) |
| `/sessions/:id/email` | POST | Email session summary |
| `/agents/run` | POST | Run agent (sync) |
| `/agents/queue` | POST | Queue agent (async) |
| `/agents/stream/:taskId` | GET | SSE stream for task |
| `/analytics/me` | GET | Personal usage analytics |
| `/bookmarks` | GET/POST | Manage bookmarks |
| `/documents/upload` | POST | Upload chat document |
| `/secure-documents/upload` | POST | Upload encrypted document |
| `/outreach/leads/discover` | POST | AI-powered lead discovery |
| `/outreach/leads` | GET/POST | Manage leads |
| `/outreach/campaigns` | GET/POST | Manage email campaigns |
| `/outreach/campaigns/:id/send` | POST | Send campaign emails |
| `/alerts` | GET/POST | Competitor alerts |
| `/investors` | GET | Search investor database |

See [Backend README](./Backend/README.md) for complete API documentation.

---

## Features

### Core Platform
- [x] Multi-model LLM Council with cross-critique
- [x] 4 domain-specific AI agents
- [x] True SSE streaming with fallback polling
- [x] RAG knowledge base with caching
- [x] Session management with pin/export
- [x] Document upload for chat context
- [x] Bookmarks system
- [x] User analytics dashboard
- [x] PWA with shortcuts

### Tools
- [x] Financial calculators (Runway, Burn Rate, Valuation, Unit Economics)
- [x] Searchable investor database (20+ real investors)
- [x] Real-time competitor alerts (3 per user, email notifications)
- [x] Customer outreach with AI lead discovery
- [x] Email campaign management with tracking

### Security & Enterprise
- [x] AES-256-GCM encryption for sensitive data
- [x] Encrypted user document storage
- [x] API key management
- [x] Webhook integrations
- [x] Audit logging
- [x] Rate limiting with presets
- [x] Admin user management (CRUD, suspend, pilot usage reset)
- [x] Bulk user operations
- [x] Usage tracking and reset

### Coming Soon
- [ ] Team workspaces
- [ ] Stripe integration
- [ ] Slack integration

---

## Customer Outreach

The outreach module enables AI-powered customer acquisition:

### Lead Discovery
- Discover influencers (People) or companies using AI-powered web research
- Filter by platform, niche, followers, location, company size
- Automatic lead scoring based on startup fit
- Rate limited to 5 discoveries per hour (pilot)

### Campaign Management
- **Single Template Mode**: Use variable placeholders like `{{name}}`, `{{company}}`
- **AI Personalized Mode**: Generate unique emails per lead using LLM
- Email tracking (opens, clicks)
- Unsubscribe handling
- Daily send limits (50 emails/day pilot)

### Pilot Limits
- 50 leads maximum
- 5 campaigns maximum
- 50 emails per day

---

## Roadmap

| Phase | Timeline | Features |
|-------|----------|----------|
| **Now** | Pilot | Single founder, 3 free requests/month, 4 agents, outreach tools |
| **Q1 2026** | Teams | Multiple founders, collaboration, shared sessions |
| **Q2 2026** | Idea Stage | Idea validation flow, market research agent |
| **Q3 2026** | Enterprise | SSO, custom AI training, on-premise deployment |

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/co-op.git

# Create feature branch
git checkout -b feature/amazing-feature

# Make changes and commit
git commit -m 'feat: add amazing feature'

# Push and create PR
git push origin feature/amazing-feature
```

---

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

<p align="center">
  Built with ❤️ for founders
</p>

<p align="center">
  <a href="https://github.com/Afnanksalal/co-op">GitHub</a> •
  <a href="https://github.com/Afnanksalal/co-op/issues">Issues</a> •
  <a href="https://github.com/Afnanksalal/co-op/discussions">Discussions</a>
</p>
