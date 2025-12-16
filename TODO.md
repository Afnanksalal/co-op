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

## Medium Priority - COMPLETED ✓

### User Features
- [x] Usage analytics dashboard for users (not just admins)
- [x] Personal usage history and trends
- [x] Favorite/pin important sessions

### Mobile Experience
- [x] Mobile-optimized chat interface (responsive design)
- [x] Touch-friendly interactions (larger tap targets)
- [x] PWA improvements (shortcuts, share target)

## Agent Improvements - COMPLETED ✓

- [x] Legal: Jurisdiction selector for region-specific advice
- [x] Finance: Built-in financial calculators
- [x] Investor: Searchable investor database
- [x] Competitor: Real-time competitor monitoring alerts

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
