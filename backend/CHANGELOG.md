# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-13

### Added

#### Core Infrastructure
- NestJS 11 with modular architecture
- TypeScript 5.6 with strict mode
- Drizzle ORM with PostgreSQL
- Upstash Redis for caching and BullMQ queues
- Supabase Auth integration (JWT verification)
- Supabase Storage for file uploads
- Prometheus metrics endpoint
- Health check endpoint
- Swagger/OpenAPI documentation

#### LLM Council Architecture
- Multi-provider support: Groq, Google AI, HuggingFace
- Cross-critique consensus mechanism
- Automatic provider fallback
- Periodic health checks (5-minute intervals)
- Models: Llama 3.3 70B, Llama 4 Scout, Qwen 3 32B, Kimi K2, Gemini 1.5 Flash, Mistral 7B, Phi-3 Mini

#### AI Agents
- Legal agent with LLM Council
- Finance agent with LLM Council
- Investor agent with LLM Council + web research
- Competitor agent with LLM Council + web research
- Multi-agent orchestration
- BullMQ job queue for async processing
- SSE streaming (5-minute timeout)
- Task status polling and cancellation

#### Web Research
- Google Gemini with Search Grounding
- Real-time web search
- Company lookup
- Investor search
- Market research
- News search with date filtering

#### MCP Server
- Tool discovery endpoint
- Tool execution endpoint
- A2A (Agent-to-Agent) protocol support
- Multi-agent query tool
- Master API key authentication

#### User Management
- User registration and profiles
- Onboarding flow with startup creation
- OAuth provider tracking (Google, GitHub)
- Admin role management

#### Startup Profiles
- Comprehensive startup schema (24 industries, 6 stages)
- Business model tracking
- Funding information
- Team composition

#### Sessions
- Chat session management
- Message history
- Activity tracking
- Session lifecycle (create, end)

#### Integrations
- Notion export (internal integration)
- RAG service client
- Webhook subscriptions with HMAC verification
- API key management

#### Security
- JWT authentication (Supabase)
- API key authentication with timing-safe comparison
- Admin guard for privileged operations
- User throttle guard for rate limiting
- SSRF protection for webhooks
- Input validation with class-validator
- Helmet security headers
- CORS configuration

#### DevOps
- Docker support with multi-stage build
- Render deployment blueprint
- Environment configuration with Zod validation
- ESLint 9 with strict TypeScript rules
- Prettier formatting

### Security Fixes (Audit - December 2024)
- Added timing-safe comparison to API key guard
- Added timing-safe validation to MCP server controller
- Added API key authentication to metrics endpoint
- Added warning log when running without MASTER_API_KEY

### Bug Fixes (Audit - December 2024)
- Fixed UserThrottleGuard constructor (was incorrectly extending ThrottlerGuard)
- Added `executeOnce` method to CircuitBreakerService
- Improved A2A polling with exponential backoff
- Fixed cache invalidation on session end
- Fixed unused `days` parameter in ResearchService.searchNews

### Code Quality (Audit - December 2024)
- Refactored duplicate code in AgentsService into `buildAgentInput` method
- Added periodic health checks to LLM Council
- Added retry mechanism with exponential backoff to webhooks
- Improved action validation error messages in sessions

---

## [Unreleased]

### Planned
- Database migrations (currently using db:push)
- Integration tests for critical paths
- Request logging middleware
- Per-endpoint rate limiting
- Webhook delivery status tracking

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-12-13 | Initial release |

---

## Upgrade Guide

### From 0.x to 1.0.0

This is the initial release. No upgrade path required.

### Future Upgrades

When upgrading between versions:

1. Read the changelog for breaking changes
2. Update environment variables if needed
3. Run database migrations: `npm run db:migrate`
4. Test in staging before production
5. Monitor logs after deployment
