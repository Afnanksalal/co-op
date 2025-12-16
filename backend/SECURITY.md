# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue
2. Email: Open a private security advisory on GitHub
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution**: Based on severity (critical: 24-72 hours)

---

## Security Measures

### Authentication

| Feature | Implementation |
|---------|----------------|
| User Auth | Supabase JWT (RS256) |
| Service Auth | API keys with SHA-256 hashing + timing-safe comparison |
| Admin Auth | Role-based with database lookup |
| Token Verification | Server-side JWT validation |

### API Security

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | Per-user throttling with configurable presets |
| Input Validation | class-validator with strict DTOs, whitelist mode |
| CORS | Configurable origins |
| Headers | Helmet.js security headers |
| SSRF Protection | Webhook URL validation (no private IPs) |

### Data Security

| Feature | Implementation |
|---------|----------------|
| Database | Parameterized queries (Drizzle ORM) |
| Encryption | AES-256-GCM for sensitive data at rest |
| Secrets | Environment variables only |
| API Keys | SHA-256 hashed storage, timing-safe comparison |
| Audit | IP tracking, user agent, full event logging |

### Encryption Details

```
Algorithm: AES-256-GCM
Key Derivation: SHA-256 from ENCRYPTION_KEY env var
IV: 96-bit random per encryption
Auth Tag: 128-bit for integrity verification
Format: iv:authTag:ciphertext (hex encoded)
```

Used for:
- Webhook secrets
- API tokens
- Sensitive configuration

### Rate Limiting Presets

| Preset | Limit | Window | Use Case |
|--------|-------|--------|----------|
| STANDARD | 100 | 60s | General API |
| STRICT | 10 | 60s | Sensitive operations |
| CREATE | 5 | 60s | Resource creation |
| READ | 200 | 60s | Read operations |
| BURST | 30 | 10s | Burst protection |


### Resilience

| Feature | Implementation |
|---------|----------------|
| Circuit Breaker | Opossum with configurable thresholds |
| Retry Logic | Exponential backoff with jitter |
| Health Checks | Endpoint monitoring |
| Graceful Shutdown | NestJS shutdown hooks |

---

## Security Checklist

### Production Deployment

- [x] `NODE_ENV=production`
- [x] `CORS_ORIGINS` set to specific domains
- [x] `MASTER_API_KEY` set to strong value (32+ chars)
- [x] `ENCRYPTION_KEY` set for data encryption
- [x] Database uses SSL connection (`?sslmode=require`)
- [x] Rate limiting enabled
- [x] Audit logging enabled
- [x] Dependencies audited (`npm audit`)
- [x] Helmet.js security headers enabled
- [x] Input validation in whitelist mode

### Environment Variables Security

```bash
# Generate secure keys
openssl rand -hex 32  # For MASTER_API_KEY
openssl rand -hex 32  # For ENCRYPTION_KEY
```

---

## Known Considerations

### LLM Prompt Injection

Mitigations:
- System prompts not exposed to users
- User input clearly delineated in prompts
- Output validated and sanitized before storage
- Response sanitization service

### Webhook Security

Mitigations:
- URL validation (no private IPs, localhost, etc.)
- HMAC-SHA256 signature verification
- Encrypted secret storage (AES-256-GCM)
- Timeout and retry limits
- Audit logging of all deliveries

### API Key Security

Mitigations:
- Keys hashed with SHA-256 before storage
- Timing-safe comparison to prevent timing attacks
- Keys never logged or exposed in responses
- Revocation support

### Document Upload Security

Mitigations:
- File size limits (10MB max)
- MIME type validation
- Secure storage in Supabase Storage
- Signed URLs for access (1-hour expiry)
- User ownership verification

---

## Audit Logging

All sensitive operations are logged:

| Event | Data Captured |
|-------|---------------|
| User Actions | userId, action, resource, timestamp |
| API Key Usage | keyId, endpoint, timestamp |
| Webhook Delivery | webhookId, status, response |
| Admin Operations | adminId, action, changes |

Logs include:
- IP address
- User agent
- Old/new values for changes
- Request metadata

---

## Contact

For security concerns, open a private security advisory on GitHub.
