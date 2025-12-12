# Co-Op Backend

Enterprise-grade NestJS backend powering AI-driven startup advisory services with multi-model LLM Council architecture, real-time web research, and MCP server integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Authentication](#authentication)
- [LLM Council](#llm-council)
- [MCP Server Integration](#mcp-server-integration)
- [Deployment](#deployment)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

Co-Op Backend is an open-source AI platform that provides startup founders with intelligent advisory services across legal, finance, investor relations, and competitive analysis domains. The platform uses a unique "LLM Council" architecture where multiple AI models cross-critique each other to ensure accuracy and reduce hallucinations.

### Key Differentiators

- **LLM Council**: Mandatory cross-critique between 2-5 models for every response
- **Real-time Research**: Google Gemini with Search Grounding for live web data
- **MCP Protocol**: Expose AI agents as tools for Claude Desktop, Cursor, and other MCP clients
- **Production-Ready**: Circuit breakers, rate limiting, audit logging, and Prometheus metrics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│  Web App (React)  │  Mobile App  │  MCP Clients (Claude/Cursor)  │  API    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  NestJS 11  │  Helmet  │  CORS  │  Rate Limiting  │  Validation            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│   AUTH LAYER    │       │   BUSINESS LOGIC    │       │   MCP SERVER    │
├─────────────────┤       ├─────────────────────┤       ├─────────────────┤
│ Supabase Auth   │       │ Users Module        │       │ Tool Discovery  │
│ JWT Validation  │       │ Sessions Module     │       │ Tool Execution  │
│ API Key Auth    │       │ Agents Module       │       │ A2A Protocol    │
│ Admin Guard     │       │ Startups Module     │       └─────────────────┘
└─────────────────┘       │ Analytics Module    │
                          │ Webhooks Module     │
                          │ Notion Module       │
                          └─────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────────┐       ┌─────────────────┐
│   LLM COUNCIL   │       │   INFRASTRUCTURE    │       │   EXTERNAL      │
├─────────────────┤       ├─────────────────────┤       ├─────────────────┤
│ Groq Provider   │       │ PostgreSQL (Drizzle)│       │ RAG Service     │
│ Google Provider │       │ Redis (Upstash)     │       │ Notion API      │
│ HuggingFace     │       │ BullMQ Queues       │       │ Web Research    │
│ Cross-Critique  │       │ Circuit Breaker     │       │ (Gemini Search) │
│ Consensus       │       │ Prometheus Metrics  │       └─────────────────┘
└─────────────────┘       └─────────────────────┘
```

### Module Structure

```
src/
├── common/                    # Shared utilities and services
│   ├── audit/                 # Audit logging service
│   ├── cache/                 # Redis-backed caching
│   ├── circuit-breaker/       # Fault tolerance
│   ├── decorators/            # Custom decorators (@CurrentUser, etc.)
│   ├── dto/                   # Shared DTOs (pagination)
│   ├── filters/               # Exception filters
│   ├── guards/                # Auth, API key, admin, throttle guards
│   ├── llm/                   # LLM Council implementation
│   │   ├── providers/         # Groq, Google, HuggingFace
│   │   ├── llm-council.service.ts
│   │   └── llm-router.service.ts
│   ├── metrics/               # Prometheus metrics
│   ├── rag/                   # RAG service client
│   ├── redis/                 # Upstash Redis client
│   ├── research/              # Web research (Gemini Search)
│   └── supabase/              # Supabase auth & storage
├── config/                    # Environment configuration
├── database/                  # Drizzle ORM
│   ├── schema/                # Table definitions
│   └── database.module.ts
├── modules/                   # Feature modules
│   ├── admin/                 # Admin operations
│   ├── agents/                # AI agents (legal, finance, etc.)
│   │   ├── domains/           # Domain-specific agents
│   │   ├── orchestrator/      # Multi-agent orchestration
│   │   ├── queue/             # BullMQ job processing
│   │   └── a2a/               # Agent-to-Agent protocol
│   ├── analytics/             # Event tracking & dashboards
│   ├── api-keys/              # API key management
│   ├── health/                # Health checks
│   ├── mcp/                   # MCP client (external servers)
│   ├── mcp-server/            # MCP server (expose agents)
│   ├── notion/                # Notion integration
│   ├── sessions/              # Chat sessions
│   ├── startups/              # Startup profiles
│   ├── users/                 # User management
│   └── webhooks/              # Webhook subscriptions
└── main.ts                    # Application bootstrap
```

---

## Tech Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | NestJS 11 | Modular Node.js framework |
| **Language** | TypeScript 5.6 | Type safety |
| **Database** | PostgreSQL | Primary data store |
| **ORM** | Drizzle ORM | Type-safe SQL |
| **Cache** | Upstash Redis | Caching & rate limiting |
| **Queue** | BullMQ | Async job processing |
| **Auth** | Supabase Auth | JWT authentication |
| **Storage** | Supabase Storage | File uploads |
| **LLM** | Groq, Google AI, HuggingFace | Multi-provider AI |
| **Research** | Google Gemini | Web search grounding |
| **Validation** | class-validator, Zod | Input validation |
| **Docs** | Swagger/OpenAPI | API documentation |
| **Metrics** | Prometheus | Observability |
| **Container** | Docker | Deployment |

---

## Features

### AI Agents

| Agent | Purpose | Capabilities |
|-------|---------|--------------|
| **Legal** | Legal advisory | Contract review, compliance, IP guidance |
| **Finance** | Financial modeling | Runway analysis, burn rate, projections |
| **Investor** | Investor relations | VC search, pitch feedback, term sheets |
| **Competitor** | Competitive intel | Market analysis, competitor tracking |

### Core Capabilities

- **LLM Council**: Cross-critique consensus for accuracy
- **Multi-Agent Queries**: Query multiple agents in parallel
- **SSE Streaming**: Real-time response streaming
- **Task Queue**: Async processing with BullMQ
- **Web Research**: Real-time grounded search
- **RAG Integration**: Semantic document search
- **MCP Server**: Expose agents as MCP tools
- **Webhooks**: Event-driven integrations
- **Notion Export**: Export outputs to Notion

### Security & Reliability

- **Authentication**: Supabase JWT + API keys
- **Authorization**: Role-based access control
- **Rate Limiting**: Per-user throttling
- **Circuit Breaker**: Fault tolerance
- **Audit Logging**: Full audit trail
- **SSRF Protection**: Webhook URL validation
- **Timing-Safe Auth**: Prevent timing attacks

---

## Quick Start

### Prerequisites

- Node.js 22+
- npm 10+
- PostgreSQL database (Neon, Supabase, or local)
- Upstash Redis account
- Supabase project
- At least one LLM API key (Groq, Google AI, or HuggingFace)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/co-op.git
cd co-op/backend

# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# See Environment Configuration section below

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The API will be available at `http://localhost:3000/api/v1`

Swagger documentation: `http://localhost:3000/docs`

---

## Environment Configuration

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Supabase
SUPABASE_URL="https://project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_KEY="eyJ..."

# Upstash Redis (REST API for caching)
UPSTASH_REDIS_URL="https://instance.upstash.io"
UPSTASH_REDIS_TOKEN="AX..."

# Upstash Redis (Standard for BullMQ)
UPSTASH_REDIS_HOST="instance.upstash.io"
UPSTASH_REDIS_PORT="6379"
UPSTASH_REDIS_PASSWORD="AX..."

# At least ONE LLM provider
GROQ_API_KEY="gsk_..."           # Recommended
GOOGLE_AI_API_KEY="AI..."        # Also enables web research
HUGGINGFACE_API_KEY="hf_..."
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
CORS_ORIGINS="http://localhost:3000"

# Rate Limiting
THROTTLE_TTL="60"
THROTTLE_LIMIT="100"

# LLM Council
LLM_COUNCIL_MIN_MODELS="2"
LLM_COUNCIL_MAX_MODELS="5"

# RAG Service (optional)
RAG_SERVICE_URL="http://localhost:8000"
RAG_API_KEY=""

# Notion (optional)
NOTION_API_TOKEN=""
NOTION_DEFAULT_PAGE_ID=""

# Storage
SUPABASE_STORAGE_BUCKET="documents"
```

See `.env.example` for full documentation of all variables.

---

## Database Schema

### Tables

| Table | Purpose |
|-------|---------|
| `users` | User accounts with OAuth tracking |
| `startups` | Startup profiles with business context |
| `sessions` | Chat sessions |
| `session_messages` | Messages within sessions |
| `admin_users` | Admin role assignments |
| `log_events` | Analytics events |
| `webhooks` | Webhook subscriptions |
| `audit_logs` | Audit trail with IP tracking |
| `mcp_integrations` | MCP server configurations |

### Schema Management

```bash
# Push schema changes to database
npm run db:push

# Generate migration files
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio (GUI)
npm run db:studio
```

---

## API Reference

### Base URL

```
Production: https://your-app.onrender.com/api/v1
Development: http://localhost:3000/api/v1
```

### Endpoints Overview


#### Health & Metrics

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/health` | Health check | None |
| GET | `/metrics` | Prometheus metrics | API Key |

#### Users & Onboarding

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users/me` | Get current user | Bearer |
| GET | `/users/me/onboarding-status` | Check onboarding | Bearer |
| POST | `/users/me/onboarding` | Complete onboarding | Bearer |
| PATCH | `/users/me/startup` | Update startup | Bearer |
| PATCH | `/users/me` | Update profile | Bearer |

#### Sessions

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/sessions` | Create session | Bearer |
| GET | `/sessions` | List sessions | Bearer |
| GET | `/sessions/:id` | Get session | Bearer |
| POST | `/sessions/:id/end` | End session | Bearer |
| GET | `/sessions/:id/messages` | Get messages | Bearer |
| POST | `/sessions/:id/messages` | Add message | Bearer |

#### Agents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/agents/run` | Run agent (sync) | Bearer |
| POST | `/agents/queue` | Queue agent (async) | Bearer |
| GET | `/agents/tasks/:taskId` | Get task status | Bearer |
| DELETE | `/agents/tasks/:taskId` | Cancel task | Bearer |
| GET | `/agents/stream/:taskId` | SSE stream | Bearer |

#### MCP Server

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/mcp-server/discover` | List available tools | API Key |
| POST | `/mcp-server/execute` | Execute a tool | API Key |

#### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/embeddings/upload` | Upload PDF | Admin |
| GET | `/admin/embeddings` | List embeddings | Admin |
| DELETE | `/admin/embeddings/:id` | Delete embedding | Admin |

#### Webhooks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/webhooks` | Create webhook | Bearer |
| GET | `/webhooks` | List webhooks | Bearer |
| PATCH | `/webhooks/:id` | Update webhook | Bearer |
| DELETE | `/webhooks/:id` | Delete webhook | Bearer |

#### Notion

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notion/status` | Integration status | Bearer |
| GET | `/notion/pages` | Search pages | Bearer |
| POST | `/notion/export` | Export to Notion | Bearer |

#### API Keys

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api-keys` | Create API key | Bearer |
| GET | `/api-keys` | List API keys | Bearer |
| DELETE | `/api-keys/:id` | Revoke API key | Bearer |

Full interactive documentation available at `/docs` (Swagger UI) in development mode.

---

## Authentication

### User Authentication (Supabase JWT)

For end-user requests, use Supabase access tokens:

```bash
curl -X GET https://api.example.com/api/v1/users/me \
  -H "Authorization: Bearer <supabase_access_token>"
```

### Service Authentication (API Key)

For service-to-service calls, use API keys:

```bash
curl -X GET https://api.example.com/api/v1/mcp-server/discover \
  -H "X-API-Key: coop_xxxxxxxxxxxxx"
```

### Master API Key

For MCP server and metrics access, use the `MASTER_API_KEY`:

```bash
curl -X GET https://api.example.com/api/v1/metrics \
  -H "X-API-Key: <MASTER_API_KEY>"
```

---

## LLM Council

The LLM Council is a unique architecture that ensures response accuracy through mandatory cross-critique between multiple AI models.

### How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│                        LLM COUNCIL FLOW                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. GENERATE                                                    │
│     ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐        │
│     │ Llama   │  │ Gemini  │  │ Mistral │  │  Qwen   │        │
│     │  3.3    │  │  1.5    │  │   7B    │  │   3     │        │
│     └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘        │
│          │            │            │            │              │
│          ▼            ▼            ▼            ▼              │
│     ┌─────────────────────────────────────────────────┐       │
│     │              Anonymous Responses                 │       │
│     └─────────────────────────────────────────────────┘       │
│                            │                                   │
│  2. SHUFFLE & CRITIQUE     ▼                                   │
│     ┌─────────────────────────────────────────────────┐       │
│     │  Each model critiques others (MANDATORY)        │       │
│     │  - Identifies errors and inconsistencies        │       │
│     │  - Scores 1-10 with reasoning                   │       │
│     └─────────────────────────────────────────────────┘       │
│                            │                                   │
│  3. SYNTHESIZE             ▼                                   │
│     ┌─────────────────────────────────────────────────┐       │
│     │  Best response improved with critique feedback   │       │
│     │  - Concise bullet points                        │       │
│     │  - Token-efficient output                       │       │
│     └─────────────────────────────────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Available Models

| Provider | Model | Family | Speed |
|----------|-------|--------|-------|
| Groq | Llama 3.3 70B | Meta Llama | Fast |
| Groq | Llama 4 Scout | Meta Llama 4 | Fast |
| Groq | Qwen 3 32B | Alibaba Qwen | Fast |
| Groq | Kimi K2 | Moonshot | Fast |
| Google | Gemini 1.5 Flash | Google Gemini | Fast |
| HuggingFace | Mistral 7B | Mistral AI | Medium |
| HuggingFace | Phi-3 Mini | Microsoft Phi | Medium |

### Configuration

```bash
# Minimum models for council (default: 2)
LLM_COUNCIL_MIN_MODELS="2"

# Maximum models to use (default: 5)
LLM_COUNCIL_MAX_MODELS="5"
```

---

## MCP Server Integration

The backend exposes AI agents as MCP (Model Context Protocol) tools for use with:

- Claude Desktop
- Cursor IDE
- Kiro IDE
- Any MCP-compatible client

### Available Tools

| Tool | Description | Research |
|------|-------------|----------|
| `legal_analysis` | Legal advice and compliance | No |
| `finance_analysis` | Financial modeling and projections | No |
| `investor_search` | Find relevant investors | Yes |
| `competitor_analysis` | Competitive intelligence | Yes |
| `multi_agent_query` | Query multiple agents at once | Mixed |

### Discovery Endpoint

```bash
curl -X GET https://api.example.com/api/v1/mcp-server/discover \
  -H "X-API-Key: <MASTER_API_KEY>"
```

Response:
```json
{
  "tools": [
    {
      "name": "legal_analysis",
      "description": "Get legal advice for startups",
      "inputSchema": {
        "type": "object",
        "properties": {
          "prompt": { "type": "string" },
          "companyName": { "type": "string" },
          "industry": { "type": "string" },
          "stage": { "type": "string" },
          "country": { "type": "string" }
        },
        "required": ["prompt"]
      }
    }
  ],
  "a2a": {
    "supported": true,
    "capabilities": ["task_delegation", "status_polling"]
  }
}
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
      "country": "US"
    }
  }'
```

### Multi-Agent Query

```bash
curl -X POST https://api.example.com/api/v1/mcp-server/execute \
  -H "X-API-Key: <MASTER_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "multi_agent_query",
    "arguments": {
      "prompt": "Prepare for Series A fundraising",
      "agents": ["legal", "finance", "investor"],
      "companyName": "MyStartup",
      "industry": "saas",
      "stage": "seed",
      "country": "US"
    }
  }'
```

---

## Deployment

### Render (Recommended)

#### Option 1: Blueprint (Automatic)

1. Push code to GitHub/GitLab
2. Go to Render Dashboard → Blueprints → New Blueprint Instance
3. Connect repo and select `render.yaml`
4. Configure environment variables (marked `sync: false`)
5. Deploy

#### Option 2: Manual

1. Create new Web Service on Render
2. Connect your repository
3. Settings:
   - Runtime: Docker
   - Dockerfile Path: `./Dockerfile`
   - Health Check: `/api/v1/health`
4. Add all environment variables from `.env.example`
5. Deploy

### Docker

```bash
# Build image
docker build -t co-op-backend .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e SUPABASE_URL="..." \
  -e UPSTASH_REDIS_URL="..." \
  co-op-backend
```

### Required External Services

| Service | Purpose | Free Tier | Link |
|---------|---------|-----------|------|
| Neon | PostgreSQL | Yes | [neon.tech](https://neon.tech) |
| Supabase | Auth & Storage | Yes | [supabase.com](https://supabase.com) |
| Upstash | Redis | Yes | [upstash.com](https://upstash.com) |
| Groq | LLM inference | Yes | [console.groq.com](https://console.groq.com) |
| Google AI | Gemini + Research | Yes | [aistudio.google.com](https://aistudio.google.com) |
| HuggingFace | LLM inference | Yes | [huggingface.co](https://huggingface.co) |

---

## Development

### Scripts

```bash
npm run dev          # Start dev server (watch mode)
npm run build        # Build for production
npm run start:prod   # Start production server
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run test         # Run tests
npm run test:cov     # Run tests with coverage
npm run db:push      # Push schema to database
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
npm run db:studio    # Open Drizzle Studio
```

### Code Style

- ESLint 9 with strict TypeScript rules
- Prettier for formatting
- Conventional commits

### Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:cov
```

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT License - see [LICENSE](LICENSE) for details.

---

Built with ❤️ by the Co-Op Team
