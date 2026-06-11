# Operations

This document defines the build, audit, and release checks for Co-Op.

## Local Development

Backend:

```bash
cd Backend
npm install
npm run dev
```

Frontend web app:

```bash
cd Frontend
npm install
npm run dev
```

Desktop app:

```bash
cd Frontend
npm run tauri:dev
```

## Verification

Backend:

```bash
cd Backend
npm test
npm run build
npm audit --audit-level=low
```

Frontend and desktop shell:

```bash
cd Frontend
npm run typecheck
npm run build
npm run build:tauri
npm audit --audit-level=low
npm run audit:rust
```

Rust runtime:

```bash
cd Frontend/src-tauri
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
- `NEXT_PUBLIC_CLOUD_URL`
- `NEXT_PUBLIC_APP_URL`

## Release Checklist

- Confirm backend tests, build, and npm audit pass.
- Confirm frontend typecheck, web build, Tauri export, npm audit, and Rust audit pass.
- Confirm Rust tests and clippy pass.
- Smoke test `/`, `/login`, `/download`, `/activate`, `/local`, and `/admin/licenses`.
- Verify production CORS origins before deployment.
- Verify `LICENSE_KEY_PEPPER` is set and not reused from development.
- Remove generated folders after local verification: `Backend/dist`, `Frontend/.next`, `Frontend/out`, and `Frontend/src-tauri/target`.

## Rust Audit Policy

Run `npm run audit:rust` from `Frontend/`. The script denies RustSec warnings and carries the explicit upstream Tauri/wry GTK3/glib/unic/proc-macro advisory allowlist currently required by the Tauri dependency graph. Revisit the allowlist on every Tauri upgrade and remove entries as soon as patched upstream releases are available.

## Incident Response

For a suspected license or entitlement incident:

- Rotate affected cloud credentials.
- Suspend or revoke affected licenses by status.
- Inspect `license_events` for activation, heartbeat, and deactivation history.
- Preserve backend logs without exposing raw secrets.
- Ship a desktop update only after Rust tests, clippy, and the full frontend build pass.
