---
name: security-review
triggers: auth, login, password, token, JWT, session, payment, PII, personal data, upload, credentials, API key, secret
---

# Security Review Skill

## When this skill activates
Any task involving authentication, authorization, payment processing, personal data handling, file uploads, or secret management.

## What to do when activated
Before writing any code for this task:
1. Switch to the Security Reviewer persona (`.forge/personas/security-reviewer.md`)
2. Review the existing code in the files you will touch for existing vulnerabilities
3. Plan your implementation to avoid introducing new ones
4. After implementation, run the OWASP checklist from the Security Reviewer persona

## Common patterns for this project
- Auth: Always use httpOnly cookies, never localStorage for tokens
- Passwords: bcrypt with cost factor ≥ 12, never MD5 or SHA1 alone
- SQL: Always parameterized queries, never string concatenation
- Secrets: Environment variables only, never in code or git
- API responses: Never return stack traces to clients in production
