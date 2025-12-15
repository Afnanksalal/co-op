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
| Service Auth | API keys with timing-safe comparison |
| Admin Auth | Role-based with database lookup |

### API Security

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | Per-user throttling |
| Input Validation | class-validator with strict DTOs |
| CORS | Configurable origins |
| Headers | Helmet security headers |
| SSRF Protection | Webhook URL validation |

### Data Security

| Feature | Implementation |
|---------|----------------|
| Database | Parameterized queries (Drizzle ORM) |
| Secrets | Environment variables only |
| API Keys | Hashed storage, timing-safe comparison |
| Audit | IP tracking, event logging |

---

## Security Checklist

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` set to specific domains
- [ ] `MASTER_API_KEY` set to strong value
- [ ] Database uses SSL connection
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Dependencies audited (`npm audit`)

---

## Known Considerations

### LLM Prompt Injection

Mitigations:
- System prompts not exposed to users
- User input clearly delineated
- Output validated before storage

### Webhook Security

Mitigations:
- URL validation (no private IPs)
- HMAC signature verification
- Timeout and retry limits

---

## Contact

For security concerns, open a private security advisory on GitHub.
