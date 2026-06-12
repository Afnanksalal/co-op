# Operations

This document defines the build, audit, and release checks for Co-Op.

## Local Development

Backend:

```bash
cd backend
npm install
npm run dev
```

Frontend web app:

```bash
cd frontend
npm install
npm run dev
```

Desktop app:

```bash
cd frontend
npm run tauri:dev
```

## Verification

Backend:

```bash
cd backend
npm run db:migrate
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

## Required Production Environment

Backend:

- `DATABASE_URL`
- `DATABASE_SSL_REJECT_UNAUTHORIZED=true` unless the database provider requires a documented exception
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `LICENSE_KEY_PEPPER` with at least 32 characters
- `CORS_ORIGINS` restricted to trusted origins

Frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

Desktop build:

- `COOP_CLOUD_URL` may be set explicitly for desktop builds.
- If `COOP_CLOUD_URL` is not set, `frontend/src-tauri/build.rs` reads `NEXT_PUBLIC_API_URL` from the environment or `frontend/.env` and embeds its origin without `/api/v1`.
- Business users should never be asked for a backend URL during activation.

## Release Checklist

- Confirm backend tests, build, and npm audit pass.
- Confirm `npm run db:migrate` has completed against the target database before routing web traffic.
- Confirm frontend typecheck, web build, Tauri export, npm audit, and Rust audit pass.
- Confirm Rust tests and clippy pass.
- Smoke test `/`, `/login`, `/download`, `/activate`, `/desktop`, and `/admin/licenses`.
- Smoke test desktop first run: activate, complete three-step onboarding, open overview, and start one local work plan.
- Verify production CORS origins before deployment.
- Verify `LICENSE_KEY_PEPPER` is set and not reused from development.
- Remove generated folders after local verification: `backend/dist`, `frontend/.next`, `frontend/out`, `frontend/out-tauri`, and `frontend/src-tauri/target`.

## Rust Audit Policy

Run `npm run audit:rust` from `frontend/`. The script denies RustSec warnings and carries the explicit upstream Tauri/wry GTK3/glib/unic/proc-macro advisory allowlist currently required by the Tauri dependency graph. Revisit the allowlist on every Tauri upgrade and remove entries as soon as patched upstream releases are available.

## Incident Response

For a suspected license or entitlement incident:

- Rotate affected cloud credentials.
- Suspend or revoke affected licenses by status.
- Inspect `license_events` for activation, heartbeat, and deactivation history.
- Preserve backend logs without exposing raw secrets.
- Ship a desktop update only after Rust tests, clippy, and the full frontend build pass.

## Existing User Backfill

After migrating a production database for the first time, existing Supabase auth users can be aligned to the licensing model with:

```bash
cd backend
SUPABASE_SERVICE_KEY=... npm run licenses:backfill-users
```

The script skips users that already have an active unexpired license and exports newly generated one-time raw activation keys to `license-backfill-*.csv`. Treat that CSV as a secret distribution artifact and delete it after the keys are delivered or rotated.
