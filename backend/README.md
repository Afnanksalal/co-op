# Co-Op Backend

<p>
  <img src="https://img.shields.io/badge/NestJS-11-red?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Drizzle_ORM-Latest-green" alt="Drizzle">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?logo=docker" alt="Docker">
</p>

Enterprise-grade NestJS backend powering AI-driven startup advisory services with multi-model LLM Council architecture, real-time web research, and MCP server integration.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [LLM Council](#llm-council)
- [AI Agents](#ai-agents)
- [RAG Integration](#rag-integration)
- [Web Research](#web-research)
- [MCP Server](#mcp-server)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Deployment](#deployment)
- [Development](#development)

---

## Overview

Co-Op Backend is an open-source AI platform providing startup founders with intelligent advisory services. The platform uses a unique **LLM Council** architecture where multiple AI models **mandatorily cross-critique** each other to ensure accuracy and reduce hallucinations.

### Key Differentiators

| Feature | Description |
|---------|-------------|
| **LLM Council** | 2-5 models cross-critique every response (mandatory) |
| **Web Research** | Google Gemini Search Grounding + ScrapingBee fallback |
| **RAG Integration** | Semantic document search for legal/finance domains |
| **MCP Protocol** | Expose agents as tools for Claude, Cursor, Kiro |
| **Production-Ready** | Circuit breakers, rate limiting, audit logging, metrics |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                    │
│  NestJS 11  │  Helmet  │  CORS  │  Rate Limiting  │  Validation             │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│   AUTH LAYER    │       │   BUSINESS LOGIC    │       │   MCP SERVER    │
├─────────────────┤       ├─────────────────────┤       ├─────────────────┤
│ Supabase Auth   │       │ Users Module        │       │ Tool Discovery  │
│ JWT Validation  │       │ Sessions Module     │       │ Tool Execution  │
│ API Key Auth    │       │ Agents Module       │       │ Multi-Agent     │
│ Admin Guard     │       │ Webhooks Module     │       └─────────────────┘
└─────────────────┘       │ Analytics Module    │
                          └─────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│   LLM COUNCIL   │       │   INFRASTRUCTURE    │       │   EXTERNAL      │
├─────────────────┤       ├─────────────────────┤       ├─────────────────┤
│ Groq Provider   │       │ PostgreSQL (Drizzle)│       │ RAG Service     │
│ Google Provider │       │ Redis (Upstash)     │       │ Notion API      │
│ HuggingFace     │       │ QStash Queue        │       │ Web Research    │
│ Cross-Critique  │       │ Circuit Breaker     │       │ (Gemini Search) │
└─────────────────┘       └─────────────────────┘       └─────────────────┘
```

### Module Structure

```
src/
├── common/                    # Shared utilities
│   ├── audit/                 # Audit logging
│   ├── cache/                 # Redis caching
│   ├── circuit-breaker/       # Fault tolerance
│   ├── decorators/            # @CurrentUser, etc.
│   ├── dto/                   # Shared DTOs
│   ├── filters/               # Exception filters
│   ├── guards/                # Auth, API key, admin, throttle
│   ├── llm/                   # LLM Council
│   │   ├── providers/         # Groq, Google, HuggingFace
│   │   ├── llm-council.service.ts
│   │   └── llm-router.service.ts
│   ├── metrics/               # Prometheus metrics
│   ├── qstash/                # Serverless queue
│   ├── rag/                   # RAG client
│   ├── redis/                 # Upstash Redis
│   ├── research/              # Web research (Gemini)
│   └── supabase/              # Auth & storage
├── config/                    # Environment config
├── database/                  # Drizzle ORM
│   └── schema/                # Table definitions
└── modules/                   # Feature modules
    ├── admin/                 # Admin operations
    ├── agents/                # AI agents
    │   ├── domains/           # Legal, finance, investor, competitor
    │   ├── orchestrator/      # Multi-agent orchestration
    │   └── queue/             # QStash job processing
    ├── analytics/             # Event tracking
    ├── api-keys/              # API key management
    ├── health/                # Health checks
    ├── mcp/                   # MCP client
    ├── mcp-server/            # MCP server (expose agents)
    ├── notion/                # Notion integration
    ├── sessions/              # Chat sessions
    ├── startups/              # Startup profiles
    ├── users/                 # User management
    └── webhooks/              # Webhook subscriptions
```

---

## Quick Start

### Prerequisites

- Node.js 22+
- PostgreSQL (Neon recommended)
- Upstash Redis account
- Supabase project
- At least 2 LLM API keys (for council cross-critique)

### Installation

```bash
# Clone repository
git clone https://github.com/Afnanksalal/co-op.git
cd co-op/Backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your credentials

# Push database schema
npm run db:push

# Start development server
npm run dev
```

API available at `http://localhost:3000/api/v1`
Swagger docs at `http://localhost:3000/docs` (dev only)

---

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Supabase
SUPABASE_URL="https://project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_KEY="eyJ..."

# Upstash Redis (REST API)
UPSTASH_REDIS_URL="https://instance.upstash.io"
UPSTASH_REDIS_TOKEN="AX..."

# Upstash QStash (Serverless Queue)
QSTASH_TOKEN="eyJ..."
QSTASH_CURRENT_SIGNING_KEY="sig_..."
QSTASH_NEXT_SIGNING_KEY="sig_..."

# LLM Providers (minimum 2 for council)
GROQ_API_KEY="gsk_..."           # Llama 3.3, GPT OSS
GOOGLE_AI_API_KEY="AI..."        # Gemini 3 + Web Research
HUGGINGFACE_API_KEY="hf_..."     # DeepSeek R1, Llama 3
```

### Optional Variables

```bash
# Server
NODE_ENV="development"
PORT="3000"
API_PREFIX="api/v1"
LOG_LEVEL="debug"

# Security
MASTER_API_KEY=""                # For MCP server & metrics
CORS_ORIGINS="http://localhost:3000,https://co-op-dev.vercel.app"

# Rate Limiting
THROTTLE_TTL="60"
THROTTLE_LIMIT="100"

# LLM Council
LLM_COUNCIL_MIN_MODELS="2"       # Minimum for cross-critique
LLM_COUNCIL_MAX_MODELS="5"

# RAG Service
RAG_SERVICE_URL="https://your-rag.koyeb.app"
RAG_API_KEY=""

# Web Research Fallback
SCRAPINGBEE_API_KEY=""           # When Gemini fails

# Notion
NOTION_API_TOKEN=""
NOTION_DEFAULT_PAGE_ID=""
```

See `.env.example` for complete documentation.

---

## LLM Council

The LLM Council ensures response accuracy through **mandatory cross-critique** between multiple AI models.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 1: GENERATE                            │
│  All models generate responses to the same prompt               │
│  [Llama 3.3] [Gemini 3] [GPT OSS] [DeepSeek] [Llama 3]         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              PHASE 2: SHUFFLE & CRITIQUE (MANDATORY)            │
│  Responses anonymized and shuffled                              │
│  Each model critiques OTHER models' responses                   │
│  Scores 1-10 with strengths/weaknesses                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PHASE 3: SYNTHESIZE                          │
│  Best response selected by consensus score                      │
│  Improved with critique feedback                                │
│  Final answer with confidence score                             │
└─────────────────────────────────────────────────────────────────┘
```

### Available Models

| Provider | Model | Speed | Notes |
|----------|-------|-------|-------|
| Groq | Llama 3.3 70B | Fast | Excellent reasoning |
| Groq | GPT OSS 120B | Fast | Large context |
| Google | Gemini 3 Pro | Fast | Also enables web research |
| HuggingFace | DeepSeek R1 32B | Medium | Strong reasoning |
| HuggingFace | Llama 3 8B | Medium | Lightweight |

### Health Checks

Models are health-checked on startup and every 5 minutes:
- Deprecated models automatically excluded
- Transient failures recovered automatically
- Minimum 2 healthy models required

---

## AI Agents

### Agent Types

| Agent | Purpose | Data Source |
|-------|---------|-------------|
| **Legal** | Corporate structure, IP, compliance, contracts | RAG (documents) |
| **Finance** | Financial modeling, metrics, runway, valuation | RAG (documents) |
| **Investor** | VC matching, pitch optimization, fundraising | Web Research |
| **Competitor** | Market landscape, positioning, intelligence | Web Research |

### Sectors

All agents support filtering by startup sector:
- `fintech` - Financial technology
- `greentech` - Clean/green technology
- `healthtech` - Healthcare technology
- `saas` - Software as a Service
- `ecommerce` - E-commerce

### Agent Flow

```
User Question
     │
     ▼
┌─────────────────┐
│  Orchestrator   │
│  Select Agent   │
└─────────────────┘
     │
     ├─── Legal/Finance ───▶ RAG Service ───▶ Document Context
     │
     └─── Investor/Competitor ───▶ Research Service ───▶ Web Context
                                        │
                                        ▼
                              ┌─────────────────┐
                              │   LLM Council   │
                              │  Cross-Critique │
                              └─────────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  Final Answer   │
                              │  + Confidence   │
                              └─────────────────┘
```

---

## RAG Integration

The backend integrates with an external RAG service for semantic document search. **RAG returns context only** - all answer generation is handled by the LLM Council.

### Flow

```
Admin uploads PDF → Supabase Storage → Register with RAG (pending)
                                              │
User queries Legal/Finance agent             │
                                              ▼
                                    RAG Service (Koyeb)
                                    - Lazy vectorization
                                    - Vector search
                                    - Return context chunks
                                              │
                                              ▼
                                    Backend LLM Council
                                    - Inject context into prompt
                                    - Cross-critique answer
```

### Configuration

```bash
RAG_SERVICE_URL="https://your-rag.koyeb.app"
RAG_API_KEY="your-secure-key"
```

---

## Web Research

Investor and competitor agents use real-time web research powered by **Google Gemini with Search Grounding**.

### Primary: Gemini Search Grounding

```typescript
// Uses Gemini 2.0 Flash with google_search tool
const model = client.getGenerativeModel({
  model: 'gemini-2.0-flash',
  tools: [{ googleSearch: {} }],
});
```

### Fallback: ScrapingBee

When Gemini fails or is rate-limited:

```bash
SCRAPINGBEE_API_KEY="your-key"  # Optional but recommended
```

### Research Types

| Type | Use Case |
|------|----------|
| `competitor` | Competitor analysis, market landscape |
| `investor` | VC/angel search, funding activity |
| `company` | Company profiles, funding history |
| `market` | Market size, trends, growth rates |

---

## MCP Server

Expose AI agents as MCP tools for Claude Desktop, Cursor, Kiro, and other MCP clients.

### Available Tools

| Tool | Description | Data Source |
|------|-------------|-------------|
| `legal_analysis` | Legal advice for startups | RAG |
| `finance_analysis` | Financial modeling | RAG |
| `investor_search` | Find relevant investors | Web Research |
| `competitor_analysis` | Competitive intelligence | Web Research |
| `multi_agent_query` | Query multiple agents | Mixed |

### Discovery

```bash
curl -X GET https://api.example.com/api/v1/mcp-server/discover \
  -H "X-API-Key: <MASTER_API_KEY>"
```

### Execute Tool

```bash
curl -X POST https://api.example.com/api/v1/mcp-server/execute \
  -H "X-API-Key: <MASTER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "investor_search",
    "arguments": {
      "prompt": "Find seed VCs for AI startups",
      "companyName": "MyStartup",
      "industry": "ai",
      "stage": "seed",
      "country": "US",
      "sector": "saas"
    }
  }'
```

---

## API Reference

### Authentication

```bash
# User auth (Supabase JWT)
curl -H "Authorization: Bearer <jwt>" \
  https://api.example.com/api/v1/users/me

# Service auth (API Key)
curl -H "X-API-Key: coop_xxxxx" \
  https://api.example.com/api/v1/mcp-server/discover

# Master API Key (metrics, MCP server)
curl -H "X-API-Key: <MASTER_API_KEY>" \
  https://api.example.com/api/v1/metrics
```

### Endpoints

#### Users & Onboarding

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user |
| GET | `/users/me/onboarding-status` | Check onboarding |
| POST | `/users/me/onboarding` | Complete onboarding |
| PATCH | `/users/me/startup` | Update startup |

#### Sessions

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | Create session |
| GET | `/sessions` | List sessions |
| GET | `/sessions/:id` | Get session |
| POST | `/sessions/:id/end` | End session |
| GET | `/sessions/:id/messages` | Get messages |
| POST | `/sessions/:id/messages` | Add message |

#### Agents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/agents/run` | Run agent (sync) |
| POST | `/agents/queue` | Queue agent (async) |
| GET | `/agents/tasks/:taskId` | Get task status |
| DELETE | `/agents/tasks/:taskId` | Cancel task |
| GET | `/agents/stream/:taskId` | SSE stream |

#### MCP Server

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mcp-server/discover` | List tools |
| POST | `/mcp-server/execute` | Execute tool |

#### Webhooks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/webhooks` | Create webhook |
| GET | `/webhooks` | List webhooks |
| PATCH | `/webhooks/:id` | Update webhook |
| DELETE | `/webhooks/:id` | Delete webhook |

#### API Keys

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api-keys` | Create API key |
| GET | `/api-keys` | List API keys |
| DELETE | `/api-keys/:id` | Revoke API key |

#### Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/admin/embeddings/upload` | Upload PDF |
| GET | `/admin/embeddings` | List embeddings |
| DELETE | `/admin/embeddings/:id` | Delete embedding |

#### Health & Metrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts |
| `startups` | Startup profiles |
| `sessions` | Chat sessions |
| `session_messages` | Messages |
| `admin_users` | Admin roles |
| `log_events` | Analytics |
| `webhooks` | Webhook subscriptions |
| `audit_logs` | Audit trail |
| `rag_files` | RAG document metadata |

### Commands

```bash
npm run db:push      # Push schema to database
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

---

## Deployment

### Render (Recommended)

1. Create Web Service on Render
2. Connect repository
3. Settings:
   - Runtime: Docker
   - Dockerfile: `./Dockerfile`
   - Health Check: `/api/v1/health`
4. Add environment variables
5. Deploy

### Docker

```bash
# Build
docker build -t co-op-backend .

# Run
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e SUPABASE_URL="..." \
  co-op-backend
```

### Required Services

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| [Neon](https://neon.tech) | PostgreSQL | Yes |
| [Supabase](https://supabase.com) | Auth & Storage | Yes |
| [Upstash](https://upstash.com) | Redis + QStash | Yes |
| [Groq](https://console.groq.com) | LLM | Yes |
| [Google AI](https://aistudio.google.com) | LLM + Research | Yes |
| [HuggingFace](https://huggingface.co) | LLM | Yes |

---

## Development

### Scripts

```bash
npm run dev          # Start dev server (watch)
npm run build        # Production build
npm run start:prod   # Start production
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run test         # Run tests
npm run test:cov     # Coverage report
```

### Code Style

- ESLint 9 with strict TypeScript
- Prettier formatting
- Conventional commits

### Testing

```bash
npm run test         # Unit tests
npm run test:e2e     # E2E tests
npm run test:cov     # Coverage
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](../LICENSE) for details.
