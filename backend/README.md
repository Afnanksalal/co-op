# Co-Op Backend

This package is the NestJS cloud license control plane for Co-Op Desktop.

It does not run business workflows. Business plans, chat, files, research, customers, outreach, and tools run in the installed desktop app.

## Responsibilities

- Health checks.
- Supabase session verification.
- Admin license generation and listing.
- Customer self-service license lookup and generation.
- Desktop activation.
- Desktop heartbeat.
- Desktop deactivation.
- License event audit records.
- Existing Supabase user backfill.

## Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /api/v1/health` | Health check. |
| `GET /api/v1/licenses` | Admin license list. |
| `POST /api/v1/licenses` | Admin license creation. |
| `GET /api/v1/licenses/mine` | Signed-in user's licenses. |
| `POST /api/v1/licenses/self-service` | Signed-in user's activation key flow. |
| `POST /api/v1/licenses/activate` | Desktop activation. |
| `POST /api/v1/licenses/heartbeat` | Desktop entitlement refresh. |
| `POST /api/v1/licenses/deactivate` | Desktop deactivation. |

## Environment

Required:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. |
| `SUPABASE_URL` | Supabase project URL. |
| `SUPABASE_ANON_KEY` | Supabase anon key used for session verification. |

Required in production:

| Variable | Purpose |
| --- | --- |
| `LICENSE_KEY_PEPPER` | Strong secret for keyed license and activation-token hashes. |
| `CORS_ORIGINS` | Trusted web origins. |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | Set to `true` unless the provider requires a documented exception. |

Optional:

| Variable | Purpose |
| --- | --- |
| `SUPABASE_SERVICE_KEY` | One-off existing-user backfill only. |
| `LICENSE_OFFLINE_GRACE_DAYS` | Desktop offline grace window. |
| `THROTTLE_TTL` | Rate-limit window. |
| `THROTTLE_LIMIT` | Rate-limit request count. |
| `APP_URL` | Public web app URL for generated links and metadata. |

## Commands

```bash
npm install
npm run db:migrate
npm run dev
npm test
npm run build
npm audit --audit-level=low
```

The build runs `tsc` and `tsc-alias` so path aliases are rewritten before production start.

Production start:

```bash
npm run start:prod
```

## Existing User Backfill

If users already exist in Supabase before the license tables are deployed:

```bash
SUPABASE_SERVICE_KEY=... npm run licenses:backfill-users
```

The script creates one active solo license for each Supabase user without an active unexpired license and writes raw one-time activation keys to `license-backfill-*.csv`. Keep that CSV private and delete it after delivery or rotation.

## Security Rules

- Never log raw activation keys or activation tokens.
- Never expose `SUPABASE_SERVICE_KEY` to browsers, desktop clients, logs, or public issues.
- Store license and activation tokens only as keyed hashes.
- Keep CORS locked to trusted origins in production.
- Keep business workflow data out of the backend.
