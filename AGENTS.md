# Co-Op Agent Guide

This guide is for humans and automated coding agents working in this repository. Treat it as the repo-level operating contract.

## Product Contract

Co-Op is local-first business management software with a cloud license control plane.

- The cloud backend owns account identity, license generation, activation, heartbeat, revocation, and payment entitlement hooks.
- The installed desktop app owns business workflow execution, provider configuration, local run history, and local company data.
- Cloud services must not become mandatory for business workflows.
- Customer model usage must be explicit: Ollama for local execution or an OpenAI-compatible bring-your-own-key endpoint selected by the customer.
- Council-style review is a gated review mode, not the default execution strategy.
- Raw license keys, activation tokens, provider keys, workflow prompts, and customer outputs must not be logged.

## Workspace Map

- `backend/` is the NestJS license control plane.
- `backend/src/modules/licenses/` contains activation, heartbeat, deactivation, and admin license generation.
- `backend/src/database/schema/licenses.schema.ts` is the source of truth for the cloud license schema.
- `frontend/` is the Next.js public site, account UI, admin license UI, and desktop UI shell.
- `frontend/src-tauri/` is the Rust Tauri runtime that stores local activation state, model routing settings, and workflow run history.
- `docs/` contains durable architecture, licensing, orchestration, and operations references.

## Required Checks

Run the narrowest relevant checks while iterating. Before shipping product changes, run the full suite:

```bash
cd backend
npm test
npm run build
npm audit --audit-level=low

cd ../frontend
npm run typecheck
npm run build
npm run build:tauri
npm audit --audit-level=low
npm run audit:rust

cd src-tauri
cargo test
cargo clippy --all-targets -- -D warnings
```

## Engineering Rules

- Keep generated output out of the repo workspace after verification: `backend/dist`, `frontend/.next`, `frontend/out`, `frontend/out-tauri`, and `frontend/src-tauri/target`.
- Prefer existing patterns and small, typed modules over broad rewrites.
- Keep files maintainable by default: split new frontend screens before they exceed 300 lines, split shared frontend modules before 450 lines, and split Rust/backend domain modules before 600 lines unless a documented exception is added.
- Keep frontend desktop shells thin. Page orchestration belongs in `frontend/src/components/desktop/panels/`, shared primitives in `frontend/src/components/desktop/shared.tsx`, owner-facing markdown rendering in `frontend/src/components/desktop/markdown.tsx`, and large feature surfaces in feature folders such as `frontend/src/components/desktop/tools/`.
- Keep the desktop runtime client contract split by responsibility: command wrappers in `frontend/src/lib/desktop/runtime/commands.ts`, DTOs in `frontend/src/lib/desktop/runtime/types.ts`, and browser preview fallback data in `frontend/src/lib/desktop/runtime/preview-state.ts`.
- Keep Tauri DTOs in `frontend/src-tauri/src/types/` and re-export them through `frontend/src-tauri/src/types.rs`; do not rebuild a thousand-line DTO dump.
- Keep storage internals modular. Schema/opening/migration helpers for the local knowledge store live under `frontend/src-tauri/src/knowledge_store/`; tests should live beside the module they exercise instead of bloating production files.
- Keep DTOs, API clients, and Rust command payloads aligned when changing contracts.
- Add tests when changing license crypto, entitlement logic, provider routing, workflow validation, local state persistence, or security-sensitive behavior.
- Do not reintroduce the removed mobile wrapper, hosted startup dashboard, separate vector service, or hosted document/chat modules without a recorded product decision.
- Do not add demo-only dead ends, inactive buttons, fake success paths, or incomplete provider paths to production screens.

## Documentation Rules

- Update `docs/ARCHITECTURE.md` when data boundaries, runtime responsibilities, or deployment topology change.
- Update `docs/LICENSING.md` when activation, heartbeat, revocation, grace periods, or payment entitlement behavior changes.
- Update `docs/AGENT_ORCHESTRATION.md` when workflow types, model routing, prompt contracts, or review gates change.
- Update `docs/OPERATIONS.md` when build, audit, release, or incident procedures change.
- Update `docs/PRODUCT_POSITIONING.md` when onboarding, owner-facing language, market positioning, or product pillars change.
