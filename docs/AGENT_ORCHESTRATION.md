# Local Advisor Orchestration

Co-Op runs business work through a local workflow harness. It should feel like a private workspace for owners, not a model debate console. The app uses one selected provider for the primary answer and adds review only when the configured risk policy requires it.

## Owner-Facing Language

| Internal concept | Owner-facing wording  |
| ---------------- | --------------------- |
| Agent            | Advisor or Co-Op      |
| LLM              | AI provider           |
| LLM council      | Second look or review |
| RAG              | Company files         |
| Vector search    | File search            |
| Knowledge graph  | Business memory       |
| Model routing    | AI setup               |
| Prompt harness   | Work plan               |

Normal product screens should use the owner-facing wording. Internal names may remain in DTOs and modules where changing them would create migration risk.

## Request Flow

```mermaid
flowchart TD
  Ask["Owner asks a question or starts a plan"]
  License["Check local license entitlement"]
  Validate["Validate request, settings, and guardrails"]
  Context["Attach company profile, files, memory, and required web sources when outside facts are needed"]
  Provider["Run selected AI provider"]
  OutputGate["Check answer before saving"]
  Review{"Review required?"}
  Save["Save local history"]
  Result["Show clear answer and next actions"]
  Error["Show recoverable error"]

  Ask --> License
  License --> Validate
  Validate --> Context
  Context --> Provider
  Provider --> OutputGate
  OutputGate --> Review
  Review -- "No" --> Save
  Review -- "Yes" --> Provider
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

The desktop UI subscribes to safe `chat-progress` events while a chat run is executing. These events are owner-facing workflow status only:

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

Co-Op uses a hybrid embedding architecture to stay completely local and fast, avoiding external vector databases. **Company files and business memories use two different retrieval paths — they are not treated the same way.**

**Company files (dense embeddings, provider-dependent):**

- **Provider Embeddings:** If the configured provider (Ollama or OpenAI-compatible) supports an embedding endpoint (`/api/embeddings` or `/v1/embeddings`), Co-Op automatically generates dense vector embeddings for company files.
- **Enhanced Local Fallback:** If the provider lacks an embedding endpoint (e.g., Groq) or is unreachable, Co-Op falls back to a 128-dimension lexical hash vector algorithm for files. This fallback includes suffix-stripping stemming, bigram generation, and a dictionary of 150+ business synonym clusters to map related concepts without needing a language model.
- **Background Re-indexing:** When a user switches to a provider that supports true embeddings, Co-Op automatically upgrades any legacy hash-based file vectors to dense semantic vectors in a background task on the next app startup.

**Business memory (local lexical only, no provider embeddings):**

- Business memory does **not** use provider-generated dense embeddings, regardless of which AI provider is configured.
- Memory is retrieved with full-text search plus the same deterministic lexical hash/synonym matching described above. This keeps memory retrieval fast, provider-independent, and consistent even when the active provider changes.
- Do not assume memory participates in the "Background Re-indexing" upgrade path above — that path applies to company files only.

All embeddings and lexical vectors (for files) and lexical match data (for memory) are stored directly inside the local SQLite database alongside the text chunks.

## Review Policy

Review should reduce risk without wasting tokens or slowing every answer. **Review is a model self-check/second-look step, not human approval.** No review level in this table causes a human to approve or sign off on an answer before it is shown or saved — see "What Review Is Not" below.

| Review level        | Behavior                                                                   |
| ------------------- | -------------------------------------------------------------------------- |
| No extra review     | Run one primary answer only.                                               |
| Standard review     | Run one concise review pass after the primary answer.                      |
| Sensitive work only | Review only finance, legal, strategy, or high-risk objectives.             |
| Full review         | Review every chat or plan and include the configured second-look behavior. |

High-risk triggers include contracts, compliance, payroll, payments, banking, investors, board decisions, acquisitions, terminations, security, privacy, legal commitments, and major customer promises.

Co-Op must not fan out the same prompt to several providers by default.
When reviewing output (A2A or full review), the engine must use dynamic temperature routing (e.g. 0.6 to 0.7) to ensure the review model is creative enough to spot missing risks and biases, rather than inheriting the primary model's low-temperature factual setting.

### What Review Is Not

- Review is an automated second model pass (or the same model at a different temperature), not a human-in-the-loop approval gate.
- High-risk topics are **flagged for human review** in the output (see Output Standard), but the run still completes and saves without waiting for a human to click "approve."
- Any UI element that has previously implied a human "approval" state should be read as: *the answer was internally reviewed and/or flagged for the owner to check* — not that a human approved it before it reached the owner.
- This distinction is being reconciled with the UI badge tracked in issue #11. Until that lands, treat any "Needs approval"-style label in the running app as describing an unresolved flag for the owner's attention, not a blocked/pending human sign-off step.

## Guardrails

The runtime guardrail layer is centralized in `frontend/src-tauri/src/guardrails.rs`. Every model-facing surface should pass through it before adding provider calls.

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

- `guardrails.rs` classifies question type (factual, planning, action request, comparison, brainstorming) to drive proportional response formatting, while applying context-aware input/output gates.
- `chat.rs` uses adaptive formatting, source-gated web research, memory context, and A2A review filters that discard generic corporate filler.
- `chat.rs` emits safe progress events so the UI can show what stage is running without exposing hidden reasoning.
- `workflows.rs` uses the same guardrails and adaptive question typing for work plans, applying a strict "unknowns" policy to prevent hallucination from sparse company profiles.
- `research.rs` always requires Firecrawl-backed sources and validates the sourced summary.
- `research_sources.rs` plans and filters web sources, including multi-query competitor searches from company, offering, buyer, and region context.
- `outreach.rs` requires source-backed lead discovery and blocks unsafe generated email output.
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

- Company files: source documents and sections that can be searched, and which may use dense provider embeddings (see RAG Architecture above).
- Business memory: durable facts, decisions, preferences, risks, research findings, plan outcomes, and profile summaries — retrieved with local lexical/full-text matching only, never dense provider embeddings (see RAG Architecture above).

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
- Mark legal, finance, security, privacy, hiring, termination, payment, and compliance actions for human review.

"Mark ... for human review" means the output is flagged/labeled so the owner knows to check it themselves — it does not mean Co-Op blocks the answer pending a human's sign-off. See "What Review Is Not" under Review Policy.

## What's Intentionally Not Implemented

This section exists so future agents and PRs don't rebuild things that were deliberately left out. If a feature below sounds missing, it is missing on purpose — open a discussion before adding it.

- **No external/cloud vector database.** All embeddings and lexical vectors live in local SQLite. Do not introduce Pinecone, Weaviate, pgvector-over-network, or similar.
- **No dense provider embeddings for business memory.** Memory is local lexical/full-text only, even when the active provider supports an embedding endpoint. Only company files use provider embeddings. Do not "upgrade" memory to dense embeddings as a quick win — this needs a deliberate design decision, not an incidental change.
- **No multi-provider fan-out by default.** Co-Op does not send the same prompt to several providers to compare answers. The "review" pass is a second call to the same configured provider (or the same model at a different temperature), not a council of models.
- **No blocking human-approval gate.** Nothing in the current runtime pauses a run and waits for a human to click "approve" before saving or showing an answer. High-risk output is flagged for human review, not held for human sign-off. (Related: issue #11 tracks a UI badge that currently implies approval semantics that don't exist yet — don't build backend approval-gate logic to match the badge; fix the badge to match the actual behavior, or track approval-gating as a separate, explicitly-scoped feature.)
- **No hidden chain-of-thought or raw model output in progress events.** `chat-progress` events are a fixed, safe vocabulary of stage names — not a debugging or reasoning stream. Do not add raw model output, retrieved document text, or reasoning traces to these events.
- **No unsourced research output.** If Firecrawl/web sources are unavailable, research jobs fail with a setup message rather than silently falling back to a model-only guess.
- **No invented leads.** Lead discovery only saves source-backed people/companies; there is no model-only lead generation fallback.

## Extending The Harness

Add a new work type only when it has distinct validation needs, prompt behavior, UI affordances, or audit semantics.

Before adding a provider:

- Add validation.
- Add secret storage behavior.
- Add sanitized error handling.
- Add tests for routing and missing-key behavior.
- Update owner-facing settings UI.
- Update this document and `docs/DATA_PLANE.md` if data boundaries change.
