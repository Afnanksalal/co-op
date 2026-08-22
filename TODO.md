# Co-Op Project Tasks

## Priority: High

### [x] [Issue #9] Decouple Firecrawl from core settings and chat
**Problem**
`validate_model_settings` / `validate_read_only` require a Firecrawl key for all local work. Settings UI also gates save on `researchReady`. Ollama-only owners cannot use chat/RAG/plans without a web-search key.

**Why it matters**
Breaks the local-first product contract. Core app should work offline with a private model.

**Acceptance criteria**
- [ ] Assistant settings can be saved without a Firecrawl key
- [ ] Chat / workflows / RAG work when research is off and no Firecrawl key is saved
- [ ] Web research actions still fail closed with a clear message when key is missing
- [ ] Settings UI does not force the Sources tab when only assistant settings changed

---

### [x] [Issue #10] Lead discovery honesty: empty emails and fake fit scores
**Problem**
Lead extraction leaves `email` empty by design (good for anti-hallucination), but:
- `fallback_leads_from_sources` turns page titles into leads with a fixed 50 fit score
- UI still shows fit badges and pushes toward outreach
- Generate/send then fails with "No matching leads with valid email"

**Why it matters**
Owners think they found emailable prospects when they only have source-page candidates.

**Acceptance criteria**
- [ ] Distinguish **source candidates** vs **contacts with email** in UI and data model/status
- [ ] Never show invented fit scores for title-fallback leads (or label them as unverified)
- [ ] Campaign generate CTA disabled / explained until leads have valid emails
- [ ] Clear empty-state copy after discovery when emails are missing

---

### [x] [Issue #11] Fix misleading Needs approval workflow badge
**Problem**
`approval_required` only triggers an extra model review pass, then the run completes as `completed`. History still shows a "Needs approval" warning badge. There is no human accept/reject gate.

**Why it matters**
High-risk finance/legal/send work looks gated but is not. Contradicts guardrail copy about human approval.

**Acceptance criteria**
Pick one and implement fully:
- **Option A (minimum):** Rename badge/status to "Reviewed" / "Second look" so it is honest
- **Option B (better):** Add real `awaiting_approval` status with accept/reject before treating output as final

Also:
- [ ] Docs/UI copy match the chosen semantics
- [ ] History badge colors/words match status

---

### [x] [Issue #12] Chat streaming and cancel for long Ask runs
**Problem**
Provider calls hardcode `stream: false`. No abort/cancel path in Rust or UI. Ask can run research + A2A + council and return one blob after a long wait.

**Why it matters**
Latency and stuck runs are the main Ask UX pain and waste tokens/trust.

**Acceptance criteria**
- [ ] Primary assistant answer streams tokens to the UI
- [ ] User can cancel an in-flight Ask run
- [ ] Cancel stops further model/research work (best-effort)
- [ ] Existing chat-progress stages still work for research/review phases

---

## Priority: Medium

### [x] [Issue #13] RAG observability and batch embeddings
**Problem**
- Provider embed failure falls back to local lexical space with little owner signal
- Embeddings are one HTTP call per chunk (probe + sequential), no batch API
- Memories stay local-hash only while some docs imply provider embeds for memories
- `reindex_stale_embeddings` swallows errors / limited progress feedback

**Why it matters**
File search quality varies silently by provider health; large uploads are slow/fragile.

**Acceptance criteria**
- [ ] Settings/Files UI shows current embedding mode (local vs provider)
- [ ] Batch embedding for OpenAI-compatible providers where supported
- [ ] Reindex reports progress/errors (event or status), never lies about version
- [ ] Decide and document whether memories stay local-only or get optional upgrade

---

### [x] [Issue #14] Hide or wire the Connections integrations tab
**Problem**
`save_integration` persists MCP/webhook/notion/crm records, but nothing in providers/chat/workflows/research reads `state.integrations`. Connections looks like a real product surface and is a dead end.

**Why it matters**
Violates the repo dead-end policy and confuses owners/contributors.

**Acceptance criteria**
Pick one:
- **Hide:** Remove/disable Connections tab until a consumer exists
- **Wire:** Implement one concrete consumer (e.g. webhook on campaign send, or one MCP tool path)
- [ ] No UI that implies integrations work if they do not

---

### [ ] [Issue #15] Outreach send funnel: email required, preview, honest status
**Problem**
Discovery often cannot produce sendable leads. Generate requires valid emails (good) but the funnel from "Find prospects" does not explain that. Send marks campaign `sent_or_attempted` even if all fail; weak preview/edit gate before batch send.

**Why it matters**
Emailing prospects is the highest-risk owner action and has the weakest end-to-end story.

**Acceptance criteria**
- [ ] Explicit "email required" step before generate/send
- [ ] Per-draft preview/edit before send batch
- [ ] Campaign status reflects actual outcomes (not all-or-nothing attempted)
- [ ] Optional dry-run / test send path

---

### [ ] [Issue #16] Harden local secrets trust and guardrail logging
**Problem**
- File-backed secrets encrypt with a key derived from install/machine fingerprint (not hardware-bound)
- File secret can win over OS keyring
- [x] Guardrails log input previews (up to ~80 chars) which can include sensitive owner text

**Why it matters**
Product contract forbids logging prompts/secrets; local attackers with app data should not decrypt secrets more easily than OS keychain alone.

**Acceptance criteria**
- [ ] Prefer OS keyring as source of truth for high-value secrets
- [ ] No raw input previews in production guardrail logs (hash/truncate category-only)
- [ ] Document the local secret threat model briefly for contributors

---

### [ ] [Issue #17] Add tests for settings, leads, approval, and embed-space paths
**Problem**
Solid unit tests exist for guardrails, validation, knowledge_store, providers helpers, outreach_helpers. Missing coverage on critical new paths:
- settings without Firecrawl
- lead fallback labeling
- approval status semantics
- embed space consistency
- almost no frontend desktop tests

**Why it matters**
These are exactly where regressions will ship after the workflow merge.

**Acceptance criteria**
- [ ] Rust tests: settings/chat allowed without Firecrawl when research off
- [ ] Rust tests: lead fallback is labeled/unverified (no fake strong fit)
- [ ] Rust tests: approval status naming/behavior matches chosen design (#11)
- [ ] Rust tests: embed batch never mixes spaces / wrong versions
- [ ] At least one frontend smoke test for settings save gating (if test runner exists or add minimal one)

---

## Priority: Low

### [ ] [Issue #18] Split oversized modules: providers, guardrails, workflows, outreach UI
**Problem**
Files are past comfortable size and will slow shipping:
- Rust: `guardrails.rs`, `providers.rs`, `knowledge_store.rs`, `workflows.rs`
- Frontend: `shared.tsx`, `dashboard.tsx`, `settings.tsx`, `customers.tsx`

**Why it matters**
Next features dump into these files; reviews and ownership get harder.

**Acceptance criteria**
- [ ] Split providers into chat / embed / firecrawl / email modules (or similar)
- [ ] Split guardrails into classify vs output-gate modules
- [ ] Split outreach UI leads vs campaigns if still oversized
- [ ] No behavior change; tests still pass

---

### [ ] [Issue #19] Align AGENT_ORCHESTRATION docs with runtime behavior
**Problem**
`docs/AGENT_ORCHESTRATION.md` drifts from code:
- implies provider embeddings for memories (code keeps memories local lexical)
- implies review/approval gates that are not human approval

**Why it matters**
Next agents/PRs will implement features under wrong assumptions.

**Acceptance criteria**
- [ ] Docs describe actual embedding spaces (files vs memories)
- [ ] Docs describe actual review vs approval semantics after #11 lands
- [ ] Short "what is intentionally not implemented" section for dead ends

---

### [ ] [Issue #20] Surface non-fatal memory and index failures to the owner
**Problem**
Many `let _ = remember_business_event(...)` / emit / reindex paths drop errors. Document list refresh can fall back quietly. Owners see success while memory/index did not update.

**Why it matters**
Hard to debug "Co-Op forgot" - silent local failures erode trust.

**Acceptance criteria**
- [ ] Non-fatal local warnings surfaced in UI/state (e.g. `lastLocalWarning`)
- [ ] Chat/workflow still succeed when memory write fails, but owner is told
- [ ] Reindex/index failures are visible somehow (toast/banner/status)

---

## Already Solid (Do Not Redo)
- Guardrails depth
- Embedding space hygiene
- Hybrid file search
- Secrets stripped from state JSON
- Chat progress stages
- Research fail-closed when web is required
