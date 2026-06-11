# Feature Removal Audit

Scope: compare the current product state at `a58591c` with the last full pre-pivot baseline at `c2c6994`.

## Executive Finding

The current repository is not feature-equivalent to the earlier Co-Op product. The pivot replaced a broad hosted AI advisory SaaS with a much smaller cloud license plane plus local desktop shell. That removed real product capabilities, not only unused code.

Diff scale:

- 557 files changed
- 14,113 insertions
- 135,818 deletions
- Entire top-level `MobileApp/` and `RAG/` services removed
- Most old backend feature modules removed
- Most old dashboard routes removed

Any release messaging that still promises AI outreach, web research, full LLM council behavior, RAG document intelligence, investor tools, cap-table tools, competitor alerts, or hosted dashboard workflows is currently inaccurate.

## What Was Removed

| Area | Old evidence | Current status | Product impact | Recommended action |
| --- | --- | --- | --- | --- |
| Customer outreach | `backend/src/modules/outreach/*`, `backend/src/database/schema/outreach.schema.ts`, `frontend/src/app/(dashboard)/tools/outreach/*` | Removed | Lead discovery, lead CRUD, campaigns, personalized email generation, tracking, and outreach UI are gone. | Restore as a local-first desktop module with explicit connectors for research and email sending. |
| Web research and scraping fallback | `backend/src/common/research/*`, `SCRAPINGBEE_API_KEY`, Gemini search grounding, ScrapingBee Google SERP fallback | Removed | Investor, competitor, market research, lead discovery, and enrichment cannot use live web data. | Rebuild as a connector system. Default to disabled until customer configures a compliant provider. |
| Email sending | `backend/src/common/email/*`, SendGrid env keys, campaign email records | Removed | Session summary email, campaign sending, delivery tracking, and email notifications are gone. | Rebuild with BYO SMTP, SendGrid, Resend, or Microsoft/Google provider. Keep credentials local unless the customer explicitly opts into cloud storage. |
| LLM council backend | `backend/src/common/llm/*` with router, providers, council, response sanitizer | Removed | The old multi-model council is gone. Current desktop workflow is a simpler provider call with optional review policy. | Rebuild council as bounded local orchestration: primary model plus optional review pass, never default multi-model fan-out. |
| Agent orchestration | `backend/src/modules/agents/*`, A2A service, queue service, stream controller, domain agents | Removed | Hosted legal, finance, investor, competitor agent APIs and SSE/queue execution are gone. | Rebuild in the desktop runtime as a durable local workflow harness with typed jobs, audit logs, and provider adapters. |
| RAG and document intelligence | top-level `RAG/`, `backend/src/common/rag/*`, `backend/src/modules/documents/*`, `backend/src/modules/secure-documents/*`, document schemas | Removed | Document-grounded answers, secure document upload, encrypted user docs, and vector search are gone. | Restore locally using an embedded database plus vector index, or a self-host option such as Neo4j/vector services. |
| Startup workspace | `backend/src/modules/users/*`, `startups/*`, `sessions/*`, `bookmarks/*`, `analytics/*` and matching dashboard routes | Removed | Onboarding, startup profile, chat sessions, bookmarks, exports, analytics, and usage dashboards are gone. | Store business workspace state locally in desktop, with cloud limited to account and license. |
| Business tools | investor database, alerts, pitch deck, cap table, calculators, AI insights pages | Removed | The product is now a generic workflow runner, not the earlier business-management suite. | Restore high-value tools as local desktop workspaces with local persistence and import/export. |
| API keys, webhooks, MCP, Notion | `api-keys`, `webhooks`, `mcp`, `mcp-server`, `notion` modules and dashboard pages | Removed | Developer/integration surface is gone. | Rebuild as local connectors only after core desktop workflows are stable. |
| Security and reliability infrastructure | audit logs, cache, circuit breaker, retry, metrics, Redis, QStash, encryption service, response interceptor | Mostly removed | The cloud license API is simpler, but observability and resilience are thinner than the old SaaS backend. | Keep license backend lean, but add focused license audit/metrics. Rebuild local workflow audit, retry, and provider fault handling. |
| Admin operations | old admin user management, embeddings/admin docs, pilot usage management | Removed | Admin is now license management only. | Accept if cloud scope is licensing; otherwise document explicitly and restore only needed admin operations. |
| Mobile app | top-level `MobileApp/` Expo/Hermes wrapper | Removed | No mobile app build remains. | Do not restore unless mobile is a product requirement. The desktop-first model makes mobile secondary. |
| Standalone RAG service | top-level `RAG/` FastAPI service | Removed | No deployable vector-search microservice remains. | Replace with local/self-host option instead of reintroducing a mandatory hosted service. |

## Current Product Capabilities

Current backend:

- Supabase-backed user auth verification
- Admin license creation and listing
- Customer self-service license creation/listing
- License activation, heartbeat, deactivation
- License hashing, activation-token hashing, license event records
- Basic health checks

Current frontend and desktop:

- Landing page
- Login
- Account center
- Download page
- Admin license page
- Tauri desktop shell
- Local activation state
- Local model settings
- Local business workflow runner for operations, finance, legal, sales, and strategy
- Ollama or OpenAI-compatible provider mode

## Product Breakages From The Removal

These are not just missing nice-to-haves:

- Personalized outreach is broken if it is still expected.
- Lead discovery is broken if it is still expected.
- Campaign sending and tracking are broken if still advertised.
- Live web research is gone.
- RAG-backed document workflows are gone.
- Full hosted agent APIs are gone.
- Old dashboard URLs for tools and sessions are gone.
- Old mobile and standalone RAG deployment paths are gone.

## Root Cause

The pivot was implemented as a product replacement, not a faithful port. Old modules were removed while building the local-first licensing and desktop model. That may reduce cloud complexity, but it also removed product value without a feature-by-feature signoff.

The correct standard from here is:

- Do not call a feature "bloat" unless it is explicitly rejected as a product requirement.
- Do not delete a feature family without a replacement path.
- Keep a migration matrix for every old module before removal.
- Preserve old code as reference until equivalent local-first capability exists.

## Restoration Direction

The old hosted SaaS architecture should not be blindly copied back into the license backend. The business model now says local-first desktop with cloud licensing, so feature restoration should follow that boundary.

Recommended target shape:

- Cloud backend: account, billing, license, release channels, entitlement, minimal audit.
- Desktop runtime: local data store, workflow execution, provider keys, RAG index, outreach records, job queue, audit history.
- Connectors: Ollama, OpenAI-compatible API, SMTP/SendGrid/Resend, web research/scraping providers, CRM import/export.
- Self-host bundle: optional Neo4j/vector service, Ollama, and local desktop configuration.
- Enterprise controls: allow/deny external connectors, export logs, signed releases, offline grace, backup/restore.

## Immediate No-Regression Checklist

Before shipping, every claimed product feature needs one of these states:

- Implemented and tested
- Explicitly documented as removed
- Explicitly documented as planned
- Hidden from UI and marketing

Features that must be hidden until restored:

- AI lead discovery
- Personalized outreach
- Campaign sending/tracking
- Web research
- RAG/document intelligence
- Investor database
- Competitor alerts
- Cap table simulator
- Pitch deck analyzer
- Full LLM council
- MCP/API key/webhook integrations
- Mobile app

