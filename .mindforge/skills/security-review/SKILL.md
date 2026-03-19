---
name: security-review
version: 1.0.0
triggers: auth, authentication, authorisation, authorization, login, logout, password,
          token, JWT, session, cookie, OAuth, payment, billing, stripe, PII, GDPR,
          personal data, upload, file upload, credentials, API key, secret, env,
          environment variable, encryption, hashing, bcrypt, argon2
---

# Skill — Security Review

## When this skill activates
Any task involving user identity, data protection, payments, file handling,
or credential management. When in doubt: load this skill.

## Mandatory actions when this skill is active

### Before writing any code
1. Switch to `security-reviewer.md` persona.
2. Read the existing code in every file you will touch.
3. Identify existing vulnerabilities before introducing new ones.
4. Review SECURITY.md for org-specific policies.

### During implementation
Apply these patterns by default — do not wait to be asked:

**Authentication**
- Passwords: bcrypt (cost ≥ 12) or argon2id. Never MD5, SHA1, or unsalted SHA256.
- Tokens: cryptographically random, minimum 32 bytes. Use `crypto.randomBytes(32)`.
- JWT: short expiry (15 min access, 7 day refresh). Store refresh in httpOnly cookie.
- Sessions: regenerate session ID on privilege escalation. Invalidate on logout.

**Authorisation**
- Check permissions server-side on every request. Never trust client-sent roles.
- Use deny-by-default. Grant only the minimum required permissions.
- Log every authorisation failure with user ID, resource, and timestamp.

**Input handling**
- Validate all input at the boundary (route handler). Reject, never sanitise.
- SQL: parameterised queries only. Never string concatenation.
- File uploads: validate MIME type server-side. Never trust `Content-Type` header alone.
- Redirect URLs: whitelist allowed domains. Never redirect to arbitrary user input.

**Secrets**
- Environment variables only. Never in source code. Never in git.
- Rotate credentials if there is any suspicion of exposure.
- Use a secrets manager (Vault, AWS Secrets Manager) in production.

### After implementation
Run the OWASP checklist from `security-reviewer.md` against your own diff.
Write findings to `.planning/phases/phase-N/SECURITY-REVIEW-N.md`.

## Red lines (stop immediately if you encounter these)
- A hardcoded secret, password, or API key anywhere in the codebase
- A SQL query built by string concatenation
- A password comparison using `==` instead of a constant-time function
- JWT verification being skipped or using `none` algorithm
- User input being passed directly to `eval()`, `exec()`, or shell commands

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I activate the corresponding persona file?
- [ ] Did I apply every mandatory action in this skill, not just the ones
  I remembered off the top of my head?
- [ ] If this skill produced an output file (review, security report, etc.),
  has that file been written to the correct path?

## When you find a vulnerability

Do not silently fix it and move on. For every vulnerability found:

1. **Stop the current task.**
2. **Classify it** using the severity model (CRITICAL / HIGH / MEDIUM / LOW).
3. **For CRITICAL or HIGH:** Write to `SECURITY-REVIEW-N.md` immediately.
   Tell the user. Do not proceed with ANY other work until acknowledged.
4. **For MEDIUM:** Write to `SECURITY-REVIEW-N.md`. Finish the current task.
   Flag at the end of the SUMMARY.md.
5. **For LOW:** Write to `SECURITY-REVIEW-N.md`. Note in SUMMARY.md.

The worst security outcome is a vulnerability that was found, noted mentally,
and then forgotten when context rolled over. Write it down. Always.

