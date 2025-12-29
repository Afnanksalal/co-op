# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.0] - 2025-12-29

### New Features

#### Admin User Management
- **Full User CRUD** - Complete user management for administrators
  - List users with search, filtering, pagination, and sorting
  - Create new users with role assignment
  - Update user details (name, role, status, admin notes)
  - Soft delete users with audit trail

- **User Status Management** - Suspend and activate users
  - Suspend users with optional reason
  - Activate suspended users
  - Status reflected in user settings table

- **Pilot Usage Tracking** - View and reset existing pilot limits
  - Agent requests: 3/month (stored in Redis)
  - API keys: 1 per user
  - Webhooks: 1 per user
  - Leads: 50 per user
  - Campaigns: 5 per user
  - Admin can reset agent usage (clears Redis key)

- **Bulk Operations** - Efficient multi-user actions
  - Bulk suspend (up to 100 users)
  - Bulk activate (up to 100 users)
  - Bulk delete (up to 100 users)

- **User Statistics** - Dashboard stats for admins
  - Total, active, suspended user counts
  - Admin user count
  - Users created this month
  - Onboarded user count

### Database

- **User Settings Schema** - New `user_settings` table
  - Status tracking (active/suspended)
  - Suspension reason storage
  - Admin notes field
  - Last activity timestamp

### Frontend

- **Admin Users Tab** - New tab in admin dashboard
  - Stats cards with key metrics
  - User list with selection checkboxes
  - Search and status filtering
  - Per-user action buttons
  - Pilot usage dialog showing all limits
  - Bulk action toolbar
  - Pagination controls

---

## [1.3.7] - 2025-12-28

### Bug Fixes

#### Session Integrity
- **Session Integrity Validation** - Added validation to prevent session hijacking
  - Sessions now verify user ownership before allowing message operations
  - Prevents cross-user session access attempts

#### RAG Service
- **User Document Chunks Fix** - Fixed `get_user_document_chunks` in RAG service
  - Upstash Vector SDK `fetch()` returns a list, not a dict
  - Changed iteration from `.items()` to direct list iteration
  - Added `hasattr()` checks for safe attribute access

#### Prometheus Metrics
- **HTTP Metrics Interceptor Fix** - Fixed Prometheus metrics collection
  - HTTP interceptor now properly records request duration and counts
  - LLM, Redis, and Agent metrics now reporting correctly

#### UI/UX Improvements
- **Toast Positioning Fix** - Fixed toast notifications on mobile
  - Toasts now properly positioned and visible on mobile devices

#### Real-time Thinking Steps
- **Agent Progress Callbacks** - Fixed thinking steps not showing in real-time
  - All domain agents (Legal, Finance, Investor, Competitor) now pass `onProgress` to LLM Council
  - Real-time progress updates: RAG search, web research, council phases, critique scores
  - Thinking steps now properly stream via SSE to frontend
  - Shows which agent is working, what phase, and detailed progress

### New Features

#### Analytics Dashboard
- **Queue Health Card** - Added Queue Health monitoring to analytics page
  - Dead Letter Queue status with color-coded indicator (green=0, yellow=<10, red=10+)
  - Total agent tasks count
  - Agent task status breakdown (completed/failed/pending)

#### Agent Parameters
- **Finance Agent Parameters** - Added `financeFocus` and `currency` parameters
  - Allows users to specify financial focus area (runway, valuation, metrics, etc.)
  - Currency selection for financial calculations

- **Jurisdiction Dropdown** - Added jurisdiction selector to chat and agent pages
  - Region-specific legal and regulatory context
  - Supports multiple jurisdictions (GDPR, CCPA, SEC, etc.)

### Infrastructure

#### Metrics & Monitoring
- **DLQ Metrics Tracking** - Added Dead Letter Queue metrics to Prometheus
  - `taskQueueSize` - Current task queue size
  - `taskDlqSize` - Current DLQ size
  - `retryAttemptsTotal` - Total retry attempts
  - `retrySuccessesTotal` - Successful retries
  - DLQ size reported on init and after processing

## [1.3.6] - 2025-12-27

### Bug Fixes

#### Rate Limiting & Security
- **Admin Controller Rate Limits** - Added rate limits to all admin endpoints
  - Upload: 10/min, List: 100/min, Get: 100/min, Delete: 30/min
  - Vectorize: 10/min (expensive operation), Cleanup: 5/min
  - Prevents abuse of admin endpoints

- **Alerts Controller Guards** - Added missing `UserThrottleGuard`
  - Consistent with other controllers
  - Added default rate limit preset

- **Documents Controller Guards** - Added missing `UserThrottleGuard` and rate limits
  - Added rate limits to GET endpoints (text extraction, download)
  - Consistent security across all document operations

- **Outreach Controllers Guards** - Added missing `UserThrottleGuard`
  - Leads and Campaigns controllers now use consistent guards
  - Added default rate limit presets

- **MCP Controller Guards** - Added missing `UserThrottleGuard` and rate limits
  - All MCP endpoints now have appropriate rate limits
  - Tool execution limited to 30/min, discovery to 10/min
  - Consistent security across MCP operations

- **Notion Controller Guards** - Added missing `UserThrottleGuard` and rate limits
  - Search limited to 30/min, export to 10/min
  - Consistent security across Notion operations

- **Startups Controller Guards** - Added missing `UserThrottleGuard` and rate limits
  - All endpoints now have appropriate rate limits
  - Consistent security across startup operations

- **Analytics Controller Rate Limits** - Added rate limits to admin analytics endpoints
  - Dashboard and event aggregation now rate limited

- **Secure Documents Controller Guards** - Added missing `UserThrottleGuard`
  - Consistent security across secure document operations

#### Error Handling & Resilience
- **API Client Upload Retry** - Frontend upload method now has retry logic
  - Retries on network errors and server errors (5xx)
  - Exponential backoff matching other request methods
  - Improves reliability of file uploads

- **Chat Polling Abort Check** - Fallback polling now checks abort signal
  - Prevents continued polling after user cancels request
  - Cleaner cleanup on navigation away from chat

- **Auth Callback Error Handling** - OAuth error responses now properly handled
  - Displays error_description from OAuth provider
  - Logs errors server-side for debugging
  - Better user feedback on auth failures

- **Domain Agent RAG Graceful Degradation** - Legal and Finance agents now handle RAG failures
  - If RAG service throws, agent continues without RAG context
  - Logs warning but doesn't fail the entire request
  - Improves reliability when RAG service is unavailable

### Code Quality
- Consistent guard usage across all controllers
- Better error handling patterns in frontend

## [1.3.5] - 2025-12-27

### Bug Fixes

#### LLM Provider Robustness
- **Empty Response Guards** - All LLM providers now guard against empty `choices` arrays
  - Groq, Google, HuggingFace providers throw clear errors if API returns empty response
  - Prevents cryptic "cannot read property of undefined" errors

- **Empty Messages Guard** - Google provider validates messages array is not empty
  - Prevents sending empty requests to Gemini API
  - Applies to both `chat()` and `chatStream()` methods

- **Stream Fallback** - LLM Router now falls back to non-streaming on stream failure
  - If streaming fails mid-response, falls back to regular chat completion
  - Improves reliability of streaming responses

#### External Service Timeouts
- **ScrapingBee Timeout** - Added 15-second timeout to ScrapingBee API calls
  - Prevents hanging requests from blocking research operations

- **Supabase Health Check Timeout** - Added 5-second timeout to Supabase health check
  - Prevents health endpoint from hanging if Supabase is slow

#### Security Improvements
- **API Key ID Validation** - Revoke endpoint now validates key ID format
  - Rejects invalid key IDs before database lookup
  - Prevents potential injection via malformed IDs

- **API Key Scope Validation** - Create endpoint validates scopes against whitelist
  - Only allows valid scopes: read, write, agents, sessions
  - Prevents arbitrary scope injection

- **Bookmark Search Sanitization** - ILIKE search patterns now escaped
  - Escapes `%`, `_`, `\` characters in search input
  - Prevents SQL pattern injection via search queries

- **Leads Search Sanitization** - ILIKE search patterns now escaped
  - Escapes special characters in niche and search filters
  - Prevents SQL pattern injection via lead filters

- **Sessions Search Sanitization** - ILIKE search patterns now escaped
  - Escapes special characters in session title search
  - Prevents SQL pattern injection via session search

- **Open Redirect Prevention** - Email tracking link clicks now validate URLs
  - Validates protocol (http/https only)
  - Blocks javascript:, data: URLs and URLs with credentials
  - Returns 400 error for invalid redirect URLs

- **Webhook Signature Timing Attack Fix** - Fixed potential timing attack
  - Now checks buffer lengths before timing-safe comparison
  - Prevents length-based timing attacks on signature verification

- **Admin File ID Validation** - Admin embedding endpoints validate UUID format
  - `forceVectorize()`, `getEmbedding()`, `deleteEmbedding()` validate file IDs
  - Prevents invalid IDs from reaching database queries

#### QStash Improvements
- **Empty Batch Guard** - `publishBatch()` now returns early for empty job arrays
  - Prevents unnecessary API calls with empty payloads

#### Redis Improvements
- **Empty Array Guard** - `mset()` now returns early for empty entry arrays
  - Prevents unnecessary pipeline operations with empty data

#### Cache Improvements
- **User Delete Cache Invalidation** - User cache now invalidated on delete
  - Prevents stale user data after account deletion

### Code Quality
- Improved error messages for LLM provider failures
- Better defensive coding patterns throughout

### Bug Fixes

#### Memory Leaks
- **Auth Guard Cleanup** - Fixed memory leak in auth guard
  - Token cache cleanup interval now properly cleared on module destroy
  - Implements `OnModuleDestroy` lifecycle hook
  - Clears both token cache and failed attempts map on shutdown

- **Orchestrator DLQ Interval** - Already fixed in 1.3.3, interval properly cleared

#### Race Conditions
- **Chat Session Creation** - Fixed race condition when sending multiple rapid messages
  - Added `isCreatingSession` state to prevent duplicate session creation
  - Guards against concurrent session creation attempts

#### Validation Improvements
- **Empty Message Validation** - Sessions service now rejects empty/whitespace-only messages
  - Prevents saving meaningless messages to database
  - Returns clear error message to user

- **Multi-Agent Empty Array** - Agents service now validates agents array is not empty
  - Throws `BadRequestException` if no agents specified
  - Prevents cryptic errors downstream

#### Security Improvements
- **SSRF Port Validation** - Webhook URL validation now checks for blocked ports
  - Blocks common internal service ports (22, 3306, 5432, 6379, 27017, etc.)
  - Prevents SSRF attacks targeting internal services on non-standard ports

- **Logout-All Rate Limit** - Added strict rate limit (3/min) to `/users/me/logout-all`
  - Prevents abuse of sensitive session invalidation endpoint

#### Cache Improvements
- **Frontend Cache Invalidation** - API client now invalidates cache on mutations
  - POST, PATCH, DELETE operations automatically clear related cache entries
  - Prevents stale data after creating/updating/deleting resources

#### Performance Improvements
- **Leads Batch Query** - `getLeadsByIds()` now uses SQL IN clause
  - Previously fetched all user leads and filtered in memory
  - Now uses efficient batch query with `inArray()` for O(1) database lookup

### Code Quality
- Fixed unused variable warning in `SkipAuthRateLimit` decorator
- Removed unused `TRUSTED_PROXY_HOSTS` constant

## [1.3.3] - 2025-12-27

### Bug Fixes

#### Critical: Auth Rate Limiting Breaking Chat
- **Auth Rate Limit Rework** - Fixed rate limiting that was blocking chat functionality
  - Changed from counting ALL auth attempts to only counting FAILED attempts
  - Added 30-second token cache to avoid re-verifying same token repeatedly
  - Added `@SkipAuthRateLimit()` decorator for high-frequency endpoints (SSE, polling)
  - SSE endpoints now accept token via query parameter (EventSource can't send headers)
  - Frontend updated to pass token via query param for SSE connections

#### Orchestrator Service
- **DLQ Retry Count Fix** - Retry count now properly incremented when restoring tasks from dead letter queue
  - Previously, tasks restored from DLQ would reset to retry count 0
  - Now tracks retry count in task metadata for accurate retry tracking

#### Campaigns Service
- **N+1 Query Fix** - Batch lead fetching in `getEmails()` and `sendCampaign()`
  - Previously fetched each lead individually in a loop (N+1 queries)
  - Now uses `getLeadsByIds()` to batch fetch all leads in single query
  - Significant performance improvement for campaigns with many emails

#### Secure Documents Service
- **Infinite Loop Prevention** - Fixed potential infinite loop in `chunkText()`
  - Added safety check ensuring overlap is less than chunk size
  - Added progress check to ensure loop always advances
  - Prevents edge case where `start` could stay at same position

#### Notion Service
- **Timeout Protection** - Added 30-second timeout to all Notion API requests
  - Prevents hanging requests from blocking the event loop
  - Proper cleanup of AbortController on success or failure

#### MCP Service
- **Tool Schema Fix** - `getToolSchema()` now returns actual tool data from cache
  - Previously returned empty placeholder object
  - Now fetches from Redis cache or triggers discovery if not cached

### Security Improvements
- Users controller now has proper rate limiting (was missing)
- `/users/me` endpoint has higher rate limit (200/min) for frequent page loads
- SSE endpoints properly rate limited at connection level (10 new connections/min)
- Task status polling has high rate limit (300/min) for responsive UI

## [1.3.2] - 2025-12-26

### Infrastructure Improvements

#### Security
- **Token Blacklist** - Implemented token revocation via Redis blacklist
  - `blacklistToken()` for single token revocation (logout)
  - `blacklistUserTokens()` for user-wide revocation (force logout everywhere)
  - 24-hour TTL matching typical JWT expiry
- **Auth Rate Limiting** - Added per-IP rate limiting on token verification (20 attempts/minute)
- **Health Check Caching** - 10-second cache to prevent hammering during high traffic
- **Enhanced CORS** - Explicit allowed methods and headers, exposed rate limit headers
- **Improved Helmet Config** - Production-appropriate CSP settings

#### Reliability
- **Graceful Shutdown** - 30-second timeout with proper signal handling (SIGTERM/SIGINT)
- **Uncaught Exception Handling** - Process-level error handlers with log flushing
- **Task Dead Letter Queue** - Failed agent tasks now queued to Redis DLQ
  - Automatic retry with exponential backoff (up to 3 retries)
  - DLQ stats endpoint for monitoring
  - 10-minute retry interval
- **Audit Log DLQ** - Failed audit writes queued to Redis for retry
  - 5-minute retry interval
  - Max 1000 items in queue
- **Email Retry Logic** - Automatic retry with exponential backoff (3 attempts)
  - 10-second timeout per attempt
  - Configurable retry count

#### Observability
- **Request ID Tracing** - Unique request IDs for error correlation
  - Generated for each request
  - Included in error responses and X-Request-Id header
  - Logged with all exceptions
- **Database Connection Metrics** - Real-time tracking of active connections
  - Pool acquire/release events tracked
  - 10-second periodic updates
- **Circuit Breaker Metrics** - Automatic state reporting to Prometheus
  - State changes (open/half-open/closed) tracked
- **Cache Statistics** - Hit/miss tracking with hit rate calculation
  - `getStats()` method for monitoring
  - Reset capability for testing

#### Performance
- **Stale-While-Revalidate Cache** - New `getOrSetSWR()` method
  - Returns stale data immediately
  - Refreshes in background
  - Configurable stale time
- **Cache Warm-up** - Pre-populate cache on startup
  - `registerWarmup()` for key registration
  - Non-blocking warm-up on module init

### Changed
- SupabaseService now requires RedisService for token blacklist
- AuditService now requires RedisService for DLQ
- DatabaseModule now tracks connection pool metrics
- CircuitBreakerService now reports state to MetricsService
- CacheService now implements OnModuleInit for warm-up
- HttpExceptionFilter now includes request ID in responses

## [1.3.1] - 2025-12-26

### Infrastructure Improvements

#### Performance
- **LLM Council Optimization** - Limited council to 2-3 models max (configurable via `LLM_COUNCIL_MAX_MODELS`)
  - Reduced N² cross-critique complexity to bounded O(1)
  - Limited critiques per model to 2 responses max
  - Added 30-second timeout to all LLM calls
  - Added 60-second timeout to critique phase with partial result fallback
- **Non-blocking Startup** - Health checks now run asynchronously on boot
- **Cache Key Collision Fix** - Using full 32-char MD5 hash (128-bit entropy) instead of truncated 16-char
- **Improved Retry Logic** - Full jitter algorithm for better distribution, increased max attempts to 5

#### Security
- **Production Encryption Required** - `ENCRYPTION_KEY` now required in production (fails fast on startup)
- **Strict Decryption Validation** - Validates hex format and lengths before attempting decryption
- **Rate Limit Headers** - Added `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` headers

#### Observability
- **Redis Metrics** - Added operation counts, cache hits/misses, error tracking
- **LLM Token Tracking** - New `llm_tokens_total` metric for cost monitoring
- **Database Metrics** - Added query duration histogram and connection gauge
- **Retry Metrics** - Track retry attempts, successes, and failures

#### Reliability
- **Timeout Protection** - All LLM calls now have 30-second timeout
- **Graceful Degradation** - Critique phase returns partial results on timeout
- **Better Error Messages** - More descriptive error messages with truncated details

### Changed
- Default `LLM_COUNCIL_MAX_MODELS` set to 3 (was unlimited)
- Default retry `maxAttempts` increased to 5 (was 3)
- Default retry `maxDelayMs` increased to 30000ms (was 10000ms)

## [1.3.0] - 2025-12-26

### Added
- **Customer Outreach Module** - Full lead discovery and campaign management
  - AI-powered lead discovery for people (influencers) and companies
  - Lead enrichment with social profiles, followers, engagement metrics
  - Lead scoring and status tracking (new → enriched → contacted → converted)
  - Campaign management with two modes:
    - Single Template: One email template for all leads
    - AI Personalized: Unique AI-generated emails per lead
  - Variable substitution ({{name}}, {{company}}, etc.)
  - Email tracking (opens, clicks, bounces)
  - Campaign analytics and stats
- **Secure Documents Module** - Encrypted user document storage with RAG
  - AES-256-GCM encryption for all document content
  - Original files deleted after processing (chunks only stored)
  - Per-user isolation (users only see their own documents)
  - Auto-expiry with configurable TTL
  - Semantic search via Upstash Vector
  - RAG integration for AI conversations
  - Supported formats: PDF, DOC, DOCX, TXT, MD, images
- New database tables: leads, campaigns, campaign_emails, user_documents, user_document_chunks
- Email tracking controller with pixel tracking and link wrapping
- User docs RAG service for encrypted document queries

### Changed
- Fixed ESLint errors (non-null assertions, unused imports)
- Improved type safety in campaigns and leads services

## [1.2.0] - 2025-12-16

### Added
- **Investor Database Module** - Full CRUD for investor management
  - 20+ real investors seeded (Y Combinator, Sequoia, a16z, etc.)
  - Admin management endpoints with bulk import
  - Filter by stage, sector, region
  - Featured investors support
- **Competitor Alerts Module** - Real-time monitoring system
  - 3 alerts per user (pilot limit)
  - Keywords and competitor tracking
  - Alert results with read/unread status
  - Email notification support
  - Daily/weekly/realtime frequency options
- **Financial Calculators** - Frontend tools page
  - Runway Calculator
  - Burn Rate Calculator
  - Valuation Calculator
  - Unit Economics Calculator (LTV, CAC, payback)
- **Legal Jurisdiction Selector** - Region-specific legal advice
  - 9 regions (Global, US, EU, UK, India, Canada, APAC, LATAM, MENA)
  - 25+ jurisdictions (GDPR, CCPA, SEC, HIPAA, etc.)
- Admin investors management page
- Seed script for initial investor data

### Changed
- Fixed route order in investors controller (admin/all before :id)
- Added PATCH endpoints for partial updates
- Improved alerts page with split-view UI for results

## [1.1.0] - 2025-12-15

### Changed
- Updated LLM model from `gemini-2.5-flash-preview-05-20` to `gemini-2.5-flash`
- Improved multi-agent synthesis prompts for more detailed, actionable responses
- Increased synthesis maxTokens to 3000 for comprehensive answers
- Enhanced task progress tracking with phases: gathering → critiquing → synthesizing

### Added
- Real-time progress updates with estimated time remaining
- `/metrics/admin` endpoint for admin metrics without API key
- Session message persistence for chat continuity
- "Continue Chat" functionality from session detail page

### Fixed
- Session persistence - chat loads existing messages when returning
- Admin analytics infinite loop issue using `useRef` for data loading
- Onboarding 400 error with NaN values

## [1.0.0] - 2024-12-13

### Added

#### Core Infrastructure
- NestJS 11 with modular architecture
- TypeScript 5.6 with strict mode
- Drizzle ORM with PostgreSQL
- Upstash Redis for caching + QStash for serverless queue
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
- Models: Llama 3.3 70B, Gemini 2.5 Flash, Llama 3 8B, Mistral 7B

#### AI Agents
- Legal agent with LLM Council + RAG
- Finance agent with LLM Council + RAG
- Investor agent with LLM Council + web research
- Competitor agent with LLM Council + web research
- Multi-agent orchestration (A2A protocol)
- QStash serverless queue for async processing
- SSE streaming (5-minute timeout)
- Task status polling and cancellation

#### Web Research
- Google Gemini with Search Grounding
- Real-time web search
- Company lookup, investor search, market research

#### MCP Server
- Tool discovery endpoint
- Tool execution endpoint
- A2A (Agent-to-Agent) protocol support
- Multi-agent query tool

#### User Management
- User registration and profiles
- Onboarding flow with startup creation
- OAuth provider tracking (Google, GitHub)
- Admin role management

#### Security
- JWT authentication (Supabase)
- API key authentication with timing-safe comparison
- Admin guard for privileged operations
- Rate limiting
- SSRF protection for webhooks
- Input validation with class-validator

### Security Fixes (Audit)
- Added timing-safe comparison to API key guard
- Added API key authentication to metrics endpoint
- Fixed UserThrottleGuard constructor

### Bug Fixes (Audit)
- Added `executeOnce` method to CircuitBreakerService
- Improved A2A polling with exponential backoff
- Fixed cache invalidation on session end

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.3.7 | 2025-12-28 | Session integrity, RAG fix, Queue Health card, DLQ metrics |
| 1.3.6 | 2025-12-27 | Rate limiting & security fixes across all controllers |
| 1.3.5 | 2025-12-27 | LLM provider robustness, security improvements |
| 1.3.3 | 2025-12-27 | Bug fixes (DLQ retry, N+1 queries, infinite loop, timeouts) |
| 1.3.2 | 2025-12-26 | Infrastructure improvements (token blacklist, graceful shutdown) |
| 1.3.1 | 2025-12-26 | Infrastructure improvements (performance, security, observability) |
| 1.3.0 | 2025-12-26 | Customer outreach, secure documents with RAG |
| 1.2.0 | 2025-12-16 | Investor database, competitor alerts, financial tools |
| 1.1.0 | 2025-12-15 | LLM model updates, progress tracking |
| 1.0.0 | 2024-12-13 | Initial release |
