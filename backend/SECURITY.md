# Backend Security

Report backend security issues privately to `contact@co-op.software`.

## Controls

- License keys are generated once and returned only in the creation response.
- Stored license and activation secrets are keyed hashes.
- Admin endpoints require Supabase JWT verification and `app_metadata.role = "admin"`.
- Account self-service endpoints require a valid Supabase session.
- Public activation endpoints validate license format, device limit, status, and expiration.
- Heartbeats validate activation token and machine fingerprint hash together.
- Production boot fails without a strong `LICENSE_KEY_PEPPER`.
- Production boot requires explicit `CORS_ORIGINS`.
- Global rate limiting is enabled through Nest throttling.
- HTTP errors are sanitized in production.

## Do Not Log

- Raw activation keys.
- Activation tokens.
- Supabase service role keys.
- Customer business prompts.
- Customer files.
- Customer workflow outputs.
- Provider API keys.

## Operational Notes

- Run `npm audit --audit-level=low` before release.
- Run `npm test` and `npm run build` before deploying.
- Run `npm run db:migrate` before routing traffic to a new schema.
- Use `SUPABASE_SERVICE_KEY` only for server-side one-off backfill operations.
- Treat `license-backfill-*.csv` as a secret and delete it after use.
