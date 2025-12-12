# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please report it responsibly.

### How to Report

1. **Do NOT** open a public GitHub issue for security vulnerabilities
2. Email security concerns to: [security@your-domain.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 7 days
- **Resolution**: Depends on severity (critical: 24-72 hours)

### What to Expect

- We will acknowledge receipt of your report
- We will investigate and validate the issue
- We will work on a fix and coordinate disclosure
- We will credit you in the security advisory (unless you prefer anonymity)

---

## Security Measures

### Authentication & Authorization

| Feature | Implementation |
|---------|----------------|
| User Auth | Supabase JWT with RS256 |
| Service Auth | API keys with timing-safe comparison |
| Admin Auth | Role-based with database lookup |
| Session Management | Supabase handles token refresh |

### API Security

| Feature | Implementation |
|---------|----------------|
| Rate Limiting | Per-user throttling via @nestjs/throttler |
| Input Validation | class-validator with strict DTOs |
| CORS | Configurable origins (not `*` in production) |
| Helmet | Security headers enabled |
| SSRF Protection | Webhook URL validation |

### Data Security

| Feature | Implementation |
|---------|----------------|
| Database | PostgreSQL with parameterized queries (Drizzle ORM) |
| Secrets | Environment variables, never in code |
| Passwords | Handled by Supabase (bcrypt) |
| API Keys | Hashed storage, timing-safe comparison |

### Infrastructure Security

| Feature | Implementation |
|---------|----------------|
| TLS | Enforced in production (Render) |
| Container | Non-root user in Docker |
| Dependencies | Regular npm audit |
| Logging | Audit trail with IP tracking |

---

## Security Best Practices

### For Operators

1. **Environment Variables**
   - Never commit `.env` files
   - Use strong, unique values for `MASTER_API_KEY`
   - Rotate API keys periodically

2. **CORS Configuration**
   - Never use `*` in production
   - Whitelist specific origins

3. **Rate Limiting**
   - Adjust `THROTTLE_TTL` and `THROTTLE_LIMIT` based on usage
   - Consider per-endpoint limits for sensitive operations

4. **Monitoring**
   - Enable Prometheus metrics
   - Monitor for unusual patterns
   - Set up alerts for failed auth attempts

5. **Updates**
   - Keep dependencies updated
   - Run `npm audit` regularly
   - Subscribe to security advisories

### For Developers

1. **Input Validation**
   - Always use DTOs with class-validator
   - Validate all user input
   - Use Zod for runtime validation where needed

2. **Authentication**
   - Use provided guards (`@UseGuards(AuthGuard)`)
   - Never bypass auth for convenience
   - Use timing-safe comparison for secrets

3. **Database**
   - Use Drizzle ORM (no raw SQL)
   - Validate ownership before operations
   - Use transactions for multi-step operations

4. **Logging**
   - Never log sensitive data (passwords, tokens)
   - Use audit service for security events
   - Include request context (IP, user ID)

5. **Error Handling**
   - Don't expose internal errors to clients
   - Use HttpExceptionFilter
   - Log full errors server-side only

---

## Security Checklist for Deployment

- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGINS` set to specific domains (not `*`)
- [ ] `MASTER_API_KEY` set to strong random value
- [ ] All API keys are unique and strong
- [ ] Database uses SSL connection
- [ ] Redis uses TLS (Upstash default)
- [ ] Supabase RLS policies configured
- [ ] Rate limiting enabled
- [ ] Audit logging enabled
- [ ] Prometheus metrics secured with API key
- [ ] No debug endpoints exposed
- [ ] Dependencies audited (`npm audit`)

---

## Known Security Considerations

### LLM Prompt Injection

The platform uses LLMs which are susceptible to prompt injection. Mitigations:

- System prompts are not exposed to users
- User input is clearly delineated in prompts
- Output is validated before storage
- Sensitive operations require additional auth

### Webhook Security

Webhooks can be targets for SSRF attacks. Mitigations:

- URL validation (no private IPs, localhost)
- HMAC signature verification
- Timeout limits on webhook delivery
- Retry limits to prevent amplification

### API Key Security

API keys provide service-level access. Mitigations:

- Keys are hashed before storage
- Timing-safe comparison prevents timing attacks
- Keys can be revoked immediately
- Audit logging tracks key usage

---

## Compliance

This project implements security controls aligned with:

- OWASP Top 10
- CWE/SANS Top 25

For specific compliance requirements (SOC 2, HIPAA, GDPR), additional configuration may be needed.

---

## Security Updates

Security updates are released as patch versions. Subscribe to releases to stay informed.

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix
```

---

## Contact

For security concerns: [security@your-domain.com]

For general questions: Open a GitHub issue
