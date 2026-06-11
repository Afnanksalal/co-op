# Agent Orchestration

Co-Op is a business operations harness, not a token-burning model debate product. The runtime uses one selected provider for the primary workflow and only adds a review pass when the configured risk policy requires it.

## Workflow Surface

The desktop runtime accepts these workflow types:

- `operations`
- `finance`
- `legal`
- `sales`
- `strategy`

Each workflow has a clear objective, a selected provider, a bounded token budget, a local audit entry, and a concrete result or error. Objectives are validated before execution so empty or oversized requests never reach a provider.

## Provider Routing

Supported provider modes:

- `ollama`: default local execution through `http://localhost:11434`.
- `openai_compatible`: customer-supplied API key and base URL for OpenAI-compatible chat completions.

Provider settings are stored by the desktop runtime. The cloud backend does not receive provider API keys, workflow prompts, or workflow outputs.

## Council Review Policy

Council mode is a review gate:

- `off`: run only the primary workflow.
- `review_only`: run one concise review pass after the primary workflow.
- `high_risk_only`: run the review pass only for inherently sensitive workflow types or risky objectives.

High-risk review currently applies to `finance`, `legal`, and `strategy`, plus operational or sales objectives involving contracts, compliance, payroll, payments, banking, investors, board decisions, acquisitions, terminations, security, or privacy.

This keeps cost and latency reasonable. Co-Op must not fan out the same prompt to several models by default.

## Runtime Contract

Every workflow run should:

- Check the local license state before work starts.
- Validate the workflow type and objective length.
- Load the configured provider policy.
- Build a business-focused system prompt with privacy and human-approval guidance.
- Run through the selected provider.
- Apply the council review gate only when policy requires it.
- Store the latest run history locally, including status, steps, output, error, and timestamps.

## Output Standard

Workflow output should be actionable business material:

- Decisions, assumptions, risks, and next actions should be explicit.
- Legal, finance, security, privacy, hiring, termination, payment, and compliance actions should be marked for human approval.
- Missing facts should be requested instead of invented.
- Sensitive business data should stay local unless the customer intentionally routes it to a configured external provider.

## Extending The Harness

Add a new workflow type only when it has distinct validation needs, prompt behavior, UI affordances, or audit semantics. Keep provider adapters behind the existing routing contract so the local app remains the execution boundary.
