# MindForge — PR Review Prompt Templates

## Specialised review templates by change type

### Security-focused review (for Tier 3 changes)
Used when: PR includes auth, payment, PII, or security changes.
Additional system prompt addition:
```
SECURITY REVIEW MODE ACTIVE.
Apply the OWASP Top 10 checklist systematically to this diff.
Flag every instance of:
- A01: Access control bypasses
- A02: Cryptographic weaknesses (weak algorithms, insecure storage)
- A03: Injection vectors (SQL, NoSQL, OS, LDAP)
- A07: Authentication failures (session management, credential handling)
Any CRITICAL security finding must be listed first, before other findings.
```

### Database migration review
Used when: PR includes database schema changes.
Additional prompt addition:
```
DATABASE MIGRATION REVIEW MODE.
For this migration, verify:
1. Migration is reversible — is there a DOWN migration?
2. Migration is non-blocking — does it avoid full table locks?
3. New columns with NOT NULL have either a DEFAULT or a two-phase migration
4. No data-loss operations without explicit confirmation in PR description
5. New indexes are added CONCURRENTLY (PostgreSQL) to avoid table locks
6. Foreign key constraints are added with VALIDATE separately from creation
```

### API breaking change review
Used when: PR changes existing API endpoints or response schemas.
Additional prompt addition:
```
API BREAKING CHANGE REVIEW MODE.
Verify:
1. Is this change documented as breaking in the PR description?
2. Is the API version incremented appropriately?
3. Are existing clients given a deprecation period?
4. Is a migration guide included for API consumers?
5. Do integration tests cover both old and new API contracts?
```
