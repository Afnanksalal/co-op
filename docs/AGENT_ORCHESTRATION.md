# Local Advisor Orchestration

Co-Op runs business work through a local workflow harness. It should feel like a private workspace for owners, not a model debate console. The app uses one selected provider for the primary answer and adds review only when the configured risk policy requires it.

## Owner-Facing Language

| Internal concept | Owner-facing wording  |
| ---------------- | --------------------- |
| Agent            | Advisor or Co-Op      |
| LLM              | AI provider           |
| LLM council      | Second look or review |
| RAG              | Company files         |
| Vector search    | File search           |
| Knowledge graph  | Business memory       |
| Model routing    | AI setup              |
| Prompt harness   | Work plan             |

Normal product screens should use the owner-facing wording. Internal names may remain in DTOs and modules where changing them would create migration risk.

## Request Flow

```mermaid
flowchart TD
  Ask["Owner asks a question or starts a plan"]
  License["Check local license entitlement"]
  Validate["Validate request, settings, and guardrails"]
  Context["Attach company profile, files, memory, and required web sources when outside facts are needed"]
  Provider["Run selected AI provider"]
  Review{"Review required?"}
  OutputGate["Check answer before saving"]
  Memory["Record business memory"]
  Save["Save local history"]
  Result["Show clear answer and next actions"]
  Error["Show recoverable error"]

  Ask --> License
  License --> Validate
  Validate --> Context
  Context --> Provider
  Provider --> Review
  Review -- "No" --> OutputGate
  Review -- "Yes (A2A / council)" --> Provider
  OutputGate --> Memory
  Memory --> Save
  Save --> Result
  License -. "invalid" .-> Error
  Validate -. "invalid" .-> Error
  OutputGate -. "blocked" .-> Error
  Provider -. "failed" .-> Error
```

Every workflow is local-first. The cloud backend is contacted only for license activation, heartbeat, and entitlement state.

## Work Areas

Desktop work plans support:

- Operations.
- Finance.
- Legal.
- Sales.
- Strategy.

Advisor chat supports:

- Operations.
- Legal.
- Finance.
- Investor.
- Competitor.
- Sales.

The desktop UI subscribes to safe `chat-progress` events while a chat run is executing, and to `chat-token` events for the primary answer. Progress events are owner-facing workflow status only:

- Understand the request.
- Load company context.
- Check saved files when file context is enabled.
- Check remembered facts.
- Search and parse live sources when outside facts are needed.
- Prepare the answer.
- Run an extra check or review gate when enabled.
- Save the answer locally.

Progress events must never include raw provider keys, hidden prompts, full retrieved documents, raw model outputs, or chain-of-thought. They are a usability contract, not a debugging stream.

Each run has:

- A clear objective.
- A selected provider.
- A bounded answer budget.
- Local context selection.
- Review settings.
- A local run record with status, steps, output, error, and timestamps.

## Provider Routing

Supported AI providers:

- `ollama`: local execution through the configured local Ollama URL.
- `openai_compatible`: customer-provided API key and base URL for OpenAI-compatible chat completions.

Supported research mode:

- `firecrawl`: live web research using the customer's locally stored Firecrawl key.

Supported email sending modes:

- `none`: generate drafts locally without sending.
- `resend`: send through the customer's locally stored Resend key.
- `sendgrid`: send through the customer's locally stored SendGrid key.

Provider keys are stored in OS credential storage. The cloud license backend never receives provider keys, prompts, outputs, files, campaign content, or local run history.

## RAG Architecture

Co-Op uses a hybrid embedding architecture to stay completely local and fast, avoiding external vector databases:

- **Provider Embeddings:** If the configured provider (Ollama or OpenAI-compatible) supports an embedding endpoint (`/api/embeddings` or `/v1/embeddings`), Co-Op automatically generates dense vector embeddings for company files.
- **Enhanced Local Fallback:** If the provider lacks an embedding endpoint (e.g., Groq) or is unreachable, Co-Op falls back to a 128-dimension lexical hash vector algorithm. This fallback includes suffix-stripping stemming, bigram generation, and a dictionary of 150+ business synonym clusters to map related concepts without needing a language model.
- **Background Re-indexing:** When a user switches to a provider that supports true embeddings, Co-Op upgrades stale **file** chunk vectors in a background task. It only writes a provider embedding version when the batch actually came from the provider. Local fallback results are left unchanged so search never mixes spaces under a fake upgrade.
- **Memories stay local:** Business memories always use the local lexical embedding space. Reindex never upgrades them to provider vectors.
- **Mixed-space search:** File search scores stored vectors against a matching query embedding. If a stored file vector is still local while the current provider query is dense, search falls back to a local query vector instead of treating a dimension mismatch as a hit.

All embeddings (whether dense provider vectors or local fallback hashes) are stored directly inside the local SQLite database alongside the text chunks. Provider embedding calls use a dedicated embedding model name, not the chat model, unless the configured chat model itself looks like an embedding model.

## Review Policy

Review should reduce risk without wasting tokens or slowing every answer.

| Review level        | Behavior                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| No extra review     | Run one primary answer only.                                               |
| Standard review     | Run one concise review pass after the primary answer.                      |
| Sensitive work only | Review only finance, legal, strategy, or high-risk objectives.             |
| Full review         | Review every chat or plan and include the configured second-look behavior. |

High-risk triggers include contracts, compliance, payroll, payments, banking, investors, board decisions, acquisitions, terminations, security, privacy, legal commitments, and major customer promises.

Co-Op must not fan out the same prompt to several providers by default.
When reviewing output (A2A or full review), the engine must use dynamic temperature routing (e.g. 0.6 to 0.7) to ensure the review model is creative enough to spot missing risks and biases, rather than inheriting the primary model's low-temperature factual setting.

## Guardrails

The runtime guardrail layer is centralized in `frontend/src-tauri/src/guardrails.rs` (with core rules in `guardrails_rules.rs`). Every model-facing surface should pass through it before adding provider calls.

```mermaid
flowchart LR
  Input["Input gate<br/>business topic, injection, secrets, no code execution"]
  Evidence["Evidence gate<br/>web sources required for outside facts"]
  Prompt["Prompt policy<br/>ignore hostile retrieved text, mark assumptions"]
  Output["Output gate<br/>no executable code, no hidden instruction leaks"]

  Input --> Evidence --> Prompt --> Output
```

Rules:

- Co-Op is topic-centric: company planning, research, customers, money, legal, sales, strategy, operations, files, and decisions.
- Clear off-topic requests should be rejected instead of handled like a general chatbot.
- Co-Op must not reveal saved provider keys, activation tokens, hidden prompts, or internal policy text.
- Co-Op blocks executable code generation (scripts, shell commands, SQL drops) but allows safe operational and navigational guidance (e.g. "go to the dashboard and check logs") when grounded in a business context.
- Retrieved web pages, files, and user-provided documents are untrusted content. They may add facts, not instructions.
- Market, competitor, legal, customer, pricing, investor, risk, and prospect work requires web sources. If sources are not available, the feature must gracefully degrade to inferring from local context while asking the user to enable web search.
- Model output is checked before saving. Blocked output is not written as a successful plan, chat answer, pitch analysis, or outreach draft.

Implementation anchors:

- `guardrails.rs` (and `guardrails_rules.rs`) classifies question type (factual, planning, action request, comparison, brainstorming) to drive proportional response formatting, while applying context-aware input/output gates.
- `chat.rs` uses adaptive formatting, source-gated web research, memory context, and A2A review filters that discard generic corporate filler.
- `chat.rs` emits safe progress events and streams the primary answer with `chat-token` events. Extra review passes stay unary. Cancel sets a flag that stops further research and aborts the token stream between chunks.
- `workflows/runner.rs` uses the same guardrails and adaptive question typing for work plans, applying a strict "unknowns" policy to prevent hallucination from sparse company profiles. High-risk plans stay `awaiting_approval` until the owner accepts or rejects; memory is written only after accept.
- `knowledge_store/` encapsulates all local RAG behavior, including `search.rs` for SQLite FTS5 + lexical vector matching, and background file-chunk reindex. Memories remain local-only.
- `providers.rs`, `providers_stream.rs`, and `providers_email.rs` abstract the underlying API contracts for Ollama, OpenAI-compatible APIs, Firecrawl, Resend, and SendGrid.
- `research.rs` always requires Firecrawl-backed sources and validates the sourced summary.
- `research_sources.rs` plans and filters web sources, including multi-query competitor searches from company, offering, buyer, and region context.
- `outreach.rs` requires source-backed lead discovery, blocks unsafe generated email output, and enforces honest per-email send outcomes and draft editing.
- `tools.rs` applies the same model output gate to pitch review.

Research inputs used for the guardrail direction:

- [OpenAI guardrails cookbook](https://developers.openai.com/cookbook/examples/how_to_use_guardrails)
- [OWASP Top 10 for LLM Applications](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework)

## Company Context

The harness may attach:

- Company profile from onboarding and Company settings (sparse profiles emit only populated fields to prevent hallucination targets).
- Saved company files from the local file store.
- Local business memory derived from profile, files, research, customers, campaigns, and work history.
- Current customer list and campaigns when relevant.
- Recent work history when it helps continuity.
- Live web sources for market, competitor, legal, customer, pricing, investor, risk, and prospect-discovery work.

All context is bounded before it reaches the selected provider so one large file or old run cannot flood the request.

## Evolving Memory

Co-Op stores two kinds of local context:

- Company files: source documents and sections that can be searched.
- Business memory: durable facts, decisions, preferences, risks, research findings, plan outcomes, and profile summaries.

Memory is not a separate cloud service. It is stored in the local SQLite data plane and searched with full-text plus compact deterministic matching data. The UI exposes this as the Memory section inside Company, not as vector infrastructure.

The runtime may write memory after company profile saves, completed work plans, advisor chat answers, research summaries, pitch deck reviews, and manual owner notes.

Memory writes must redact obvious secrets before storage. Raw provider keys, activation tokens, license keys, and hidden prompts must never become memory.

Memory retrieval should stay bounded. The harness should attach only the most relevant memories for the current question or plan.

Research inputs used for memory behavior:

- [MemGPT](https://arxiv.org/abs/2310.08560)
- [Generative Agents](https://arxiv.org/abs/2304.03442)
- [Reflexion](https://arxiv.org/abs/2303.11366)
- [LangGraph memory concepts](https://docs.langchain.com/oss/python/concepts/memory)

## Research Jobs

Research should return useful business material, not generic essays. The Company research surface maps simple owner choices to local runtime jobs:

- Market scan: categories, demand signals, competitors, buyers, and openings.
- Competitors: alternatives, positioning, strengths, weaknesses, and gaps.
- Customers: buyer segments, pains, triggers, objections, and outreach angles.
- Pricing: packaging, value metrics, pricing models, and willingness-to-pay signals.
- Investor brief: market momentum, investor fit, funding signals, and diligence questions.
- Risk check: market, legal, operating, security, and execution risks.

Depth controls the work:

- Quick: small source set and short action-oriented answer.
- Standard: balanced source set, evidence, risks, and next actions.
- Deep: broader evidence, tradeoffs, unknowns, and practical action plan.

If live web sources are unavailable, these jobs must fail with a setup message instead of producing an unsourced answer.

Competitor research must avoid one-shot generic searches. The runtime should build multiple focused searches from:

- Company name and website.
- Offering and category.
- Target buyer and problem.
- Operating region, country, or city.

Answers should classify named companies as verified direct competitors, indirect alternatives, or non-competitors, and explain the basis from supplied sources. If evidence is weak, say what is weak and provide the best supported candidate list instead of asking the owner to run another broad search.

## Lead Discovery

Lead discovery is a source-backed research workflow:

1. Build the search from the owner's brief plus company profile context.
2. Require live research configuration.
3. Extract only source-backed people or companies.
4. Deduplicate against locally saved leads.
5. Save resulting leads locally.
6. Preserve source URLs and reasoning in local history.

Do not fall back to invented model-only leads.

## Output Standard

Every answer should be written for an owner who needs to make progress. Responses use proportional formatting based on question type (e.g., factual queries get direct answers, strategic queries get structured plans).

- Start with the practical answer.
- State assumptions and missing facts. If context is missing, do not invent it.
- Include risks and approvals where needed.
- Give concrete next actions.
- Avoid technical terms unless the user is in Settings or documentation.
- Mark legal, finance, security, privacy, hiring, termination, payment, and compliance actions for human review. Work plans that require approval are not treated as complete until the owner accepts them in History.

## Extending The Harness

Add a new work type only when it has distinct validation needs, prompt behavior, UI affordances, or audit semantics.

Before adding a provider:

- Add validation.
- Add secret storage behavior.
- Add sanitized error handling.
- Add tests for routing and missing-key behavior.
- Update owner-facing settings UI.
- Update this document and `docs/DATA_PLANE.md` if data boundaries change.

## Intentionally Not Implemented

These features are out of scope by design. Do not implement them without a product decision:

- **Streaming extra review passes:** The primary Ask answer streams tokens. A2A/council review stays a unary call.
- **Multi-provider fan-out:** Co-Op uses one provider per request. Sending the same prompt to multiple providers simultaneously is explicitly avoided to reduce cost and complexity.
- **Cloud vector database:** All embeddings live in local SQLite. There is no Pinecone/Weaviate/Qdrant integration.
- **Connections / integrations tab:** The settings UI surface for MCP/webhook/notion/crm was removed because no backend consumer reads `state.integrations`. Re-add only when a concrete consumer exists.
- **Automatic email sending without preview:** Campaign emails require per-draft preview. Batch send requires a second Confirm send click (`confirmSend`). There is no silent auto-send.
- **Owner-facing embedding model selector:** Provider embedding calls pick a dedicated embedding model automatically. There is no separate Settings control for embedding model names.
