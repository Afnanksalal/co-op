# Co-Op Architecture

This document provides a comprehensive overview of the Co-Op platform architecture, system workflows, and design decisions.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Service Components](#service-components)
- [Data Flow](#data-flow)
- [LLM Council Architecture](#llm-council-architecture)
- [Agent System](#agent-system)
- [Authentication & Security](#authentication--security)
- [Database Schema](#database-schema)
- [API Design](#api-design)
- [Deployment Architecture](#deployment-architecture)
- [Design Decisions](#design-decisions)

---

## System Overview

Co-Op is a multi-service AI advisory platform consisting of three main components:

| Service | Technology | Purpose | Deployment |
|---------|------------|---------|------------|
| **Frontend** | Next.js 15 | Web application | Vercel |
| **Backend** | NestJS 11 | API server, LLM orchestration | Render |
| **RAG Service** | FastAPI | Vector search for documents | Koyeb |

### Core Principles

1. **Transparency** - Open source, documented architecture
2. **Accuracy** - Multi-model cross-critique reduces hallucinations
3. **Self-Hostable** - Can be deployed on your own infrastructure
4. **Modular** - Each service can be scaled independently

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                 │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Landing   │  │  Dashboard  │  │    Chat     │  │  Settings   │        │
│  │    Page     │  │             │  │  Interface  │  │             │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│                         Next.js 15 (Vercel)                                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              API GATEWAY                                    │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │   Rate      │  │   CORS      │  │  Validation │        │
│  │   Guard     │  │   Limiting  │  │   Headers   │  │   Pipes     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│                         NestJS 11 (Render)                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────────────────┐
│   AGENT SYSTEM      │  │   LLM COUNCIL   │  │      DATA SERVICES          │
│                     │  │                 │  │                             │
│  ┌───────────────┐  │  │  ┌───────────┐  │  │  ┌─────────┐ ┌───────────┐  │
│  │ Orchestrator  │  │  │  │   Groq    │  │  │  │ Postgres│ │   Redis   │  │
│  └───────────────┘  │  │  │  (Llama)  │  │  │  │  (Neon) │ │ (Upstash) │  │
│         │          │  │  └───────────┘  │  │  └─────────┘ └───────────┘  │
│  ┌──────┴──────┐   │  │  ┌───────────┐  │  │                             │
│  │    │    │   │   │  │  │  Google   │  │  │  ┌─────────┐ ┌───────────┐  │
│  ▼    ▼    ▼   ▼   │  │  │ (Gemini)  │  │  │  │Supabase │ │  QStash   │  │
│ Legal Fin Inv Comp │  │  └───────────┘  │  │  │(Auth+S3)│ │  (Queue)  │  │
│                     │  │  ┌───────────┐  │  │  └─────────┘ └───────────┘  │
└─────────────────────┘  │  │HuggingFace│  │  └─────────────────────────────┘
          │              │  │ (Mistral) │  │
          │              │  └───────────┘  │
          │              └─────────────────┘
          │
          ├─── RAG Query ───▶ ┌─────────────────────────────────────────────┐
          │                   │            RAG SERVICE                      │
          │                   │                                             │
          │                   │  ┌─────────────┐  ┌─────────────────────┐   │
          │                   │  │   FastAPI   │  │   Upstash Vector    │   │
          │                   │  │   Server    │──│   (768 dimensions)  │   │
          │                   │  └─────────────┘  └─────────────────────┘   │
          │                   │         │                                   │
          │                   │         ▼                                   │
          │                   │  ┌─────────────────────┐                    │
          │                   │  │  Supabase Storage   │                    │
          │                   │  │   (PDF Documents)   │                    │
          │                   │  └─────────────────────┘                    │
          │                   │                                             │
          │                   │         FastAPI (Koyeb)                     │
          │                   └─────────────────────────────────────────────┘
          │
          └─── Web Research ──▶ Google Gemini Search Grounding
```


---

## Service Components

### Frontend (Next.js 15)

| Component | Purpose |
|-----------|---------|
| `app/page.tsx` | Landing page with feature showcase |
| `app/login/page.tsx` | OAuth authentication (Google/GitHub) |
| `app/onboarding/page.tsx` | Multi-step startup profile setup |
| `app/(dashboard)/` | Protected dashboard routes |
| `lib/api/client.ts` | Type-safe API client with auth |
| `lib/supabase/` | Supabase auth client |

Key Features:
- Server-side rendering with App Router
- Supabase Auth integration
- Responsive design with Tailwind CSS
- Real-time task status polling

### Backend (NestJS 11)

| Module | Purpose |
|--------|---------|
| `agents/` | Domain-specific AI agents (Legal, Finance, Investor, Competitor) |
| `sessions/` | Chat session management with message history |
| `users/` | User management and onboarding |
| `startups/` | Startup profile CRUD |
| `api-keys/` | API key generation and validation |
| `webhooks/` | Webhook management and delivery |
| `admin/` | Admin operations (embeddings, analytics) |
| `analytics/` | Event tracking and dashboard stats |
| `mcp/` | Model Context Protocol server management |
| `notion/` | Notion integration for exports |

Common Services:
| Service | Purpose |
|---------|---------|
| `llm-council.service.ts` | Multi-model cross-critique orchestration |
| `llm-router.service.ts` | Provider routing with fallback |
| `rag.service.ts` | RAG service client |
| `research.service.ts` | Web research via Gemini grounding |
| `redis.service.ts` | Caching and rate limiting |
| `circuit-breaker.service.ts` | Fault tolerance for external services |
| `supabase.service.ts` | Auth token verification |

### RAG Service (FastAPI)

| Endpoint | Purpose |
|----------|---------|
| `POST /rag/register` | Register file for lazy vectorization |
| `POST /rag/vectorize/{id}` | Force immediate vectorization |
| `POST /rag/query` | Semantic search with context retrieval |
| `GET /rag/files` | List registered files |
| `DELETE /rag/files/{id}` | Delete file and vectors |
| `POST /rag/cleanup` | Remove expired vectors |

Key Features:
- Lazy vectorization (vectors created on first query)
- Domain/sector filtering for targeted search
- TTL-based vector cleanup
- Gemini text-embedding-004 (768 dimensions)

---

## Data Flow

### User Query Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│ Backend  │────▶│  Agent   │
│  Query   │     │  (Next)  │     │ (NestJS) │     │ Service  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                        │                │
                                        │                ▼
                                        │         ┌──────────┐
                                        │         │   RAG    │
                                        │         │ Service  │
                                        │         └──────────┘
                                        │                │
                                        ▼                ▼
                                  ┌──────────┐    ┌──────────┐
                                  │   LLM    │◀───│ Context  │
                                  │ Council  │    │ (Chunks) │
                                  └──────────┘    └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │  Final   │
                                  │ Response │
                                  └──────────┘
```

### Detailed Query Processing

1. **Frontend** sends authenticated request to `/agents/run` or `/agents/queue`
2. **Backend** validates auth, loads startup context
3. **Agent Service** determines if single-agent or multi-agent (A2A) mode
4. **RAG Service** retrieves relevant document context
5. **Research Service** fetches real-time web data (if needed)
6. **LLM Council** runs cross-critique workflow
7. **Response** synthesized and returned to user

---

## LLM Council Architecture

The LLM Council is the core innovation - a multi-model cross-critique system that reduces hallucinations and improves response quality.

### Council Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: GENERATION                               │
│                                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│   │  Groq   │    │ Google  │    │  HF     │    │  ...    │                 │
│   │ (Llama) │    │(Gemini) │    │(Mistral)│    │         │                 │
│   └────┬────┘    └────┬────┘    └────┬────┘    └────┬────┘                 │
│        │              │              │              │                       │
│        ▼              ▼              ▼              ▼                       │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│   │Response │    │Response │    │Response │    │Response │                 │
│   │   A     │    │   B     │    │   C     │    │   D     │                 │
│   └─────────┘    └─────────┘    └─────────┘    └─────────┘                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Shuffle for anonymity)
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 2: CROSS-CRITIQUE                             │
│                                                                             │
│   Each model critiques OTHER models' responses (not their own)              │
│                                                                             │
│   Model A critiques: B, C, D    →  Scores + Feedback                        │
│   Model B critiques: A, C, D    →  Scores + Feedback                        │
│   Model C critiques: A, B, D    →  Scores + Feedback                        │
│   Model D critiques: A, B, C    →  Scores + Feedback                        │
│                                                                             │
│   Critique Format:                                                          │
│   { score: 1-10, feedback: "...", strengths: [...], weaknesses: [...] }     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 3: SYNTHESIS                                 │
│                                                                             │
│   1. Calculate average scores per response                                  │
│   2. Select highest-scored response as base                                 │
│   3. Synthesize final response incorporating critique feedback              │
│   4. Apply response sanitization (remove markdown, guardrails)              │
│                                                                             │
│   Output: Clean, critique-improved response                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model Health Checks

On startup and every 5 minutes:
1. Test each configured model with minimal prompt
2. Mark models as: `healthy`, `unavailable`, `deprecated`, `error`
3. Only healthy models participate in council
4. Minimum 2 models required for cross-critique

### Supported Models

| Provider | Model | Purpose |
|----------|-------|---------|
| Groq | llama-3.3-70b-versatile | Fast inference, general tasks |
| Groq | llama-3.3-70b-specdec | Speculative decoding |
| Google | gemini-2.5-flash | Balanced speed/quality |
| HuggingFace | deepseek-ai/DeepSeek-R1-Distill-Qwen-32B | Reasoning model |
| HuggingFace | microsoft/Phi-3-mini-4k-instruct | Lightweight, fast |
| HuggingFace | Qwen/Qwen2.5-72B-Instruct | Large, high quality |

### Web Research with Fallback

The Research Service provides real-time web data with automatic fallback:

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESEARCH SERVICE                             │
│                                                                 │
│   Query ──▶ Gemini 2.0 Flash ──▶ Google Search Grounding       │
│                    │                                            │
│                    │ (if fails)                                 │
│                    ▼                                            │
│              ScrapingBee ──▶ Google SERP Fallback              │
│                    │                                            │
│                    ▼                                            │
│              Structured Results                                 │
│              - Web Results                                      │
│              - Company Info                                     │
│              - Investor Info                                    │
│              - Market Data                                      │
└─────────────────────────────────────────────────────────────────┘
```

**Primary**: Google Gemini with Search Grounding (gemini-2.0-flash)
- Real-time web search integrated into LLM
- Grounded responses with source citations
- Structured data extraction

**Fallback**: ScrapingBee Google SERP API
- Activates when Gemini grounding fails
- Returns organic search results
- Maintains service availability

---

## Agent System

### Agent Types

| Agent | Domain | Expertise |
|-------|--------|-----------|
| **Legal** | Startup law | Incorporation, IP, contracts, compliance |
| **Finance** | Financial planning | Fundraising, runway, unit economics |
| **Investor** | Fundraising | Pitch strategy, investor targeting, term sheets |
| **Competitor** | Market analysis | Competitive landscape, positioning, differentiation |

### Agent Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      SINGLE AGENT MODE                          │
│                                                                 │
│   Input ──▶ Draft ──▶ Critique ──▶ Final ──▶ Output            │
│              │          │           │                           │
│              ▼          ▼           ▼                           │
│           (LLM)      (LLM)       (LLM)                         │
│                                                                 │
│   Each phase uses LLM Council for cross-critique               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    MULTI-AGENT (A2A) MODE                       │
│                                                                 │
│   Input ──▶ All Agents Generate ──▶ Cross-Critique ──▶ Synth   │
│                    │                      │              │      │
│              ┌─────┴─────┐          ┌─────┴─────┐        │      │
│              ▼     ▼     ▼          ▼     ▼     ▼        ▼      │
│           Legal Finance Investor  Each agent    Final    │      │
│           Agent  Agent   Agent    critiques    Response  │      │
│                                   others                 │      │
└─────────────────────────────────────────────────────────────────┘
```

### Agent Input Context

Each agent receives:
```typescript
{
  context: {
    sessionId: string,
    userId: string,
    startupId: string,
    metadata: {
      companyName, tagline, description, website,
      industry, sector, businessModel, revenueModel,
      stage, foundedYear, teamSize, cofounderCount,
      country, city, operatingRegions,
      fundingStage, totalRaised, monthlyRevenue,
      targetCustomer, problemSolved, competitiveAdvantage
    }
  },
  prompt: string,        // User's question
  documents?: string[]   // Optional document references
}
```

---

## Authentication & Security

### Auth Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Supabase │────▶│ Frontend │────▶│ Backend  │
│  Login   │     │   Auth   │     │ Callback │     │  Guard   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │   OAuth Flow   │                │                │
     │   (Google/     │                │                │
     │    GitHub)     │                │                │
     │                │                │                │
     │                ▼                │                │
     │         ┌──────────┐            │                │
     │         │  JWT     │────────────┘                │
     │         │  Token   │                             │
     │         └──────────┘                             │
     │                                                  │
     │                                    ┌─────────────┘
     │                                    ▼
     │                              ┌──────────┐
     │                              │ Verify   │
     │                              │ Token    │
     │                              │ + Sync   │
     │                              │ User DB  │
     │                              └──────────┘
```

### Security Layers

| Layer | Implementation |
|-------|----------------|
| **Authentication** | Supabase JWT verification |
| **Authorization** | Role-based (user, admin) |
| **Rate Limiting** | Per-user throttling via Redis |
| **API Keys** | SHA-256 hashed, scoped permissions |
| **CORS** | Configured allowed origins |
| **Input Validation** | class-validator DTOs |
| **SQL Injection** | Drizzle ORM parameterized queries |

### API Key Authentication

For programmatic access:
```
Authorization: Bearer coop_sk_xxxx
```

API keys are:
- Hashed with SHA-256 before storage
- Scoped to specific permissions
- Revocable by user
- Rate limited separately

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     users       │       │    startups     │       │    sessions     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │──┐    │ id (PK)         │◀──┐   │ id (PK)         │
│ email           │  │    │ companyName     │   │   │ userId (FK)     │
│ name            │  │    │ founderName     │   │   │ startupId (FK)  │
│ role            │  │    │ industry        │   │   │ status          │
│ startupId (FK)  │──┼───▶│ sector          │   │   │ metadata        │
│ onboardingDone  │  │    │ stage           │   │   │ createdAt       │
│ createdAt       │  │    │ fundingStage    │   │   └────────┬────────┘
└─────────────────┘  │    │ ...             │   │            │
                     │    └─────────────────┘   │            │
                     │                          │            ▼
┌─────────────────┐  │    ┌─────────────────┐   │   ┌─────────────────┐
│   admin_users   │  │    │    api_keys     │   │   │session_messages │
├─────────────────┤  │    ├─────────────────┤   │   ├─────────────────┤
│ id (PK)         │  │    │ id (PK)         │   │   │ id (PK)         │
│ userId (FK)     │──┘    │ userId (FK)     │───┘   │ sessionId (FK)  │
│ permissions     │       │ keyHash         │       │ role            │
│ createdAt       │       │ name            │       │ content         │
└─────────────────┘       │ permissions     │       │ agent           │
                          │ lastUsedAt      │       │ metadata        │
                          └─────────────────┘       │ createdAt       │
                                                    └─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    webhooks     │       │   audit_logs    │       │   log_events    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ userId (FK)     │       │ userId (FK)     │       │ userId (FK)     │
│ url             │       │ action          │       │ eventType       │
│ events          │       │ resource        │       │ metadata        │
│ secret          │       │ resourceId      │       │ createdAt       │
│ isActive        │       │ metadata        │       └─────────────────┘
│ createdAt       │       │ createdAt       │
└─────────────────┘       └─────────────────┘

┌─────────────────┐
│   rag_files     │  (In RAG service DB)
├─────────────────┤
│ id (PK)         │
│ filename        │
│ storagePath     │
│ domain          │
│ sector          │
│ vectorStatus    │
│ chunkCount      │
│ lastAccessed    │
│ createdAt       │
└─────────────────┘
```

### Key Indexes

- `users_deleted_at_idx` - Soft delete filtering
- `users_startup_id_idx` - User-startup lookup
- `startups_industry_idx` - Industry filtering
- `startups_stage_idx` - Stage filtering
- `sessions_user_id_idx` - User sessions lookup

---

## API Design

### RESTful Conventions

| Method | Endpoint Pattern | Purpose |
|--------|------------------|---------|
| GET | `/resource` | List resources |
| GET | `/resource/:id` | Get single resource |
| POST | `/resource` | Create resource |
| PATCH | `/resource/:id` | Update resource |
| DELETE | `/resource/:id` | Delete resource |

### Response Format

Success:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "..." }
}
```

Error:
```json
{
  "success": false,
  "error": "Error message",
  "details": ["Validation error 1", "..."],
  "code": "ERROR_CODE"
}
```

### Key Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /agents/run` | JWT | Synchronous agent execution |
| `POST /agents/queue` | JWT | Async agent execution (QStash) |
| `GET /agents/tasks/:id` | JWT | Get task status |
| `POST /sessions` | JWT | Create chat session |
| `GET /sessions/:id/messages` | JWT | Get session messages |
| `POST /users/me/onboarding` | JWT | Complete onboarding |
| `POST /admin/embeddings/upload` | Admin | Upload RAG document |
| `GET /analytics/dashboard` | Admin | Dashboard statistics |

---

## Deployment Architecture

### Production Infrastructure

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLOUDFLARE                                     │
│                         (DNS + DDoS Protection)                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│      VERCEL         │  │     RENDER      │  │     KOYEB       │
│                     │  │                 │  │                 │
│  ┌───────────────┐  │  │  ┌───────────┐  │  │  ┌───────────┐  │
│  │   Next.js     │  │  │  │  NestJS   │  │  │  │  FastAPI  │  │
│  │   Frontend    │  │  │  │  Backend  │  │  │  │    RAG    │  │
│  └───────────────┘  │  │  └───────────┘  │  │  └───────────┘  │
│                     │  │                 │  │                 │
│  - Edge Functions   │  │  - Auto-scale   │  │  - Auto-scale   │
│  - CDN              │  │  - Health check │  │  - Health check │
│  - Preview deploys  │  │  - Zero-downtime│  │                 │
└─────────────────────┘  └─────────────────┘  └─────────────────┘
          │                      │                    │
          └──────────────────────┼────────────────────┘
                                 │
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MANAGED SERVICES                                  │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    Neon     │  │   Upstash   │  │  Supabase   │  │   QStash    │        │
│  │  Postgres   │  │    Redis    │  │  Auth + S3  │  │   Queue     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │  Upstash    │  │    Groq     │  │   Google    │                         │
│  │   Vector    │  │     API     │  │   AI API    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Environment Variables

| Service | Key Variables |
|---------|---------------|
| Frontend | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_*` |
| Backend | `DATABASE_URL`, `REDIS_URL`, `GROQ_API_KEY`, `GOOGLE_AI_API_KEY` |
| RAG | `SUPABASE_*`, `UPSTASH_VECTOR_*`, `GOOGLE_AI_API_KEY` |

### Scaling Considerations

- **Frontend**: Edge-deployed, auto-scales with Vercel
- **Backend**: Horizontal scaling on Render (multiple instances)
- **RAG**: Stateless, scales independently
- **Database**: Neon serverless auto-scales
- **Redis**: Upstash serverless, pay-per-request
- **Vector DB**: Upstash Vector, auto-scales

---

## Design Decisions

### Why Multi-Model Cross-Critique?

**Problem**: Single LLM responses can hallucinate or miss important nuances.

**Solution**: Multiple models critique each other's responses, similar to peer review in academia.

**Benefits**:
- Reduces hallucinations through consensus
- Catches errors one model might miss
- Provides confidence scores based on agreement
- Improves response quality through synthesis

### Why Lazy RAG Vectorization?

**Problem**: Pre-vectorizing all documents is expensive and slow.

**Solution**: Vectors are created on first query for a domain/sector.

**Benefits**:
- Faster document uploads
- Lower storage costs (only vectorize what's used)
- TTL-based cleanup removes unused vectors
- Re-vectorization on demand

### Why Separate RAG Service?

**Problem**: Embedding and vector operations are resource-intensive.

**Solution**: Dedicated FastAPI service for RAG operations.

**Benefits**:
- Independent scaling
- Python ecosystem for ML (langchain, pypdf)
- Isolated failures don't affect main API
- Can be replaced/upgraded independently

### Why QStash for Async Tasks?

**Problem**: LLM operations can take 30+ seconds.

**Solution**: QStash provides serverless message queue with webhooks.

**Benefits**:
- No infrastructure to manage
- Automatic retries with backoff
- Webhook-based completion notification
- Works with serverless deployments

### Why Drizzle ORM?

**Problem**: Need type-safe database access without heavy ORM overhead.

**Solution**: Drizzle provides TypeScript-first, lightweight ORM.

**Benefits**:
- Full TypeScript inference
- SQL-like query builder
- Minimal runtime overhead
- Easy migrations

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.


---

## Code Quality Review

This section documents potential issues, improvements, and best practices identified during code review.

### Issues Found & Fixed

#### 1. Mobile Responsiveness ✅
The frontend has good mobile responsiveness:
- Dashboard layout has mobile hamburger menu with slide-out navigation
- All pages use responsive grid layouts (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`)
- Text sizes scale appropriately (`text-sm sm:text-base`)
- Padding/margins adjust for mobile (`p-4 sm:p-6 md:p-8`)
- Chat page has mobile-optimized input and message display

#### 2. Error Handling ✅
- Backend has comprehensive `HttpExceptionFilter` for consistent error responses
- Frontend `ApiClient` properly handles error responses and validation errors
- Circuit breaker pattern implemented for external service calls (RAG, LLM providers)

#### 3. Security ✅
- SSRF prevention in webhooks service (blocks localhost, private IPs)
- HTTPS required for webhooks in production
- API keys hashed with SHA-256
- Rate limiting per user via Redis
- Input validation with class-validator DTOs

### Potential Improvements

#### Frontend

1. **Chat Page Memory Leak Prevention**
   - The `useEffect` for session initialization has proper cleanup
   - Consider adding AbortController for fetch requests on unmount

2. **Session Storage Cleanup**
   - `continueSession` in sessionStorage is properly cleaned up after use

3. **Loading States**
   - All pages have proper loading skeletons
   - Consider adding error boundaries for better error UX

#### Backend

1. **Database Connection Pooling**
   - Drizzle with node-postgres handles connection pooling
   - Consider monitoring pool exhaustion in high-traffic scenarios

2. **LLM Council Timeout Handling**
   - Individual model calls have timeouts
   - Consider adding overall council timeout to prevent long-running requests

3. **Webhook Retry Logic**
   - Exponential backoff implemented (1s, 5s, 15s)
   - Consider adding dead letter queue for failed webhooks

4. **Cache Invalidation**
   - User cache properly invalidated on updates
   - Consider cache warming for frequently accessed data

### Performance Considerations

1. **RAG Service**
   - Lazy vectorization reduces initial load time
   - TTL-based cleanup prevents vector storage bloat
   - Consider batch vectorization for large document uploads

2. **LLM Council**
   - Parallel model calls for generation phase
   - Health checks every 5 minutes prevent using unhealthy models
   - Consider caching common queries

3. **Frontend**
   - Next.js App Router with server components
   - Client-side state management with Zustand
   - Consider implementing SWR/React Query for data fetching

### Testing Recommendations

1. **Unit Tests**
   - Add tests for LLM Council critique parsing
   - Add tests for webhook signature verification
   - Add tests for API key hashing/validation

2. **Integration Tests**
   - Test agent orchestration flow
   - Test session message persistence
   - Test webhook delivery

3. **E2E Tests**
   - Test onboarding flow (both user types)
   - Test chat conversation flow
   - Test admin operations

### Monitoring Recommendations

1. **Metrics to Track**
   - LLM model response times and error rates
   - RAG query latency and hit rates
   - Webhook delivery success rates
   - API endpoint response times

2. **Alerts to Configure**
   - LLM model health check failures
   - Database connection pool exhaustion
   - High error rates on critical endpoints
   - Webhook delivery failures
