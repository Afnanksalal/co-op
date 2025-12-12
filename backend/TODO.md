# Co-Op Backend - Production Ready

## ✅ All Features Completed

### Authentication & Security
- [x] Supabase Auth integration (token verification)
- [x] Auth guards with Supabase token validation
- [x] Admin guard for admin-only endpoints
- [x] Global HttpExceptionFilter for consistent error responses
- [x] API key authentication for service-to-service calls
- [x] API key management (create, list, revoke with proper cleanup)
- [x] User throttle guard for rate limiting
- [x] SSRF protection for webhook URLs (production mode)
- [x] Input validation with strict DTOs

### Infrastructure
- [x] NestJS 11 with modular architecture
- [x] Drizzle ORM with PostgreSQL
- [x] Upstash Redis (single source for caching + queues)
- [x] BullMQ with Upstash Redis
- [x] Supabase Storage for file uploads
- [x] Render deployment config (render.yaml, Dockerfile)
- [x] ESLint 9 flat config with strict TypeScript rules
- [x] Swagger/OpenAPI documentation
- [x] Health endpoint returns 503 when unhealthy
- [x] Health check for all external services (DB, Redis, Supabase, LLM)
- [x] Structured logging (JSON format for production)
- [x] Prometheus metrics collection (/metrics endpoint)
- [x] Circuit breaker pattern for external services
- [x] Scheduled tasks (@nestjs/schedule)
- [x] Response caching service (Redis-backed)
- [x] Cursor-based pagination support

### Code Quality (Deep Audit Completed)
- [x] Removed password field from CreateUserDto (Supabase handles auth)
- [x] Made all DTO fields required (no optional fields in request DTOs)
- [x] Fixed sessions authorization (requires userId verification)
- [x] Fixed admin delete embedding path
- [x] All interfaces have required fields (no optional in types)
- [x] Proper error handling in agent processor
- [x] Cache invalidation on session updates
- [x] MCP servers persist to Redis and load on startup
- [x] API key revocation properly cleans up all Redis keys
- [x] SSE stream timeout (5 minutes) to prevent indefinite connections
- [x] Validation errors return structured response
- [x] Internal errors hidden in production mode
- [x] Webhook URL validation prevents SSRF attacks
- [x] Strict scope validation for API keys
- [x] Message content length limits (50KB max)
- [x] Prompt length limits (10KB max)

### LLM Council Architecture (A2A)
- [x] Multi-provider support (Groq, Google AI, HuggingFace)
- [x] Best-in-class models per family (no duplicates):
  - Groq: Llama 3.3 70B, Mixtral 8x7B, Gemma 2 9B
  - Google: Gemini 2.0 Flash
  - HuggingFace: Mistral Small 24B, Qwen 2.5 72B, DeepSeek R1 32B
- [x] Anonymous response generation (all models respond independently)
- [x] Response shuffling for unbiased critique
- [x] Cross-model critique (models critique other models' responses)
- [x] Score-based consensus and synthesis
- [x] Automatic fallback on provider failure

### Agents
- [x] Agent execution queue (BullMQ)
- [x] SSE streaming endpoint with timeout
- [x] Task status polling and cancellation
- [x] Orchestrator service
- [x] Legal agent with LLM Council
- [x] Finance agent with LLM Council
- [x] Investor agent with LLM Council
- [x] Competitor agent with LLM Council

### Admin Module
- [x] PDF upload with Supabase Storage
- [x] File management (list, delete, signed URLs)

### Startups Module
- [x] Full CRUD operations
- [x] Admin-only create/update/delete
- [x] Authenticated list/get

### MCP Integration
- [x] MCP server registration and management
- [x] Tool discovery from MCP servers
- [x] Tool execution with error handling
- [x] Multi-server support
- [x] Server persistence to Redis

### Database
- [x] Database connection pooling optimization
- [x] Soft deletes for critical entities
- [x] OAuth2 providers via Supabase Dashboard
- [x] Drizzle migrations setup
- [x] Session messages schema
- [x] Webhooks schema
- [x] Audit logs schema with indexes

### Sessions
- [x] Session expiration handling (24h inactivity)
- [x] Session activity tracking with cache invalidation
- [x] Session replay/history feature
- [x] Scheduled session expiration (hourly cron)

### Analytics
- [x] Event aggregation
- [x] Dashboard data endpoints
- [x] Prometheus metrics integration

### Webhooks
- [x] Webhook registration (CRUD)
- [x] Event subscription (configurable events)
- [x] HMAC signature verification
- [x] Secret regeneration
- [x] Async webhook delivery
- [x] SSRF protection (blocks localhost, private IPs in production)

### Audit Logging
- [x] Audit log schema with indexes
- [x] AuditService for logging actions
- [x] Query by user, action, resource, date range

---

## Security Audit Summary

### Fixed Issues
1. **API Key Revocation** - Now properly removes keys from both lookup and user storage
2. **Session Cache Invalidation** - Cache cleared on activity tracking
3. **MCP Server Persistence** - Servers now load from Redis on startup
4. **SSE Timeout** - 5-minute timeout prevents resource exhaustion
5. **SSRF Protection** - Webhook URLs validated against internal addresses
6. **Input Validation** - Strict length limits on all user inputs
7. **Error Exposure** - Internal errors hidden in production

### Validation Rules
- API key scopes: `read`, `write`, `admin`, `agents`, `sessions`, `webhooks`
- Webhook events: `session.*`, `user.*`, `startup.*`, `agent.*`, `*`
- Message roles: `user`, `assistant`, `system`
- Max prompt length: 10,000 characters
- Max message content: 50,000 characters
- Webhook URL: HTTPS only in production, no localhost/private IPs

---

## RAG Backend (Separate Service)

The RAG functionality is handled by a separate backend service in `/RAG`:
- PDF parsing and chunking
- Vector database integration
- Embedding generation pipeline
- Semantic search

---

## API Endpoints

### Users
- `POST /api/v1/users` - Create user (admin)
- `GET /api/v1/users/me` - Get current user profile
- `PATCH /api/v1/users/me` - Update current user profile
- `GET /api/v1/users/:id` - Get user by ID
- `PATCH /api/v1/users/:id` - Update user (admin)
- `DELETE /api/v1/users/:id` - Delete user (admin)

### Startups
- `POST /api/v1/startups` - Create startup (admin)
- `GET /api/v1/startups` - List all startups
- `GET /api/v1/startups/:id` - Get startup by ID
- `PATCH /api/v1/startups/:id` - Update startup (admin)
- `DELETE /api/v1/startups/:id` - Delete startup (admin)

### Sessions
- `POST /api/v1/sessions` - Create session
- `GET /api/v1/sessions` - List user sessions
- `GET /api/v1/sessions/:id` - Get session by ID
- `POST /api/v1/sessions/:id/end` - End session
- `POST /api/v1/sessions/:id/activity` - Track activity
- `GET /api/v1/sessions/:id/activity` - Get activity
- `POST /api/v1/sessions/:id/messages` - Add message
- `GET /api/v1/sessions/:id/messages` - Get messages
- `GET /api/v1/sessions/:id/history` - Get full history

### Agents
- `POST /api/v1/agents/run` - Run agent with LLM Council
- `POST /api/v1/agents/queue` - Queue agent task (async)
- `GET /api/v1/agents/tasks/:taskId` - Get task status
- `DELETE /api/v1/agents/tasks/:taskId` - Cancel task
- `GET /api/v1/agents/stream/:taskId` - SSE stream (5min timeout)

### Admin
- `POST /api/v1/admin/embeddings/upload` - Upload PDF
- `GET /api/v1/admin/embeddings` - List embeddings
- `GET /api/v1/admin/embeddings/:id` - Get embedding
- `DELETE /api/v1/admin/embeddings/:id` - Delete embedding

### MCP
- `POST /api/v1/mcp/servers` - Register MCP server (admin)
- `DELETE /api/v1/mcp/servers/:id` - Unregister server (admin)
- `GET /api/v1/mcp/servers` - List MCP servers
- `GET /api/v1/mcp/servers/:id/tools` - Get server tools
- `POST /api/v1/mcp/servers/:id/discover` - Discover tools (admin)
- `GET /api/v1/mcp/tools` - List all tools
- `POST /api/v1/mcp/execute` - Execute MCP tool

### API Keys
- `POST /api/v1/api-keys` - Create API key
- `GET /api/v1/api-keys` - List user's API keys
- `DELETE /api/v1/api-keys/:id` - Revoke API key

### Webhooks
- `POST /api/v1/webhooks` - Create webhook
- `GET /api/v1/webhooks` - List webhooks
- `GET /api/v1/webhooks/:id` - Get webhook
- `PATCH /api/v1/webhooks/:id` - Update webhook
- `DELETE /api/v1/webhooks/:id` - Delete webhook
- `POST /api/v1/webhooks/:id/regenerate-secret` - Regenerate secret

### Analytics (Admin)
- `GET /api/v1/analytics/dashboard` - Dashboard stats
- `GET /api/v1/analytics/events/aggregation` - Event aggregation

### Health & Metrics
- `GET /api/v1/health` - Health check (returns 503 if unhealthy)
- `GET /api/v1/metrics` - Prometheus metrics

---

## Environment Setup

1. Copy `.env.example` to `.env`
2. Set up PostgreSQL database (Render/Neon/Supabase)
3. Create Supabase project for auth and storage
4. Create Upstash Redis instance
5. Get API keys from LLM providers (at least one required)
6. Run `npm run db:push` to sync schema

## Deployment Checklist

- [ ] Set all environment variables in Render
- [ ] Configure Supabase credentials
- [ ] Configure Upstash Redis URL and token
- [ ] Set up database connection
- [ ] Configure at least one LLM provider
- [ ] Configure CORS origins (not `*` in production)
- [ ] Enable rate limiting for production
- [ ] Set NODE_ENV=production
