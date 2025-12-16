# Co-Op Architecture

This document provides a comprehensive overview of the Co-Op platform architecture, system workflows, and design decisions.

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Security Architecture](#security-architecture)
- [Service Components](#service-components)
- [Data Flow](#data-flow)
- [LLM Council Architecture](#llm-council-architecture)
- [Agent System](#agent-system)
- [New Features](#new-features)
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

1. **Security First** - AES-256 encryption, rate limiting, audit logging
2. **Accuracy** - Multi-model cross-critique reduces hallucinations
3. **Scalability** - Serverless infrastructure, circuit breakers, caching
4. **Self-Hostable** - Can be deployed on your own infrastructure
5. **Modular** - Each service can be scaled independently


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
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Sessions   │  │  Bookmarks  │  │   Usage     │  │   Admin     │        │
│  │   History   │  │             │  │  Analytics  │  │   Panel     │        │
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
│  │   Auth      │  │   Rate      │  │  Circuit    │  │  Validation │        │
│  │   Guard     │  │   Limiting  │  │  Breaker    │  │   Pipes     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Encryption  │  │   Audit     │  │   Retry     │  │   Helmet    │        │
│  │  Service    │  │   Logging   │  │   Service   │  │   Headers   │        │
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
│  └───────────────┘  │  │  └───────────┘  │  │  │  (Neon) │ │ (Upstash) │  │
│         │          │  │  ┌───────────┐  │  │  └─────────┘ └───────────┘  │
│  ┌──────┴──────┐   │  │  │  Google   │  │  │                             │
│  │    │    │   │   │  │  └───────────┘  │  │  ┌─────────┐ ┌───────────┐  │
│  ▼    ▼    ▼   ▼   │  │  ┌───────────┐  │  │  │Supabase │ │  QStash   │  │
│ Legal Fin Inv Comp │  │  │HuggingFace│  │  │  │(Auth+S3)│ │  (Queue)  │  │
│                     │  │  └───────────┘  │  │  └─────────┘ └───────────┘  │
└─────────────────────┘  └─────────────────┘  └─────────────────────────────┘
```


---

## Security Architecture

### Authentication & Authorization

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Supabase │────▶│ Frontend │────▶│ Backend  │
│  Login   │     │   Auth   │     │ Callback │     │  Guard   │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │   OAuth Flow   │                │                │
     │   (Google)     │                │                │
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

| Layer | Implementation | Purpose |
|-------|----------------|---------|
| **Authentication** | Supabase JWT verification | Verify user identity |
| **Authorization** | Role-based (user, admin) | Control access levels |
| **Rate Limiting** | Redis-backed per-user throttling | Prevent abuse |
| **API Keys** | SHA-256 hashed, timing-safe comparison | Service authentication |
| **Encryption** | AES-256-GCM for sensitive data | Protect data at rest |
| **Input Validation** | class-validator DTOs, whitelist mode | Prevent injection |
| **SQL Injection** | Drizzle ORM parameterized queries | Database security |
| **CORS** | Configurable allowed origins | Cross-origin protection |
| **Security Headers** | Helmet.js middleware | HTTP security headers |
| **Audit Logging** | Full audit trail | Compliance & forensics |

### Encryption Service

```typescript
// AES-256-GCM encryption for sensitive data
// Format: iv:authTag:ciphertext (all hex encoded)

encrypt(plaintext: string): string
decrypt(ciphertext: string): string
isEncrypted(value: string): boolean
```

Used for:
- Webhook secrets
- API tokens
- Sensitive configuration

### Rate Limiting Presets

| Preset | Limit | Window | Use Case |
|--------|-------|--------|----------|
| STANDARD | 100 | 60s | General API |
| STRICT | 10 | 60s | Sensitive operations |
| CREATE | 5 | 60s | Resource creation |
| READ | 200 | 60s | Read operations |
| BURST | 30 | 10s | Burst protection |


---

## Service Components

### Frontend (Next.js 15)

| Component | Purpose |
|-----------|---------|
| `app/page.tsx` | Landing page with feature showcase |
| `app/login/page.tsx` | OAuth authentication (Google) |
| `app/onboarding/page.tsx` | Multi-step startup profile setup |
| `app/(dashboard)/` | Protected dashboard routes |
| `app/(dashboard)/chat/` | Multi-agent chat with SSE streaming |
| `app/(dashboard)/sessions/` | Session history with pin/export |
| `app/(dashboard)/bookmarks/` | Saved responses management |
| `app/(dashboard)/usage/` | Personal analytics dashboard |
| `lib/api/client.ts` | Type-safe API client with auth |
| `lib/supabase/` | Supabase auth client |

Key Features:
- Server-side rendering with App Router
- True SSE streaming with fallback polling
- Document upload for chat context
- Session export (Markdown/JSON)
- PWA with shortcuts and share target
- Vercel Analytics integration

### Backend (NestJS 11)

| Module | Purpose |
|--------|---------|
| `agents/` | Domain-specific AI agents + SSE streaming |
| `sessions/` | Chat sessions with export & email |
| `users/` | User management and onboarding |
| `bookmarks/` | Saved responses CRUD |
| `documents/` | Chat document upload (Supabase Storage) |
| `analytics/` | User & admin analytics |
| `api-keys/` | API key generation and validation |
| `webhooks/` | Webhook management and delivery |
| `admin/` | Admin operations (embeddings, analytics) |
| `mcp/` | Model Context Protocol server |
| `notion/` | Notion integration for exports |

Common Services:

| Service | Purpose |
|---------|---------|
| `llm-council.service.ts` | Multi-model cross-critique orchestration |
| `llm-router.service.ts` | Provider routing with fallback |
| `streaming.service.ts` | SSE event publishing with Redis buffer |
| `rag-cache.service.ts` | RAG query caching (30-min TTL) |
| `retry.service.ts` | Exponential backoff with jitter |
| `email.service.ts` | SendGrid transactional emails |
| `encryption.service.ts` | AES-256-GCM encryption |
| `circuit-breaker.service.ts` | Fault tolerance for external services |
| `audit.service.ts` | Audit logging for compliance |
| `redis.service.ts` | Caching and rate limiting |

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
- Domain/sector/jurisdiction filtering
- TTL-based vector cleanup
- Gemini text-embedding-004 (768 dimensions)


---

## Data Flow

### User Query Flow with SSE Streaming

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │────▶│ Frontend │────▶│ Backend  │────▶│  Agent   │
│  Query   │     │  (Next)  │     │ (NestJS) │     │ Service  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                │                │
                      │                │                ▼
                      │                │         ┌──────────┐
                      │                │         │   RAG    │
                      │                │         │ (cached) │
                      │                │         └──────────┘
                      │                │                │
                      │                ▼                ▼
                      │          ┌──────────┐    ┌──────────┐
                      │          │   LLM    │◀───│ Context  │
                      │          │ Council  │    │ (Chunks) │
                      │          └──────────┘    └──────────┘
                      │                │
                      │    SSE Stream  │
                      │◀───────────────┘
                      │   (progress, thinking, chunks, done)
                      ▼
                ┌──────────┐
                │  Final   │
                │ Response │
                └──────────┘
```

### SSE Event Types

| Event | Purpose | Data |
|-------|---------|------|
| `connected` | Connection established | taskId, timestamp |
| `progress` | Processing update | phase, progress %, message |
| `thinking` | AI reasoning step | step description, agent |
| `chunk` | Content streaming | content text, agent |
| `done` | Task complete | final result |
| `error` | Task failed | error message |

### Detailed Query Processing

1. **Frontend** sends authenticated request to `/agents/queue`
2. **Backend** validates auth, loads startup context, creates task
3. **QStash** queues the task for async processing
4. **Frontend** connects to SSE endpoint `/agents/stream/:taskId`
5. **Agent Service** determines single-agent or multi-agent (A2A) mode
6. **RAG Cache** checks for cached results (30-min TTL)
7. **RAG Service** retrieves relevant document context (if cache miss)
8. **Research Service** fetches real-time web data (if needed)
9. **LLM Council** runs cross-critique workflow, emitting thinking steps
10. **Streaming Service** publishes events to Redis buffer
11. **SSE Controller** sends events to connected clients
12. **Response** synthesized and returned to user


---

## LLM Council Architecture

The LLM Council is the core innovation - a multi-model cross-critique system that reduces hallucinations and improves response quality.

### Council Workflow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE 1: GENERATION                               │
│                                                                             │
│   ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐                 │
│   │  Groq   │    │ Google  │    │HuggingFa│    │  ...    │                 │
│   │         │    │         │    │   ce    │    │         │                 │
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
│   Each model critiques ALL other models' responses (full cross-critique)    │
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

### Supported Models

#### Council Models (Critique & Response Generation)

| Provider | Model | Purpose |
|----------|-------|---------|
| Groq | llama-3.3-70b-versatile | Fast inference, general tasks |
| Groq | kimi-k2-instruct-0905 | Advanced reasoning |
| Google | gemini-2.5-flash | Balanced speed/quality, web research |
| HuggingFace | deepseek-ai/DeepSeek-R1-Distill-Qwen-32B | Reasoning model |
| HuggingFace | microsoft/Phi-3-mini-4k-instruct | Lightweight, fast |
| HuggingFace | Qwen/Qwen2.5-14B-Instruct-1M | High quality |

### Model Health Checks

On startup and every 5 minutes:
1. Test each configured model with minimal prompt
2. Mark models as: `healthy`, `unavailable`, `deprecated`, `error`
3. ALL healthy models participate in council (no limiting)
4. Minimum 2 models required for cross-critique


---

## New Features

### Session Export & Email

```
┌─────────────────────────────────────────────────────────────────┐
│                    SESSION EXPORT SERVICE                       │
│                                                                 │
│   Session ──▶ Export Format Selection                          │
│                    │                                            │
│              ┌─────┴─────┐                                      │
│              ▼           ▼                                      │
│         Markdown       JSON                                     │
│         (formatted)    (structured)                             │
│                                                                 │
│   Email ──▶ SendGrid ──▶ Formatted HTML Summary                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Document Upload (Supabase Storage)

```
┌─────────────────────────────────────────────────────────────────┐
│                    DOCUMENT UPLOAD FLOW                         │
│                                                                 │
│   File ──▶ Validation ──▶ Supabase Storage ──▶ DB Metadata     │
│              │                                                  │
│              ├── Size check (max 10MB)                         │
│              ├── Type check (PDF, DOC, DOCX, TXT, MD, images)  │
│              └── Cleanup on failure                            │
│                                                                 │
│   Text Extraction:                                              │
│   - TXT/MD: Direct content                                     │
│   - PDF: Placeholder (pdf-parse integration ready)             │
│   - Images: Description-based                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Bookmarks System

| Feature | Description |
|---------|-------------|
| Create | Save any AI response with title, tags |
| Search | Full-text search across title and content |
| Tags | Organize bookmarks with custom tags |
| Session Link | Optional link back to source session |

### User Analytics Dashboard

| Metric | Description |
|--------|-------------|
| Total Sessions | All-time session count |
| Active Sessions | Currently active sessions |
| Total Messages | All-time message count |
| Agent Usage | Breakdown by agent type |
| Sessions This Month | Current month activity |
| Messages This Month | Current month messages |
| Avg Messages/Session | Engagement metric |
| Most Active Day | Peak activity day |
| Recent Activity | 7-day activity heatmap |

### RAG Query Caching

```
┌─────────────────────────────────────────────────────────────────┐
│                    RAG CACHE SERVICE                            │
│                                                                 │
│   Query ──▶ Generate Cache Key (MD5 hash of normalized query)  │
│                    │                                            │
│              ┌─────┴─────┐                                      │
│              ▼           ▼                                      │
│         Cache Hit    Cache Miss                                 │
│         (return)     (query RAG, cache result)                 │
│                                                                 │
│   TTL: 30 minutes (default)                                    │
│        60 minutes (popular queries with >5 accesses)           │
└─────────────────────────────────────────────────────────────────┘
```

### Retry Service

```typescript
// Exponential backoff with jitter
const options = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: ['timeout', 'rate limit', '503', ...],
};

// Decorator support
@WithRetry({ maxAttempts: 3 })
async fetchData() { ... }
```

### PWA Improvements

| Feature | Implementation |
|---------|----------------|
| Shortcuts | New Chat, Sessions |
| Share Target | Share text directly to chat |
| Orientation | Any (portrait/landscape) |
| Categories | business, productivity, finance |


---

## Agent System

### Agent Types

| Agent | Domain | Expertise | Data Source |
|-------|--------|-----------|-------------|
| **Legal** | Startup law | Incorporation, IP, contracts, compliance | RAG |
| **Finance** | Financial planning | Fundraising, runway, unit economics | RAG |
| **Investor** | Fundraising | Pitch strategy, investor targeting, term sheets | Web Research |
| **Competitor** | Market analysis | Competitive landscape, positioning | Web Research |

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
│                                   ALL others             │      │
└─────────────────────────────────────────────────────────────────┘
```

### Web Research with Fallback

```
┌─────────────────────────────────────────────────────────────────┐
│                    RESEARCH SERVICE                             │
│                                                                 │
│   Query ──▶ Gemini 2.5 Flash ──▶ Google Search Grounding       │
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
│ role            │  │    │ industry        │   │   │ title           │
│ startupId (FK)  │──┼───▶│ sector          │   │   │ status          │
│ onboardingDone  │  │    │ stage           │   │   │ isPinned        │
│ createdAt       │  │    │ fundingStage    │   │   │ metadata        │
└─────────────────┘  │    │ ...             │   │   │ createdAt       │
                     │    └─────────────────┘   │   └────────┬────────┘
                     │                          │            │
┌─────────────────┐  │    ┌─────────────────┐   │            ▼
│   bookmarks     │  │    │    api_keys     │   │   ┌─────────────────┐
├─────────────────┤  │    ├─────────────────┤   │   │session_messages │
│ id (PK)         │  │    │ id (PK)         │   │   ├─────────────────┤
│ userId (FK)     │──┘    │ userId (FK)     │───┘   │ id (PK)         │
│ sessionId (FK)  │       │ keyHash         │       │ sessionId (FK)  │
│ messageId       │       │ name            │       │ role            │
│ title           │       │ permissions     │       │ content         │
│ content         │       │ lastUsedAt      │       │ agent           │
│ agent           │       └─────────────────┘       │ metadata        │
│ tags            │                                 │ createdAt       │
│ createdAt       │                                 └─────────────────┘
└─────────────────┘

┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   documents     │       │   audit_logs    │       │    webhooks     │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ userId (FK)     │       │ userId (FK)     │       │ userId (FK)     │
│ sessionId (FK)  │       │ action          │       │ url             │
│ filename        │       │ resource        │       │ events          │
│ originalName    │       │ resourceId      │       │ secret (enc)    │
│ mimeType        │       │ oldValue        │       │ isActive        │
│ size            │       │ newValue        │       │ createdAt       │
│ storagePath     │       │ ipAddress       │       └─────────────────┘
│ description     │       │ metadata        │
│ createdAt       │       │ createdAt       │
└─────────────────┘       └─────────────────┘
```


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
  "message": "Optional message",
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

| Endpoint | Auth | Rate Limit | Purpose |
|----------|------|------------|---------|
| `POST /agents/queue` | JWT | STANDARD | Async agent execution |
| `GET /agents/stream/:id` | JWT | READ | SSE stream for task |
| `GET /agents/tasks/:id` | JWT | READ | Get task status |
| `POST /sessions` | JWT | CREATE | Create chat session |
| `PATCH /sessions/:id/pin` | JWT | STANDARD | Pin/unpin session |
| `POST /sessions/:id/export` | JWT | STANDARD | Export session |
| `POST /sessions/:id/email` | JWT | STRICT | Email session summary |
| `GET /analytics/me` | JWT | READ | Personal analytics |
| `GET /analytics/me/history` | JWT | READ | Activity history |
| `POST /bookmarks` | JWT | CREATE | Create bookmark |
| `POST /documents/upload` | JWT | CREATE | Upload document |
| `POST /admin/embeddings/upload` | Admin | CREATE | Upload RAG document |

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
│  - Analytics        │  │  - Zero-downtime│  │                 │
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
│  │ (serverless)│  │ (serverless)│  │             │  │ (serverless)│        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Upstash    │  │    Groq     │  │   Google    │  │  SendGrid   │        │
│  │   Vector    │  │     API     │  │   AI API    │  │   Email     │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Scaling Considerations

| Component | Strategy |
|-----------|----------|
| Frontend | Edge-deployed, auto-scales with Vercel |
| Backend | Horizontal scaling on Render (stateless) |
| RAG | Stateless, scales independently |
| Database | Neon serverless auto-scales |
| Redis | Upstash serverless, pay-per-request |
| Vector DB | Upstash Vector, auto-scales |
| Queue | QStash serverless, auto-scales |


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

### Why True SSE Streaming?

**Problem**: Long-running LLM operations (30+ seconds) need real-time feedback.

**Solution**: Server-Sent Events with Redis-backed event buffering.

**Benefits**:
- Real-time progress updates
- Thinking steps visible to users
- Late subscriber support via buffer
- Fallback to polling if SSE fails

### Why RAG Query Caching?

**Problem**: RAG queries are expensive and often repeated.

**Solution**: MD5-based cache keys with 30-minute TTL.

**Benefits**:
- Reduced latency for repeated queries
- Lower API costs
- Popularity-based TTL extension
- Automatic cache invalidation

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

### Why AES-256-GCM Encryption?

**Problem**: Sensitive data (webhook secrets, tokens) needs protection at rest.

**Solution**: AES-256-GCM with random IV and authentication tag.

**Benefits**:
- Industry-standard encryption
- Authenticated encryption prevents tampering
- Graceful fallback for legacy plaintext data
- Key derivation from environment variable

### Why Circuit Breaker Pattern?

**Problem**: External service failures can cascade.

**Solution**: Opossum circuit breaker with configurable thresholds.

**Benefits**:
- Prevents cascade failures
- Fast failure when service is down
- Automatic recovery when service returns
- Memory-efficient with LRU cleanup

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.
