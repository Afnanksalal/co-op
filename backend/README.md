# Co-Op Backend

<p>
  <img src="https://img.shields.io/badge/NestJS-11-red?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Drizzle_ORM-Latest-green" alt="Drizzle">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?logo=docker" alt="Docker">
</p>

NestJS backend powering the Co-Op AI advisory platform with multi-model LLM Council architecture, real-time SSE streaming, and comprehensive security features.

## Quick Start

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Push database schema
npm run db:push

# Start development server
npm run dev
```

API: `http://localhost:3000/api/v1`
Docs: `http://localhost:3000/docs`

## Architecture

```
src/
├── common/                    # Shared utilities
│   ├── guards/                # Auth, API key, admin, throttle
│   ├── llm/                   # LLM Council (Groq, Google, HuggingFace)
│   ├── rag/                   # RAG client + caching
│   ├── research/              # Web research (Gemini Search)
│   ├── streaming/             # SSE streaming service
│   ├── email/                 # SendGrid email service
│   ├── encryption/            # AES-256-GCM encryption
│   ├── retry/                 # Exponential backoff retry
│   ├── circuit-breaker/       # Fault tolerance
│   ├── audit/                 # Audit logging
│   └── ...
├── database/                  # Drizzle ORM schemas
└── modules/                   # Feature modules
    ├── agents/                # AI agents + orchestrator + SSE
    ├── sessions/              # Chat sessions + export
    ├── bookmarks/             # Saved responses
    ├── documents/             # Document upload
    ├── analytics/             # User + admin analytics
    ├── users/                 # User management
    ├── mcp/                   # MCP protocol server
    └── ...
```


## Security Features

| Feature | Implementation |
|---------|----------------|
| Authentication | Supabase JWT verification |
| Authorization | Role-based (user, admin) |
| Rate Limiting | Redis-backed per-user throttling |
| API Keys | SHA-256 hashed, timing-safe comparison |
| Encryption | AES-256-GCM for sensitive data |
| Input Validation | class-validator DTOs, whitelist mode |
| Security Headers | Helmet.js middleware |
| Audit Logging | Full audit trail |

## Environment Variables

### Required

```bash
# Database (Neon Serverless PostgreSQL)
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Supabase (Auth + Storage)
SUPABASE_URL="https://project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_KEY="eyJ..."
SUPABASE_STORAGE_BUCKET="documents"

# Upstash Redis (REST API)
UPSTASH_REDIS_URL="https://instance.upstash.io"
UPSTASH_REDIS_TOKEN="AX..."

# Upstash QStash (Message Queue)
QSTASH_TOKEN="eyJ..."
QSTASH_CURRENT_SIGNING_KEY="sig_..."
QSTASH_NEXT_SIGNING_KEY="sig_..."

# LLM Providers (minimum 2 for council)
GROQ_API_KEY="gsk_..."
GOOGLE_AI_API_KEY="AI..."
HUGGINGFACE_API_KEY="hf_..."
```

### Optional

```bash
NODE_ENV="development"
PORT="3000"
MASTER_API_KEY=""
ENCRYPTION_KEY=""  # AES-256 key for sensitive data
CORS_ORIGINS="http://localhost:3000"
RAG_SERVICE_URL=""
SENDGRID_API_KEY=""
SENDGRID_FROM_EMAIL="noreply@co-op.ai"
SENDGRID_FROM_NAME="Co-Op AI"
NOTION_API_TOKEN=""
SCRAPINGBEE_API_KEY=""  # Fallback for web research
```

See `.env.example` for complete documentation.

## LLM Council

Multiple AI models collaborate and cross-critique each response:

1. **Generate** - All healthy models respond to the prompt
2. **Critique** - Each model scores ALL other responses (1-10)
3. **Synthesize** - Best response improved with feedback

### Council Models

| Provider | Model | Notes |
|----------|-------|-------|
| Groq | llama-3.3-70b-versatile | Fast inference |
| Groq | kimi-k2-instruct-0905 | Advanced reasoning |
| Google | gemini-2.5-flash | Also enables web research |
| HuggingFace | deepseek-ai/DeepSeek-R1-Distill-Qwen-32B | Reasoning |
| HuggingFace | microsoft/Phi-3-mini-4k-instruct | Lightweight |
| HuggingFace | Qwen/Qwen2.5-14B-Instruct-1M | High quality |

### CLaRA RAG Specialist

Apple's CLaRA-7B-Instruct is used for intelligent RAG context processing (NOT critique):

| Provider | Model | Purpose |
|----------|-------|---------|
| HuggingFace | apple/CLaRa-7B-Instruct | Semantic compression, context optimization |

CLaRA provides:
- **16×/128× semantic compression** - Reduces context size while preserving key info
- **Query-aware extraction** - Focuses on information relevant to the user's question
- **Document analysis** - Classifies documents, extracts entities and topics
- **Relevance scoring** - Prioritizes most relevant RAG chunks

## AI Agents

| Agent | Purpose | Data Source |
|-------|---------|-------------|
| Legal | Corporate structure, compliance | RAG |
| Finance | Financial modeling, metrics | RAG |
| Investor | VC matching, fundraising | Web Research |
| Competitor | Market analysis, positioning | Web Research |


## API Reference

### Authentication

```bash
# User auth (Supabase JWT)
curl -H "Authorization: Bearer <jwt>" /api/v1/users/me

# Service auth (API Key)
curl -H "X-API-Key: coop_xxxxx" /api/v1/mcp-server/discover
```

### Key Endpoints

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| GET | `/users/me` | READ | Get current user |
| POST | `/users/me/onboarding` | CREATE | Complete onboarding |
| POST | `/sessions` | CREATE | Create session |
| PATCH | `/sessions/:id/pin` | STANDARD | Pin/unpin session |
| POST | `/sessions/:id/export` | STANDARD | Export (MD/JSON) |
| POST | `/sessions/:id/email` | STRICT | Email summary |
| POST | `/agents/queue` | STANDARD | Queue agent (async) |
| GET | `/agents/stream/:id` | READ | SSE stream |
| GET | `/agents/tasks/:id` | READ | Get task status |
| GET | `/analytics/me` | READ | Personal analytics |
| POST | `/bookmarks` | CREATE | Create bookmark |
| POST | `/documents/upload` | CREATE | Upload document |
| GET | `/mcp-server/discover` | READ | List MCP tools |
| POST | `/mcp-server/execute` | STANDARD | Execute MCP tool |
| GET | `/health` | - | Health check |
| GET | `/metrics` | - | Prometheus metrics |

### Rate Limit Presets

| Preset | Limit | Window |
|--------|-------|--------|
| STANDARD | 100/min | 60s |
| STRICT | 10/min | 60s |
| CREATE | 5/min | 60s |
| READ | 200/min | 60s |

## New Features

### SSE Streaming

```typescript
// Connect to SSE stream for real-time updates
GET /agents/stream/:taskId

// Events: connected, progress, thinking, chunk, done, error
```

### Session Export

```typescript
// Export as Markdown or JSON
POST /sessions/:id/export
{ "format": "markdown" | "json" }

// Email session summary
POST /sessions/:id/email
{ "email": "user@example.com" }
```

### Document Upload

```typescript
// Upload document for chat context
POST /documents/upload
Content-Type: multipart/form-data
file: <file>
sessionId?: <uuid>
description?: <string>
```

### Bookmarks

```typescript
// Save AI response
POST /bookmarks
{ "title": "...", "content": "...", "tags": [...] }
```

## Database

Using Drizzle ORM with PostgreSQL (Neon):

```bash
npm run db:push      # Push schema
npm run db:generate  # Generate migrations
npm run db:studio    # Open Drizzle Studio
```

## Scripts

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start:prod   # Start production
npm run lint         # Run ESLint
npm run format       # Format with Prettier
npm run test         # Run tests
```

## Deployment

### Render

1. Create Web Service
2. Connect repository
3. Set Dockerfile path: `./Dockerfile`
4. Add environment variables
5. Deploy

### Docker

```bash
docker build -t co-op-backend .
docker run -p 3000:3000 -e DATABASE_URL="..." co-op-backend
```

## License

MIT License - see [LICENSE](../LICENSE) for details.
