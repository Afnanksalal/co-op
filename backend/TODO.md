# Co-Op Backend - Production Ready

## ✅ All Features Fully Implemented

### Authentication & Security
- [x] Supabase Auth integration (JWT verification)
- [x] OAuth providers: Google, GitHub (via Supabase Dashboard)
- [x] Magic link verification (via Supabase)
- [x] Auth guards with automatic DB user sync
- [x] Admin guard for admin-only endpoints
- [x] API key authentication for service-to-service calls
- [x] API key management (create, list, revoke)
- [x] User throttle guard for rate limiting
- [x] SSRF protection for webhook URLs
- [x] Input validation with strict DTOs
- [x] Startup ownership validation

### User Onboarding Flow
- [x] User schema with onboarding status tracking
- [x] Auth provider tracking (google, github)
- [x] Professional onboarding form
- [x] User-Startup relationship (one founder = one startup)
- [x] Onboarding status check endpoint
- [x] Startup update endpoint

### Startup Schema (Onboarding Fields)
**Required:**
- `founderName`, `founderRole` (CEO, CTO, etc.)
- `companyName`, `description`
- `industry` (24 options), `businessModel` (B2B, B2C, etc.)
- `sector` (RAG filtering: fintech, greentech, healthtech, saas, ecommerce)
- `stage` (Idea → Scale), `foundedYear`
- `teamSize`, `cofounderCount`, `country`
- `isRevenue` (yes/no/pre_revenue)

**Optional:**
- `tagline`, `website`, `revenueModel`, `launchDate`
- `city`, `operatingRegions`
- `fundingStage`, `totalRaised`, `monthlyRevenue`
- `targetCustomer`, `problemSolved`, `competitiveAdvantage`

### Infrastructure
- [x] NestJS 11 with modular architecture
- [x] Drizzle ORM with PostgreSQL (no raw SQL)
- [x] Upstash Redis (caching + BullMQ queues)
- [x] Supabase Storage for file uploads
- [x] ESLint 9 with strict TypeScript rules
- [x] Swagger/OpenAPI documentation
- [x] Health checks for all services
- [x] Prometheus metrics (/metrics)
- [x] Circuit breaker pattern
- [x] Response caching (Redis-backed)
- [x] Cursor-based pagination

### Database Schema (All Drizzle ORM)
- `users` - User accounts with OAuth tracking
- `startups` - Startup profiles with business context
- `sessions` - Chat sessions
- `session_messages` - Messages within sessions
- `admin_users` - Admin role assignments
- `log_events` - Analytics events
- `webhooks` - Webhook subscriptions
- `audit_logs` - Audit trail with IP tracking
- `mcp_integrations` - MCP server configurations

### LLM Council Architecture
- [x] Multi-provider: Groq, Google AI, HuggingFace
- [x] Models: Llama 3.3 70B, GPT OSS 120B, Gemini 3 Pro, DeepSeek R1 32B, Llama 3 8B
- [x] Anonymous response generation
- [x] Cross-model critique
- [x] Score-based consensus
- [x] Automatic fallback

### Agents
- [x] Legal agent with LLM Council + RAG (sector-filtered)
- [x] Finance agent with LLM Council + RAG (sector-filtered)
- [x] Investor agent with LLM Council + Web Research (no RAG)
- [x] Competitor agent with LLM Council + Web Research (no RAG)
- [x] BullMQ job queue
- [x] SSE streaming (5min timeout)
- [x] Task status polling and cancellation

### RAG Integration (Legal & Finance only) - Lazy Vectorization
- [x] RagService for RAG backend communication
- [x] Domain filtering (legal, finance)
- [x] Sector filtering (fintech, greentech, healthtech, saas, ecommerce)
- [x] Semantic search with circuit breaker
- [x] **Lazy vectorization**: Files stored in Supabase, vectors created on first query
- [x] **TTL management**: Vectors expire after 30 days of no access
- [x] **Re-vectorization**: Expired files auto-vectorize on next query
- [x] Context formatting for prompts

### Web Research (Built-in)
- [x] ResearchService with Google Gemini Search Grounding
- [x] Web search, company lookup, investor search
- [x] Market research, news search
- [x] Real-time grounded responses with source citations
- [x] No external MCP server required

### Admin Module
- [x] PDF upload to Supabase Storage with domain/sector tags
- [x] File registration with RAG service (lazy vectorization)
- [x] File listing with domain/sector filtering
- [x] Vector status tracking (pending/indexed/expired)
- [x] Force vectorize endpoint (pre-warming)
- [x] Cleanup expired vectors endpoint
- [x] File deletion (storage + vectors)

### Webhooks
- [x] CRUD operations
- [x] Event subscription
- [x] HMAC signature verification
- [x] SSRF protection
- [x] Async delivery

### Analytics & Audit
- [x] Event tracking
- [x] Dashboard stats
- [x] Audit logging with IP tracking

### Notion Integration (Internal)
- [x] Internal integration (single API token, no OAuth)
- [x] Page search within shared pages
- [x] Default export page via env config
- [x] Export agent outputs to Notion pages
- [x] Rich formatting (headings, lists, callouts, toggles)
- [x] Source citations and metadata

---

## API Endpoints

### Users & Onboarding
```
POST   /api/v1/users                    - Create user (admin)
GET    /api/v1/users/me                 - Get current user
GET    /api/v1/users/me/onboarding-status - Check onboarding
POST   /api/v1/users/me/onboarding      - Complete onboarding
PATCH  /api/v1/users/me/startup         - Update startup
PATCH  /api/v1/users/me                 - Update profile
GET    /api/v1/users/:id                - Get user by ID
PATCH  /api/v1/users/:id                - Update user (admin)
DELETE /api/v1/users/:id                - Delete user (admin)
```

### Startups
```
GET    /api/v1/startups                 - List all (admin)
GET    /api/v1/startups/:id             - Get by ID
DELETE /api/v1/startups/:id             - Delete (admin)
```

### Sessions
```
POST   /api/v1/sessions                 - Create session
GET    /api/v1/sessions                 - List user sessions
GET    /api/v1/sessions/:id             - Get session
POST   /api/v1/sessions/:id/end         - End session
POST   /api/v1/sessions/:id/activity    - Track activity
GET    /api/v1/sessions/:id/activity    - Get activity
POST   /api/v1/sessions/:id/messages    - Add message
GET    /api/v1/sessions/:id/messages    - Get messages
GET    /api/v1/sessions/:id/history     - Get full history
```

### Agents
```
POST   /api/v1/agents/run               - Run agent (sync)
POST   /api/v1/agents/queue             - Queue agent (async)
GET    /api/v1/agents/tasks/:taskId     - Get task status
DELETE /api/v1/agents/tasks/:taskId     - Cancel task
GET    /api/v1/agents/stream/:taskId    - SSE stream
```

### Admin
```
POST   /api/v1/admin/embeddings/upload     - Upload PDF (lazy vectorization)
GET    /api/v1/admin/embeddings            - List embeddings
GET    /api/v1/admin/embeddings/:id        - Get embedding
DELETE /api/v1/admin/embeddings/:id        - Delete embedding
POST   /api/v1/admin/embeddings/:id/vectorize - Force vectorize file
POST   /api/v1/admin/embeddings/cleanup    - Cleanup expired vectors
```

### MCP
```
POST   /api/v1/mcp/servers              - Register server (admin)
DELETE /api/v1/mcp/servers/:id          - Unregister (admin)
GET    /api/v1/mcp/servers              - List servers
GET    /api/v1/mcp/servers/:id/tools    - Get server tools
POST   /api/v1/mcp/servers/:id/discover - Discover tools (admin)
GET    /api/v1/mcp/tools                - List all tools
POST   /api/v1/mcp/execute              - Execute tool
```

### API Keys
```
POST   /api/v1/api-keys                 - Create API key
GET    /api/v1/api-keys                 - List user's keys
DELETE /api/v1/api-keys/:id             - Revoke key
```

### Webhooks
```
POST   /api/v1/webhooks                 - Create webhook
GET    /api/v1/webhooks                 - List webhooks
GET    /api/v1/webhooks/:id             - Get webhook
PATCH  /api/v1/webhooks/:id             - Update webhook
DELETE /api/v1/webhooks/:id             - Delete webhook
POST   /api/v1/webhooks/:id/regenerate-secret - Regenerate secret
```

### Analytics (Admin)
```
GET    /api/v1/analytics/dashboard      - Dashboard stats
GET    /api/v1/analytics/events/aggregation - Event aggregation
```

### Notion
```
GET    /api/v1/notion/status            - Get integration status
GET    /api/v1/notion/pages             - Search pages shared with integration
POST   /api/v1/notion/export            - Export content to Notion
```

### Health & Metrics
```
GET    /api/v1/health                   - Health check
GET    /api/v1/metrics                  - Prometheus metrics
```

---

## Environment Setup

1. Copy `.env.example` to `.env`
2. Configure PostgreSQL (Supabase/Neon/Render)
3. Configure Supabase (auth + storage)
4. Configure Upstash Redis
5. Configure at least one LLM provider
6. Run `npm run db:push` to sync schema

## External Services

### RAG Service (Required for Legal/Finance agents)
Separate Python service with **lazy vectorization** architecture:

**Architecture:**
```
Upload: PDF → Backend → Supabase Storage → Register with RAG (pending)
Query:  Question → RAG → Lazy vectorize pending files → Search → Answer
Cleanup: Cron → Remove vectors not accessed in 30 days → Status: expired
```

**Features:**
- **Domains**: legal, finance
- **Sectors**: fintech, greentech, healthtech, saas, ecommerce
- **Lazy vectorization**: Vectors created on-demand, not at upload
- **TTL management**: Vectors expire after 30 days of no access
- **Persistent storage**: PDFs remain in Supabase for re-vectorization
- PDF parsing and chunking (Upstash Vector, 768 dimensions)
- Google Gemini text-embedding-004
- Groq LLM for answer generation
- Neon PostgreSQL for file metadata

Configure:
```
RAG_SERVICE_URL="https://your-rag-service.koyeb.app"
```

See `/RAG/README.md` for setup and Koyeb deployment instructions.

### Web Research (Built-in)
Research is automatically enabled when `GOOGLE_AI_API_KEY` is configured.
Uses Google Gemini 2.0 Flash with Search Grounding for real-time web research:
- Competitor analysis with live market data
- Investor search with recent funding activity
- Market research with current trends
- Company profiles with funding history
- News search with recent articles

No separate server needed - research is integrated directly into the backend.

### Notion Integration (Optional - Internal)
For exporting AI outputs to Notion pages:

1. Go to https://www.notion.so/my-integrations
2. Click "New integration"
3. Select your workspace, give it a name (e.g., "Co-Op Export")
4. Keep "Internal integration" selected (default)
5. Copy the "Internal Integration Secret"
6. In Notion, open the page you want to export to
7. Click "..." → "Connections" → Add your integration
8. Copy the page ID from the URL (format: `notion.so/Page-Name-{PAGE_ID}`)

Configure:
```
NOTION_API_TOKEN="secret_xxxxx"
NOTION_DEFAULT_PAGE_ID="abc123..."
```

---

## Deployment Checklist

- [ ] Set all environment variables
- [ ] Configure Supabase OAuth providers
- [ ] Configure Upstash Redis
- [ ] Configure at least one LLM provider
- [ ] Set CORS_ORIGINS (not `*` in production)
- [ ] Set NODE_ENV=production
- [ ] Set MASTER_API_KEY for MCP server and metrics access
- [ ] Run `npm run db:push`
- [ ] (Optional) Deploy RAG service
- [x] Web research enabled via GOOGLE_AI_API_KEY (no separate deployment)
- [ ] (Optional) Configure Notion integration for export

---

## Code Audit - Issues Fixed (Dec 2025)

### Security Fixes
- [x] API Key Guard: Added timing-safe comparison to prevent timing attacks
- [x] MCP Server Controller: Added timing-safe API key validation
- [x] Metrics Controller: Added API key authentication (was publicly accessible)
- [x] MCP Server: Added warning log when running without MASTER_API_KEY

### Bug Fixes
- [x] UserThrottleGuard: Fixed broken constructor (was extending ThrottlerGuard incorrectly)
- [x] CircuitBreakerService: Added `executeOnce` method for dynamic functions
- [x] A2A Service: Improved polling with exponential backoff (was busy-waiting)
- [x] Sessions Service: Fixed cache invalidation on session end
- [x] Research Service: Fixed unused `days` parameter in `searchNews`

### Code Quality Improvements
- [x] Agents Service: Refactored duplicate code into `buildAgentInput` method
- [x] LLM Council: Added periodic health checks (every 5 minutes) to recover from transient failures
- [x] Webhooks Service: Added retry mechanism with exponential backoff (3 retries)
- [x] Sessions Service: Improved action validation error messages

### Documentation (Dec 2025)
- [x] Comprehensive README.md with architecture, API reference, deployment guide
- [x] SECURITY.md with security policies and vulnerability reporting
- [x] CHANGELOG.md with version history
- [x] Enhanced CONTRIBUTING.md with detailed guidelines

### Remaining Recommendations
- [ ] Add database migrations (currently only .gitkeep exists)
- [ ] Add integration tests for critical paths
- [ ] Add request logging middleware for audit trail
- [ ] Consider adding rate limiting per endpoint (not just per user)
- [ ] Add webhook delivery status tracking in database
