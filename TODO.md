# Co-Op TODO

## High Priority - COMPLETED ✓

### Export & Sharing
- [x] Conversation history export (Markdown/JSON download)
- [x] Email session summaries to users (SendGrid integration)

### Chat Enhancements
- [x] Document upload in chat (PDF, DOC, TXT for context)
- [x] Saved responses/bookmarks system
- [x] True streaming responses (SSE implementation with fallback polling)

### Performance
- [x] Caching layer for common RAG queries (30-min TTL)
- [x] Error recovery with automatic retry logic (exponential backoff)
- [x] Frontend API client retry logic with exponential backoff
- [x] N+1 query fixes for investors and alerts services
- [x] HuggingFace Inference API for RAG compression (no local models)

## Medium Priority - COMPLETED ✓

### User Features
- [x] Usage analytics dashboard for users (not just admins)
- [x] Personal usage history and trends
- [x] Favorite/pin important sessions

### Mobile Experience
- [x] Mobile-optimized chat interface (responsive design)
- [x] Touch-friendly interactions (larger tap targets)
- [x] PWA improvements (shortcuts, share target)
- [x] Consistent mobile UI/UX across all dashboard pages
- [x] Responsive typography and spacing system
- [x] Native mobile app (Expo SDK 54, iOS/Android)

## Agent Improvements - COMPLETED ✓

- [x] Legal: Jurisdiction selector for region-specific advice
- [x] Finance: Built-in financial calculators
- [x] Investor: Searchable investor database
- [x] Competitor: Real-time competitor monitoring alerts

## Customer Outreach - COMPLETED ✓

- [x] Lead discovery (AI-powered search for people and companies)
- [x] Lead enrichment (social profiles, followers, engagement)
- [x] Lead scoring and status tracking
- [x] Campaign management (single template + AI personalized modes)
- [x] Variable substitution in email templates
- [x] Email tracking (opens, clicks, bounces)
- [x] Campaign analytics

## Secure Documents - COMPLETED ✓

- [x] Encrypted document storage (AES-256-GCM)
- [x] Document chunking and processing
- [x] Per-user isolation
- [x] Auto-expiry with configurable TTL
- [x] Semantic search via Upstash Vector
- [x] RAG integration for AI conversations

## Mobile App - COMPLETED ✓

- [x] React Native app with Expo SDK 54
- [x] WebView wrapper for Co-Op web app
- [x] OAuth support via system browser (Google)
- [x] Deep linking (`coop://` scheme + universal links)
- [x] Theme sync with website (light/dark mode)
- [x] Offline detection with retry UI
- [x] Android hardware back button support
- [x] Edge-to-edge display with safe area padding injection
- [x] URL allowlisting for security

## Low Priority / Future

### Collaboration
- [ ] Team workspaces
- [ ] Shared sessions between team members
- [ ] Comments/annotations on responses

### Monetization
- [ ] Pricing tiers implementation
- [ ] Stripe integration for payments
- [ ] Usage-based billing

### Integrations
- [ ] Slack integration
- [ ] Calendar integration for follow-ups
- [ ] CRM integrations (HubSpot, Salesforce)

## Security & Infrastructure - COMPLETED ✓

- [x] AES-256-GCM encryption for sensitive data
- [x] Rate limiting with configurable presets
- [x] Audit logging for compliance
- [x] Circuit breaker for fault tolerance
- [x] Timing-safe API key comparison
- [x] Helmet.js security headers

## Completed Features ✓

### Core
- [x] Vercel Analytics integration
- [x] Session naming & organization (title, search, date grouping)
- [x] Follow-up suggestions after responses
- [x] Regenerate last response
- [x] Response rating (thumbs up/down)
- [x] Dark mode toggle
- [x] Keyboard shortcuts (Cmd+K, Cmd+/)
- [x] Dashboard session titles
- [x] RAG geographic/jurisdictional filtering
- [x] Fix Phosphor icons deprecation warnings

### High Priority
- [x] Conversation history export (Markdown/JSON)
- [x] Saved responses/bookmarks system
- [x] RAG query caching (30 min TTL)
- [x] Retry service with exponential backoff
- [x] Email session summaries (SendGrid)
- [x] Document upload in chat (Supabase Storage)
- [x] True SSE streaming with fallback polling

### Medium Priority
- [x] User analytics dashboard (/usage page)
- [x] Personal usage history with activity chart
- [x] Pin/favorite sessions
- [x] Mobile-responsive improvements
- [x] PWA shortcuts and share target

### Security
- [x] AES-256-GCM encryption service
- [x] Rate limiting presets (STANDARD, STRICT, CREATE, READ, BURST)
- [x] Audit logging service
- [x] Circuit breaker with LRU cleanup
- [x] Timing-safe API key comparison
- [x] SHA-256 cache keys (upgraded from MD5)
- [x] IP validation for proxy headers
- [x] Error message sanitization
- [x] Encryption key required in production
- [x] SSE reconnection with exponential backoff
- [x] Embedding timeout protection (30s)
- [x] Notion API timeout protection (30s)
- [x] DLQ retry count tracking fix

### Bug Fixes (v1.3.1)
- [x] Orchestrator DLQ retry count now properly incremented
- [x] Campaigns N+1 query fixed (batch lead fetching)
- [x] Secure documents chunk text infinite loop prevention
- [x] Notion service timeout protection added
- [x] MCP getToolSchema returns actual tool data

### Bug Fixes (v1.3.7)
- [x] Session integrity validation (prevent session hijacking)
- [x] RAG service user document chunks fix (Upstash Vector SDK list iteration)
- [x] Prometheus HTTP metrics interceptor fix
- [x] Toast positioning fix for mobile devices
- [x] Finance agent parameters (financeFocus, currency)
- [x] Jurisdiction dropdown for chat/agents pages
- [x] Queue Health card in analytics dashboard
- [x] DLQ metrics tracking (taskQueueSize, taskDlqSize, retryAttemptsTotal, retrySuccessesTotal)

### Agent Improvements
- [x] Legal: Jurisdiction selector (region + specific regulations)
  - 9 regions (Global, US, EU, UK, India, Canada, APAC, LATAM, MENA)
  - 25+ jurisdictions (GDPR, CCPA, SEC, HIPAA, etc.)
- [x] Finance: Built-in financial calculators
  - Runway Calculator
  - Burn Rate Calculator
  - Valuation Calculator
  - Unit Economics Calculator (LTV, CAC, payback)
- [x] Investor: Searchable investor database
  - 20+ real investors (Y Combinator, Sequoia, a16z, etc.)
  - Filter by stage, sector, region
  - Admin management panel (/admin/investors)
  - Bulk import via seed script
  - Direct links to investor websites/LinkedIn
- [x] Competitor: Real-time monitoring alerts
  - 3 alerts per user (pilot limit)
  - Keywords and competitor tracking
  - Email notifications
  - Daily/weekly/realtime frequency
  - Results viewing with read/unread status
  - Split-view UI for alerts and results

### Customer Outreach (v1.3.0)
- [x] Lead discovery with AI-powered search
  - People (influencers, content creators)
  - Companies (potential customers, partners)
- [x] Lead enrichment
  - Social profiles, followers, engagement metrics
  - Industry, niche, location
  - Custom fields for flexible data
- [x] Lead management
  - Scoring and status tracking
  - Tags and filtering
  - Bulk operations
- [x] Campaign management
  - Single Template mode (one email for all)
  - AI Personalized mode (unique emails per lead)
  - Variable substitution ({{name}}, {{company}}, etc.)
  - Email preview before sending
- [x] Email tracking
  - Open tracking (pixel)
  - Click tracking (link wrapping)
  - Bounce/failure handling
  - Campaign analytics

### Secure Documents (v1.3.0)
- [x] Encrypted document storage
  - AES-256-GCM encryption for all content
  - Original files deleted after processing
  - Per-user isolation
- [x] Document processing
  - Chunking for large documents
  - Supported formats: PDF, DOC, DOCX, TXT, MD, images
  - Auto-expiry with configurable TTL
- [x] RAG integration
  - Semantic search via Upstash Vector
  - Context injection into AI conversations
  - On-demand decryption for queries
