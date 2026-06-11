# Backend Security

- License keys are generated once and returned to the admin response only once.
- Stored license and activation secrets are keyed hashes.
- Admin endpoints use Supabase JWT verification and require `app_metadata.role = "admin"`.
- Public activation endpoints validate license format, customer email, device limit, status, and expiration.
- Heartbeats validate activation token and machine fingerprint hash together.
- Production boot fails without a strong `LICENSE_KEY_PEPPER`.
- HTTP errors are sanitized in production.
