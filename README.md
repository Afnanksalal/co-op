# Co-Op

Co-Op is local-first business management software with a cloud license control plane.

The product is intentionally split:

- `Frontend/` contains the public site, account/login screens, license admin UI, desktop activation UI, and Tauri desktop shell.
- `Frontend/src-tauri/` contains the local runtime that stores activation state, calls the cloud license backend, and runs business workflows through Ollama or an OpenAI-compatible bring-your-own-key endpoint.
- `Backend/` contains the cloud license backend for health checks, admin license generation, activation, heartbeat, and deactivation.

Removed legacy surfaces:

- Hosted startup dashboard
- Mobile app wrapper
- Separate Python vector service
- Old hosted document/chat modules

## Documentation

- `AGENTS.md` is the repo guide for humans and coding agents.
- `docs/ARCHITECTURE.md` explains the cloud license plane and local desktop data plane.
- `docs/LICENSING.md` documents license generation, activation, heartbeat, deactivation, and offline grace.
- `docs/AGENT_ORCHESTRATION.md` defines the local business workflow harness and council review policy.
- `docs/OPERATIONS.md` lists development, audit, and release checks.

## Product Model

Co-Op Desktop runs business work locally. The cloud backend is used for account identity, payment/license ownership, device entitlement, revocation, and heartbeat checks.

Model routing is local-first:

- Ollama for fully local execution
- OpenAI-compatible BYOK endpoint when a customer chooses an external provider
- Managed providers can be added later behind explicit policy and budget controls

## Development

Backend:

```bash
cd Backend
npm install
npm test
npm run build
npm audit --audit-level=low
```

Frontend:

```bash
cd Frontend
npm install
npm run typecheck
npm run build
npm run build:tauri
npm audit --audit-level=low
npm run audit:rust
```

Desktop runtime tests:

```bash
cd Frontend/src-tauri
cargo test
cargo clippy --all-targets -- -D warnings
```

## Required Cloud Environment

Backend production requires:

- `DATABASE_URL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED=true` unless your database provider requires a pinned exception
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LICENSE_KEY_PEPPER` with at least 32 characters
- `CORS_ORIGINS` restricted to trusted origins

Frontend requires:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_CLOUD_URL` for the desktop activation cloud base URL, or derive it from `NEXT_PUBLIC_API_URL`

## License

MIT
