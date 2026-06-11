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

Optional:

- `DATABASE_SSL_REJECT_UNAUTHORIZED`
- `LICENSE_OFFLINE_GRACE_DAYS`
- `THROTTLE_TTL`
- `THROTTLE_LIMIT`
- `CORS_ORIGINS`
- `APP_URL`

## Commands

```bash
npm install
npm test
npm run build
npm audit --audit-level=low
```
