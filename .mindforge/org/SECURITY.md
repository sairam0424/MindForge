# Security Policies — [ORG NAME]

<!-- Loaded by MindForge Security Reviewer persona for every security-related task -->

## Authentication standards
- Passwords: bcrypt with cost factor ≥ 12, or argon2id
- Tokens: cryptographically random, ≥ 32 bytes (use crypto.randomBytes)
- JWT access tokens: 15-minute expiry maximum
- JWT refresh tokens: 7-day expiry, stored in httpOnly, Secure, SameSite=Strict cookie
- Session IDs: regenerate on any privilege change (login, role change)
- MFA: required for all admin and privileged accounts

## Authorisation standards
- Deny by default — grant minimum required permissions
- Verify permissions server-side on every request
- Never trust client-sent role or permission claims
- Log every authorisation failure: user ID, resource, timestamp, IP

## Data protection
- Encryption at rest: AES-256 for all PII and sensitive data
- Encryption in transit: TLS 1.2 minimum, TLS 1.3 preferred
- PII must never appear in application logs
- Database backups encrypted at rest
- Data retention policy: [specify your org's policy]

## Secrets management
- Zero secrets in source code — all via environment variables
- All production secrets in [your secrets manager]
- Rotate secrets immediately if exposure is suspected
- Separate secrets per environment (dev/staging/prod never share)

## Dependency policy
- Audit new dependencies before adding: CVE check, licence check, maintenance status
- `npm audit --audit-level=high` must pass in CI before merge
- No packages with > 6 months without a commit (unless frozen intentionally)
- Approved licences: MIT, Apache-2.0, BSD-2/3-Clause, ISC
- Forbidden licences: GPL (without explicit legal approval), AGPL, SSPL

## Incident response
- P0 (active breach): notify [security contact] immediately, rotate all credentials
- P1 (critical vulnerability): patch within 24 hours
- P2 (high vulnerability): patch within 7 days
- All incidents: postmortem required within 5 business days

## Code review security checklist
Before approving any PR touching auth, payments, or PII:
- [ ] OWASP Top 10 reviewed (see security-reviewer.md persona)
- [ ] No secrets in diff
- [ ] Input validation on all user-controlled data
- [ ] New dependencies CVE-scanned
