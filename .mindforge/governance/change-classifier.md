# MindForge Governance — Change Classifier

## Purpose
Assign each change a governance tier before execution and again before release.
Tier 3 signals always override lower-risk heuristics.

## Trigger points
- Before each plan executes
- Before PR or merge request creation
- Before emergency override requests are processed

## Tier model

| Tier | Meaning | Approval requirement |
|---|---|---|
| 1 | Low-risk documentation or isolated refactor | none |
| 2 | Broad change, cross-cutting impact, or moderate operational risk | peer approval |
| 3 | Security, privacy, auth, payment, secrets, or compliance-sensitive | security/compliance approval |

## Step 1 — Base heuristics
- More than 10 files or more than 300 lines changed defaults to Tier 2
- Infra, deployment, or schema changes default to at least Tier 2
- File count is only a signal; it never downgrades a Tier 3 match

## Step 2 — Apply Tier 3 rules first
Tier 3 uses three independent signals. Any one match makes the change Tier 3.

### Signal A — File path patterns
Security-critical directories and files:
`auth/`, `security/`, `payment/`, `billing/`, `privacy/`, `crypto/`, `secrets/`

Security-critical names:
`login.ts`, `logout.ts`, `token.ts`, `password.ts`, `credentials.ts`,
`session.ts`, `oauth.ts`, `jwt.ts`, `hash.ts`, `encrypt.ts`, `stripe.ts`,
`payment.ts`, `billing.ts`, `pii.ts`, `consent.ts`

### Signal B — Code content patterns
Scan the actual diff content, not only filenames, for patterns such as:
`bcrypt`, `argon2`, `jwt.sign`, `jwt.verify`, `jose.sign`, `jose.verify`,
`stripe.`, `paypal.`, `createCipheriv`, `createDecipheriv`, `crypto.subtle`,
`hashPassword`, `verifyPassword`, `encrypt(`, `decrypt(`, `role.*permission`,
`hasPermission`, `SET ROLE`, `GRANT`

This protects against security-critical code being added to innocuous filenames
 like `src/utils/helper.ts`.

### Signal C — AUDIT history patterns
If the current phase has a recent HIGH or CRITICAL `security_finding`, the next
 change in that phase is elevated to Tier 3 automatically.

## Classification audit entry
Record why the tier was selected:

```json
{
  "event": "change_classified",
  "tier": 3,
  "classification_reason": "code pattern: jwt.sign found in src/utils/helper.ts",
  "signals_checked": ["file_path", "code_content", "audit_history"],
  "signal_triggered": "code_content",
  "pattern_matched": "jwt.sign"
}
```
