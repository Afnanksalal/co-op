# Contributing

Co-Op is now a local-first desktop product with a cloud license plane. Keep contributions inside that product contract.

Read `AGENTS.md` before making product or architecture changes. It is the shared operating guide for human contributors and coding agents.

## Before Opening Changes

- Run backend tests and build from `Backend/`.
- Run frontend typecheck, web build, and Tauri export from `Frontend/`.
- Run Rust tests from `Frontend/src-tauri/`.
- Run `npm audit --audit-level=low` in both `Backend/` and `Frontend/`.
- Run `npm run audit:rust` from `Frontend/`.
- Run `cargo clippy --all-targets -- -D warnings` from `Frontend/src-tauri/`.

## Product Guardrails

- Do not reintroduce hosted chat/dashboard modules without a specific product decision.
- Do not add raw license-key storage.
- Do not make cloud services mandatory for local business workflows.
- Prefer explicit user-configured providers over hidden managed model calls.
- Keep desktop data local unless a user-facing setting says otherwise.
- Keep `docs/ARCHITECTURE.md`, `docs/LICENSING.md`, `docs/AGENT_ORCHESTRATION.md`, and `docs/OPERATIONS.md` current when their covered behavior changes.
