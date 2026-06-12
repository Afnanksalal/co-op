# Contributing

Co-Op is local-first desktop software with a narrow cloud license service. Contributions should improve that product, preserve the privacy boundary, and keep the codebase maintainable for open-source readers.

Read `AGENTS.md` before changing product behavior, architecture, licensing, provider routing, local storage, or release tooling.

## Development Workflow

1. Create a focused branch.
2. Install dependencies in the package you are changing.
3. Make the smallest coherent change.
4. Add or update tests for behavior, validation, persistence, security-sensitive logic, and provider contracts.
5. Update the relevant documentation before opening a pull request.
6. Run the narrow checks while iterating and the full release checks before shipping.

## Product Guardrails

- The installed desktop app owns business workflows, provider setup, local files, local run history, and company data.
- The cloud backend owns account identity, licenses, activation, heartbeat, revocation, and payment entitlement hooks.
- Do not make cloud services mandatory for local business workflows.
- Do not store raw license keys, activation tokens, provider keys, prompts, files, or customer outputs in logs or cloud tables.
- Do not add demo-only buttons, fake success states, inactive screens, or placeholder provider paths.
- Do not reintroduce a hosted workflow dashboard, mobile wrapper, separate mandatory vector service, or hosted document/chat modules without a documented product decision.

## Code Quality

- Prefer existing patterns over new abstractions.
- Keep DTOs, API clients, and Rust command payloads aligned when changing contracts.
- Split large files before they become hard to review.
- Keep frontend owner-facing wording plain and practical.
- Keep internal terms such as RAG, vectors, graph, LLM council, and model routing out of normal business-owner UI.
- Keep generated output, local logs, and temporary Codex/dev artifacts out of commits.

## Documentation Requirements

Update the matching docs when behavior changes:

| Change area | Required docs |
| --- | --- |
| Runtime boundaries, deployment topology, hosted route behavior | `docs/ARCHITECTURE.md` |
| Activation, heartbeat, revocation, grace, backfill, payment entitlement | `docs/LICENSING.md` |
| Advisor behavior, work types, provider routing, review gates | `docs/AGENT_ORCHESTRATION.md` |
| Local files, search, memory, storage, optional self-host data plane | `docs/DATA_PLANE.md` |
| Build, audit, release, cleanup, incident response | `docs/OPERATIONS.md` |
| Owner-facing language, onboarding, positioning, product surface | `docs/PRODUCT_POSITIONING.md` |
| Modularization, maintainability, file-size exceptions | `docs/CODEBASE_AUDIT.md` |

Use Mermaid for architecture, sequence, and workflow diagrams.

## Required Checks

Backend:

```bash
cd backend
npm test
npm run build
npm audit --audit-level=low
```

Frontend and desktop shell:

```bash
cd frontend
npm run typecheck
npm run build
npm run build:tauri
npm audit --audit-level=low
npm run audit:rust
```

Rust runtime:

```bash
cd frontend/src-tauri
cargo test
cargo clippy --all-targets -- -D warnings
```

Desktop release installer:

```bash
cd frontend
npm run tauri:build
```

## Pull Request Checklist

- The change stays inside the local-first product contract.
- Security-sensitive values are not logged or serialized.
- User-facing wording is business-owner friendly.
- New screens have no dead ends or placeholder controls.
- Relevant docs are updated.
- Relevant tests and builds pass.
- Generated folders and local logs are removed before commit unless a release artifact is intentionally being delivered outside source control.

## Security Reports

Do not open public issues for vulnerabilities. Email `contact@co-op.software` with a clear reproduction path and affected area.
