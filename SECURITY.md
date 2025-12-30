# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x.x | ✅ |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue
2. Open a private security advisory on GitHub
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

| Stage | Timeline |
|-------|----------|
| Acknowledgment | Within 48 hours |
| Initial Assessment | Within 7 days |
| Critical Fix | 24-72 hours |
| Standard Fix | Based on severity |

---

## Security Architecture

### Authentication

| Layer | Implementation |
|-------|----------------|
| User Auth | Supabase JWT (RS256) with token verification |
| Service Auth | API keys with SHA-256 hashing + revocation support |
| Admin Auth | Role-based with database lookup |
| Mobile Auth | OAuth via system browser (not WebView) |
| Session Validation | Server-side session integrity checks |

### Data Protection

| Feature | Implementation |
|---------|----------------|
| Encryption | AES-256-GCM with key versioning for sensitive data |
| Database | Parameterized queries (Drizzle ORM) |
| Secrets | Environment variables only |
| API Keys | SHA-256 hashed, timing-safe comparison, revocation |
| Document Encryption | Per-chunk AES-256-GCM for user documents |

### API Security

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | Per-user throttling with configurable presets |
| Input Validation | class-validator with strict DTOs, whitelist mode |
| CORS | Configurable allowed origins (production domains only) |
| Headers | Helmet.js security headers |
| SSRF Protection | URL validation (no private IPs) |
| Error Sanitization | Sensitive data filtered from error responses |

### Resilience & Monitoring

| Feature | Implementation |
|---------|----------------|
| Circuit Breaker | Opossum for fault tolerance |
| Retry Logic | Exponential backoff with jitter |
| Audit Logging | Full audit trail with DLQ for failed logs |
| Health Checks | Optimized with caching (5s TTL) |
| Prometheus Metrics | HTTP, LLM, Redis, Agent metrics |

### Mobile App Security

| Feature | Implementation |
|---------|----------------|
| OAuth | System browser (not WebView) |
| URL Allowlisting | Only trusted domains load |
| Deep Links | Verified app links |
| No Local Storage | Auth via web cookies |

---

## Security Checklist

### Production Deployment

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` set to specific domains (`https://co-op.software`)
- [ ] `MASTER_API_KEY` set (32+ chars, cryptographically random)
- [ ] `ENCRYPTION_KEY` set for data encryption (32+ chars)
- [ ] Database uses SSL (`?sslmode=require`)
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Dependencies audited (`npm audit`)
- [ ] All staging domains removed from configuration
- [ ] Webhook secrets encrypted at rest
- [ ] API key revocation tested

### Generate Secure Keys

```bash
# For MASTER_API_KEY
openssl rand -hex 32

# For ENCRYPTION_KEY
openssl rand -hex 32
```

### Environment Variables Security

```bash
# Required for production
NODE_ENV="production"
CORS_ORIGINS="https://co-op.software"
MASTER_API_KEY="<generated-32-char-hex>"
ENCRYPTION_KEY="<generated-32-char-hex>"
```

---

## Pilot Program Limits

All limits are configurable via environment variables:

| Resource | Default | Environment Variable |
|----------|---------|---------------------|
| Agent Requests | 3/month | `PILOT_AGENT_MONTHLY_REQUESTS` |
| API Keys | 1 | `PILOT_API_KEY_LIMIT` |
| Webhooks | 1 | `PILOT_WEBHOOK_LIMIT` |
| Alerts | 3 | `PILOT_ALERT_LIMIT` |
| Leads | 50 | `PILOT_LEAD_LIMIT` |
| Lead Discovery | 5/hour | `PILOT_LEAD_DISCOVERY_HOURLY` |
| Campaigns | 5 | `PILOT_CAMPAIGN_LIMIT` |
| Emails | 50/day | `PILOT_EMAILS_PER_DAY` |

---

## Contact

For security concerns, open a private security advisory on GitHub.
