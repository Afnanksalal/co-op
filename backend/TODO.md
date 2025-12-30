# Co-Op Backend - Development Status

## ✅ Completed Features

### Core Infrastructure
- [x] NestJS 11 with modular architecture
- [x] TypeScript 5.6 with strict mode
- [x] Drizzle ORM with PostgreSQL (Neon Serverless)
- [x] Upstash Redis + QStash + Vector
- [x] Supabase Auth + Storage
- [x] Prometheus metrics
- [x] Health checks
- [x] Swagger documentation

### LLM Council
- [x] Multi-provider: Groq, Google AI, HuggingFace
- [x] Full cross-critique (each model critiques ALL others)
- [x] Automatic fallback
- [x] Health checks (5-minute intervals)
- [x] Models: Llama 3.3 70B, Kimi K2, Gemini 2.5 Flash, DeepSeek R1, Phi-3, Qwen 2.5

### AI Agents
- [x] Legal agent (RAG)
- [x] Finance agent (RAG)
- [x] Investor agent (Web Research)
- [x] Competitor agent (Web Research)
- [x] Multi-agent A2A orchestration
- [x] QStash async processing
- [x] True SSE streaming with Redis buffer
- [x] Task progress tracking with thinking steps

### Web Research
- [x] Google Gemini Search Grounding (primary)
- [x] ScrapingBee fallback
- [x] Company lookup
- [x] Investor search
- [x] Market research

### MCP Server
- [x] Tool discovery
- [x] Tool execution
- [x] A2A protocol support

### Security
- [x] JWT authentication (Supabase)
- [x] API key auth (SHA-256 hashed, timing-safe comparison)
- [x] Admin guard
- [x] Rate limiting with presets (STANDARD, STRICT, CREATE, READ, BURST)
- [x] AES-256-GCM encryption for sensitive data
- [x] SSRF protection
- [x] Input validation (class-validator, whitelist mode)
- [x] Audit logging
- [x] Helmet.js security headers

### Integrations
- [x] RAG service client with caching (30-min TTL)
- [x] Notion export
- [x] Webhooks (HMAC, encrypted secrets)
- [x] API key management
- [x] SendGrid email service

### New Features (Recently Added)
- [x] Session export (Markdown/JSON)
- [x] Email session summaries
- [x] Document upload (Supabase Storage)
- [x] Bookmarks system
- [x] User analytics dashboard
- [x] Pin/favorite sessions
- [x] RAG query caching
- [x] Retry service with exponential backoff
- [x] Circuit breaker with LRU cleanup
- [x] Investor database module (full CRUD + admin management)
- [x] Competitor alerts module (monitoring + results)


---

## ✅ Agent Improvements - COMPLETED

- [x] Legal: Jurisdiction selector for region-specific advice
  - 9 regions (Global, US, EU, UK, India, Canada, APAC, LATAM, MENA)
  - 25+ jurisdictions (GDPR, CCPA, SEC, HIPAA, etc.)
- [x] Finance: Built-in financial calculators (Runway, Burn Rate, Valuation, Unit Economics)
- [x] Investor: Searchable investor database
  - 20+ real investors (Y Combinator, Sequoia, a16z, First Round, Ribbit, etc.)
  - Admin management panel with full CRUD
  - Filter by stage, sector, region
  - Seed script for initial data
- [x] Competitor: Real-time competitor monitoring alerts
  - 3 alerts per user (pilot limit)
  - Keywords and competitor tracking
  - Alert results with read/unread status
  - Email notification support
  - Split-view UI for alerts and results

---

## 🔄 In Progress

### Architecture Improvements
- [ ] Database migrations (currently using db:push)
- [ ] Connection pooling optimization
- [ ] Query performance optimization

---

## 📋 Planned

### Q1 2026
- [ ] Team collaboration features
- [ ] Multiple founders per startup
- [ ] Shared sessions
- [ ] Role-based access

### Q2 2026
- [ ] Idea stage validation flow
- [ ] Market research agent
- [ ] Business model canvas

### Q3 2026
- [ ] SSO integration
- [ ] Custom AI training
- [ ] On-premise deployment
- [ ] SLA guarantees

### Monetization
- [ ] Stripe integration
- [ ] Usage-based billing
- [ ] Pricing tiers

---

## 🐛 Known Issues

- Single founder per startup (by design for pilot)
- 3 request limit for free users (pilot program)
- Admins have unlimited usage

---

## 📝 Notes

### Current Limitations
- Pilot program: 3 free AI requests/month (resets on 1st)
- Single founder per startup
- Premium features coming soon

### Environment Requirements
- Node.js 20+
- PostgreSQL (Neon Serverless recommended)
- Redis (Upstash REST API)
- Minimum 2 LLM API keys for council

### Security Checklist
- ✅ JWT authentication
- ✅ API key hashing (SHA-256)
- ✅ Timing-safe comparison
- ✅ AES-256-GCM encryption with key versioning
- ✅ API key revocation support
- ✅ Rate limiting with configurable presets
- ✅ Input validation
- ✅ Audit logging with DLQ
- ✅ Security headers (Helmet)
- ✅ CORS configuration (production domains only)
- ✅ Circuit breaker
- ✅ IP validation for proxy headers
- ✅ Error message sanitization
- ✅ Encryption key required in production
- ✅ SHA-256 cache keys (upgraded from MD5)
- ✅ Notion API timeout protection (30s)
- ✅ MCP tool discovery timeout (30s)
- ✅ Auth token caching (30s) to reduce Supabase calls
- ✅ Failed auth rate limiting (10 failed attempts/min per IP)
- ✅ SSE token via query param (EventSource limitation)
- ✅ Health check caching (5s TTL)
- ✅ Webhook exponential backoff

### CI/CD Pipeline (v1.4.0)
- ✅ GitHub Actions workflow
- ✅ Automated linting and type checking
- ✅ Build verification for all services
- ✅ Security audit checks

### Configurable Pilot Limits (v1.4.0)
- ✅ PILOT_AGENT_MONTHLY_REQUESTS
- ✅ PILOT_API_KEY_LIMIT
- ✅ PILOT_API_KEY_MONTHLY_REQUESTS
- ✅ PILOT_WEBHOOK_LIMIT
- ✅ PILOT_WEBHOOK_DAILY_TRIGGERS
- ✅ PILOT_ALERT_LIMIT
- ✅ PILOT_LEAD_LIMIT
- ✅ PILOT_LEAD_DISCOVERY_HOURLY
- ✅ PILOT_CAMPAIGN_LIMIT
- ✅ PILOT_EMAILS_PER_DAY

### Bug Fixes (v1.3.3)
- ✅ Auth rate limit rework - only count FAILED attempts, not all attempts
- ✅ Token caching to avoid re-verifying same token repeatedly
- ✅ SSE endpoints accept token via query parameter
- ✅ Frontend passes token via query param for SSE connections
- ✅ Users controller now has proper rate limiting
- ✅ Orchestrator DLQ retry count properly incremented on restore
- ✅ Campaigns N+1 query fixed (batch lead fetching in getEmails/sendCampaign)
- ✅ Secure documents chunkText infinite loop prevention
- ✅ MCP getToolSchema returns actual tool data from cache
