# Co-Op Backend

NestJS cloud license backend for Co-Op Desktop.

## Responsibilities

- `GET /api/v1/health`
- `GET /api/v1/licenses` for admins
- `POST /api/v1/licenses` for admins
- `POST /api/v1/licenses/activate`
- `POST /api/v1/licenses/heartbeat`
- `POST /api/v1/licenses/deactivate`

The backend does not run business AI workflows. Those run locally in the desktop app.

## Environment

Required:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Required in production:

- `LICENSE_KEY_PEPPER`
- `CORS_ORIGINS`

Optional:

- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `SUPABASE_SERVICE_KEY` for one-off Supabase user backfills
- `LICENSE_OFFLINE_GRACE_DAYS`
- `THROTTLE_TTL`
- `THROTTLE_LIMIT`
- `CORS_ORIGINS`
- `APP_URL`

## Commands

```bash
npm install
npm run db:migrate
npm test
npm run build
npm audit --audit-level=low
```

## Existing User Backfill

If users already exist in Supabase before the license tables are deployed, run:

```bash
SUPABASE_SERVICE_KEY=... npm run licenses:backfill-users
```

The script creates one active solo license for each Supabase user without an active license and writes the raw one-time activation keys to `license-backfill-*.csv`. Keep that CSV private; raw keys are never stored in the database.
