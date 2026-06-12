# Operations

This document covers local development, deployment, release builds, cleanup, and incident response for Co-Op.

## Local Development

Backend:

```bash
cd backend
npm install
npm run db:migrate
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

## Environment

Backend production:

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection string. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Yes | Use `true` unless the provider requires a documented exception. |
| `SUPABASE_URL` | Yes | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Yes | Used to verify browser and account sessions. |
| `LICENSE_KEY_PEPPER` | Yes | At least 32 characters; keep private. |
| `CORS_ORIGINS` | Yes | Comma-separated trusted origins. |
| `LICENSE_OFFLINE_GRACE_DAYS` | No | Defaults to the configured backend value. |
| `THROTTLE_TTL` | No | Rate-limit window. |
| `THROTTLE_LIMIT` | No | Rate-limit request count. |
| `APP_URL` | No | Public app URL for links and metadata. |
| `SUPABASE_SERVICE_KEY` | Only for backfill | Never expose to browser or desktop clients. |

Frontend production:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase browser URL. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase browser anon key. |
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL, normally ending in `/api/v1`. |
| `NEXT_PUBLIC_APP_URL` | Yes | Hosted app URL for metadata and canonical links. |
| `COOP_CLOUD_URL` | Desktop releases | Optional explicit cloud origin baked into the desktop binary. |

`frontend/src-tauri/build.rs` embeds `COOP_CLOUD_URL` when set. If it is not set, it reads `NEXT_PUBLIC_API_URL` and strips `/api/v1` before embedding the origin. Business users should never be asked for a backend URL during activation.

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

Desktop installer:

```bash
cd frontend
npm run tauri:build
```

## Release Checklist

1. Confirm no transient local logs remain:

   ```bash
   rg --files -g "*.log" -g "*.err.log" -g "*.tsbuildinfo"
   ```

2. Confirm backend tests, build, and audit pass.
3. Confirm frontend typecheck, hosted build, Tauri export, npm audit, and Rust audit pass.
4. Confirm Rust tests and clippy pass.
5. Build desktop installers with `npm run tauri:build` when delivering software.
6. Smoke test hosted web routes: `/`, `/login`, `/signup`, `/account`, `/download`, `/privacy`, `/terms`, `/security`, `/cookies`, and `/admin/licenses`.
7. Confirm hosted production `/desktop` and `/local` return 404.
8. Smoke test desktop first run: activate with a key, complete onboarding, open Today, ask a question, run a plan, add a file, and refresh license heartbeat.
9. Smoke test account key management: generate a key, copy it while visible, delete it, confirm it disappears from the account table, and confirm a fresh key can be generated.
10. Confirm production CORS origins are restricted.
11. Confirm `LICENSE_KEY_PEPPER` is strong and not reused from development.
12. Clean generated folders that should not be committed.

## Cleanup

Generated folders and local run artifacts should not be committed:

```powershell
Remove-Item -Recurse -Force backend/dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend/.next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend/out -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force frontend/out-tauri -ErrorAction SilentlyContinue
Remove-Item -Force frontend/*.log, frontend/*.err.log, frontend/*.tsbuildinfo -ErrorAction SilentlyContinue
```

Keep `frontend/src-tauri/target/release/bundle/` only when you are intentionally delivering release installers locally. Do not commit generated binaries unless a maintainer explicitly asks for versioned release artifacts.

## Backend Deployment

1. Set production environment variables.
2. Run `npm run db:migrate` against the production database.
3. Deploy the backend container or Node service.
4. Verify `GET /api/v1/health`.
5. Verify CORS from the hosted web origin.
6. Verify admin license listing with an admin Supabase user.
7. Verify activation and heartbeat from a desktop build pointed at the production backend.

For Render-style deployments, the Docker build runs `npm run build` and starts `node dist/main.js`. Path aliases are rewritten by `tsc-alias` as part of the backend build script.

## Frontend Deployment

1. Set public Supabase and backend API variables.
2. Run `npm run build`.
3. Deploy the Next.js app.
4. Confirm `/desktop` and `/local` are blocked in production hosted mode.
5. Confirm metadata, `robots.txt`, sitemap, `llms.txt`, legal pages, login, account center, and download flow render correctly.

## Desktop Release

1. Set `COOP_CLOUD_URL` to the deployed cloud origin, or set `NEXT_PUBLIC_API_URL` to the deployed API URL.
2. Run:

   ```bash
   cd frontend
   npm run build:tauri
   npm run tauri:build
   ```

3. Install the generated build on a clean machine or VM.
4. Activate with a test license key.
5. Verify only the activation key is requested.
6. Verify heartbeat, onboarding, settings save, chat, plan, file import/search, research, customers, tools, and license refresh.

## Existing User Backfill

After migrating a production database for the first time, align existing Supabase users to the licensing model:

```bash
cd backend
SUPABASE_SERVICE_KEY=... npm run licenses:backfill-users
```

The script skips users that already have an active unexpired license and exports newly generated one-time raw activation keys to `license-backfill-*.csv`. Treat that CSV as a secret. Delete it after the keys are delivered or rotated.

## Rust Audit Policy

Run `npm run audit:rust` from `frontend/`. The script denies RustSec warnings and carries an explicit upstream Tauri/wry GTK3/glib/unic/proc-macro advisory allowlist where patched upstream releases are not yet available. Revisit the allowlist on every Tauri upgrade and remove entries as soon as patched releases exist.

## Incident Response

For a suspected license, entitlement, or secret incident:

1. Rotate affected cloud credentials.
2. Revoke or suspend affected licenses.
3. Inspect `license_events` for activation, heartbeat, and deactivation history.
4. Preserve backend logs without exposing raw secrets.
5. Audit recent commits for accidentally committed logs, generated output, or secrets.
6. Ship a desktop update only after backend, frontend, and Rust checks pass.
7. Communicate remediation through `contact@co-op.software` when external reporters are involved.
