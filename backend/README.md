# Co-Op Backend

<p>
  <img src="https://img.shields.io/badge/NestJS-11-red?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Drizzle_ORM-Latest-green" alt="Drizzle">
  <img src="https://img.shields.io/badge/Docker-Ready-blue?logo=docker" alt="Docker">
</p>

NestJS backend powering the Co-Op AI advisory platform with multi-model LLM Council architecture, real-time web research, and MCP server integration.

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
│   ├── rag/                   # RAG client
│   ├── research/              # Web research (Gemini Search)
│   └── ...
├── database/                  # Drizzle ORM schemas
└── modules/                   # Feature modules
    ├── agents/                # AI agents + orchestrator
    ├── mcp-server/            # MCP protocol server
    ├── sessions/              # Chat sessions
    ├── users/                 # User management
    └── ...
```


## Environment Variables

### Required

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Supabase
SUPABASE_URL="https://project.supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_KEY="eyJ..."

# Upstash Redis
UPSTASH_REDIS_URL="https://instance.upstash.io"
UPSTASH_REDIS_TOKEN="AX..."

# Upstash QStash
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
CORS_ORIGINS="http://localhost:3000"
RAG_SERVICE_URL=""
NOTION_API_TOKEN=""
SCRAPINGBEE_API_KEY=""  # Fallback for web research
```

See `.env.example` for complete documentation.

## LLM Council

Multiple AI models collaborate and cross-critique each response:

1. **Generate** - All models respond to the prompt
2. **Critique** - Each model scores other responses (1-10)
3. **Synthesize** - Best response improved with feedback

### Available Models

| Provider | Model | Notes |
|----------|-------|-------|
| Groq | llama-3.3-70b-versatile | Fast inference, default |
| Groq | llama-3.3-70b-specdec | Speculative decoding |
| Google | gemini-2.5-flash | Also enables web research |
| HuggingFace | deepseek-ai/DeepSeek-R1-Distill-Qwen-32B | Reasoning model |
| HuggingFace | microsoft/Phi-3-mini-4k-instruct | Lightweight |
| HuggingFace | Qwen/Qwen2.5-72B-Instruct | High quality |

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

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/me` | Get current user |
| POST | `/users/me/onboarding` | Complete onboarding |
| POST | `/sessions` | Create session |
| POST | `/agents/run` | Run agent (sync) |
| POST | `/agents/queue` | Queue agent (async) |
| GET | `/agents/tasks/:id` | Get task status |
| GET | `/mcp-server/discover` | List MCP tools |
| POST | `/mcp-server/execute` | Execute MCP tool |
| GET | `/health` | Health check |
| GET | `/metrics` | Prometheus metrics |

## MCP Server

Expose agents as tools for Claude, Cursor, Kiro:

```bash
# Discover tools
curl -H "X-API-Key: <key>" /api/v1/mcp-server/discover

# Execute tool
curl -X POST -H "X-API-Key: <key>" \
  -d '{"tool":"investor_search","arguments":{...}}' \
  /api/v1/mcp-server/execute
```

### Available Tools

- `legal_analysis`
- `finance_analysis`
- `investor_search`
- `competitor_analysis`
- `multi_agent_query`

## Database

Using Drizzle ORM with PostgreSQL:

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
