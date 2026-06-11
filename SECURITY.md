# Security

Report security issues privately to `security@co-op.software`.

## Current Security Model

- Cloud authentication uses Supabase sessions.
- Admin license endpoints require a Supabase user with `app_metadata.role = "admin"`.
- License keys and activation tokens are never stored raw; the backend stores keyed SHA-256 HMAC hashes using `LICENSE_KEY_PEPPER`.
- Desktop activation sends a machine fingerprint hash, not raw hardware identifiers.
- Desktop workflow/provider state is stored locally by the Tauri runtime.
- Production startup fails without a strong `LICENSE_KEY_PEPPER` value.
- Frontend and backend dependency audits are part of the release checks.
- Rust audits run with warning denial through `npm run audit:rust` from `frontend/`; the only ignored RustSec IDs are upstream Tauri/wry GTK3/glib/unic/proc-macro advisories that have no patched Tauri release yet.

## Operator Checklist

- Use HTTPS everywhere.
- Restrict `CORS_ORIGINS` in production.
- Rotate `LICENSE_KEY_PEPPER` only with a planned migration because existing license hashes depend on it.
- Keep Supabase admin roles tightly controlled.
- Do not log raw license keys, activation tokens, provider API keys, or local workflow prompts.
- Revisit the RustSec allowlist on every Tauri upgrade and remove entries as soon as upstream patches land.
