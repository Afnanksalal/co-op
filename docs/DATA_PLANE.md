# Local Data Plane

Co-Op ships as local-first desktop software. The cloud backend is the account and license control plane. Customer business memory lives on the installed machine unless the customer explicitly configures an external AI, web-source, email, or integration provider.

## Default Storage Model

```mermaid
flowchart TD
  Desktop["Co-Op Desktop"]
  State["state.json<br/>profile, settings summaries, chats, plans, customers, history"]
  Files["knowledge.sqlite3<br/>company files, memories, search rows, matching data"]
  Secrets["OS credential store<br/>activation token and private keys"]
  Cloud["Cloud license API"]
  Provider["Customer-selected providers"]

  Desktop --> State
  Desktop --> Files
  Desktop --> Secrets
  Desktop -->|"activation, heartbeat, deactivation"| Cloud
  Desktop -->|"only when configured"| Provider
```

The default build does not require Docker, Neo4j, Qdrant, LanceDB, Turbopuffer, or a hosted matching service.

## What Ships In The Desktop Build

`state.json` stores lightweight local application state:

- Entitlement snapshot.
- Company profile and onboarding state.
- Provider setting summaries.
- Chat sessions.
- Work plan history.
- Research runs.
- Leads, campaigns, generated email status, and send status.
- Alerts.
- Pitch deck analyses.
- Cap table scenarios.
- Bookmarks.
- Integrations.
- Saved file summaries.
- Saved business memory summaries.

`knowledge.sqlite3` stores company file and memory intelligence:

- Documents.
- Sections.
- Business memories.
- Memory types, sources, confidence, and pinned state.
- Content hashes.
- Content sizes.
- Section order.
- Token counts.
- Full-text search rows.
- Compact deterministic matching data.
- Schema version and migrations.

OS credential storage stores:

- Activation token.
- Customer AI provider key.
- Firecrawl key.
- Resend or SendGrid key.
- Integration secrets when supported.

## File Intelligence

The embedded file store uses SQLite because it gives a stable local database without making business owners run infrastructure.

It provides:

- In-place schema upgrades.
- WAL mode for safer local writes.
- Duplicate-content handling through content hashes.
- Full-text candidate search.
- Deterministic compact matching data.
- Hybrid scoring across title, source, content, business terms, section order, and local matching.
- Bounded excerpts for chat and work plans.

This is not a cloud vector database. It is an embedded local search layer designed to be reliable on ordinary business laptops.

## Local Business Memory

Business memory is durable owner context that should improve future answers without asking the owner to repeat themselves.

Stored memory types:

- Profile.
- Decision.
- Risk.
- Preference.
- Customer.
- Research.
- Plan.
- Conversation.
- Note.

Memory is written by:

- The Memory section inside Company.
- Company profile saves.
- Completed plans.
- Advisor chat answers.
- Research summaries.
- Pitch deck reviews.

`memory_store.rs` stores memories in SQLite with full-text search and compact deterministic matching data. `memory.rs` performs validation, secret redaction, state refresh, and bounded context retrieval.

`graph.rs` derives a broader local business memory snapshot from:

- Company profile.
- Company files.
- Saved memories.
- Research runs.
- Leads and campaigns.
- Campaign emails.
- Work history.

The UI should call this "what Co-Op remembers" or "business memory." It should not expose graph terminology to normal owners.

Memory must not store:

- Raw provider keys.
- Raw license keys.
- Activation tokens.
- Hidden prompts.
- Full unbounded model traces.
- Customer output that was blocked by guardrails.

## Guardrail Storage Behavior

Blocked requests and blocked model outputs should not be stored as successful business artifacts. Error messages should be short, owner-readable, and free of raw prompts or secrets.

The local runtime validates:

- Business-topic fit.
- Prompt-injection patterns.
- Secret disclosure attempts.
- Code execution requests.
- Outside-fact work that lacks web sources.
- Model output containing executable code blocks or hidden-instruction leakage.

## Performance Rules

- Keep local collections capped before persistence.
- Bound file size and section count before indexing.
- Deduplicate repeated content.
- Limit context excerpts sent to providers.
- Prefer local embedded storage as the default path.
- Treat external memory/search services as optional derived indexes.
- Keep the app usable on normal laptops without Docker.

## Optional Self-Host Data Plane

Larger teams may eventually need a self-host profile. That should be optional and explicit.

Recommended direction:

```mermaid
flowchart LR
  Desktop["Desktop app"]
  Embedded["Embedded SQLite fallback"]
  Neo4j["Optional Neo4j<br/>relationship memory"]
  Vector["Optional local matching service<br/>Qdrant or LanceDB"]
  Cloud["Cloud license API"]

  Desktop --> Embedded
  Desktop -. "team profile" .-> Neo4j
  Desktop -. "team profile" .-> Vector
  Desktop -->|"license only"| Cloud
```

Default:

- Embedded local state.
- Embedded local company file search.
- Derived business memory.
- No Docker.

Team self-host:

- Optional Docker Compose profile.
- Neo4j for durable relationship queries.
- Qdrant or LanceDB for larger local matching workloads.
- Health checks and fallback to embedded storage.

Enterprise:

- Customer-managed relationship/search endpoints.
- Explicit admin settings.
- Local embedded fallback.

Turbopuffer or other managed cloud search should only be used when a customer intentionally accepts that external dependency. It is not the local-first default.

## Migration Rules

- Do not move workspace data, prompts, outputs, files, or matching data into the cloud license plane.
- Do not require Docker for a normal desktop install.
- Add optional memory/search services behind explicit settings and health checks.
- Keep embedded storage as the fallback path.
- Treat external indexes as derived data.
- Keep `state.json` and `knowledge.sqlite3` as local sources of truth for the default product.

## Failure Behavior

If required web sources for outside-fact work, or optional email, AI, or memory services, are not configured:

- The feature should explain the missing setup in plain language.
- The app should not pretend work succeeded.
- Local features that do not need that service should continue working.
- No placeholder or fake result should be saved.
