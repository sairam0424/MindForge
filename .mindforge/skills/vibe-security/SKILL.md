---
name: vibe-security
version: 1.0.0
min_mindforge_version: 10.0.5
status: stable
triggers: vibe check security, quick security, rapid security, security intuition, fast security scan, security gut check, security quick look, attack surface quick, security sanity check, owasp quick, header check, security baseline
compose: security-review
---

# Skill — Vibe Security (Fast-Path Security Assessment)

## When this skill activates

When a rapid security assessment is needed (2-5 minutes) rather than a full
threat model (15-30 minutes). Use for quick sanity checks during development,
pre-commit security sweeps, or when something "feels off" about the security
posture. Covers the 7 most common vulnerability domains with actionable checks.

Core principle: **Speed over exhaustiveness** — catch the 80% of issues in 20%
of the time. Flag anything that needs deeper investigation for the full
security-review skill.

## Mandatory actions when this skill is active

### Before assessment begins

1. **Scope the check:**
   - What changed? (diff-based: only assess modified/new code)
   - What domain? (web app, API, CLI, library, infrastructure)
   - What data sensitivity? (public, internal, PII, financial, health)
   - Time budget: strictly 2-5 minutes (set a mental timer)

2. **Identify the attack surface:**
   - Entry points: HTTP endpoints, CLI args, file inputs, env vars
   - Data flows: user input → processing → storage → output
   - Trust boundaries: client/server, service/service, internal/external

### During assessment

**Domain 1 — Access Control:**
- [ ] IDs are UUIDs, not sequential integers (prevents enumeration)
- [ ] Ownership verified at the data layer, not just the route layer
- [ ] Multi-tenant: org/team membership checked on every data access
- [ ] Admin endpoints have explicit role checks (not just "is authenticated")
- [ ] No horizontal privilege escalation (user A accessing user B's data)

**Domain 2 — XSS (Cross-Site Scripting):**
- [ ] Output encoding applied per context:
  - HTML body: HTML entity encoding
  - HTML attributes: attribute encoding
  - JavaScript: JS string encoding
  - URLs: percent encoding
  - CSS: CSS encoding
- [ ] Content Security Policy (CSP) header present and restrictive
- [ ] DOMPurify or equivalent used for any user-generated HTML rendering
- [ ] No raw HTML injection patterns (e.g., innerHTML assignment from user input)
- [ ] React/framework auto-escaping not bypassed without sanitization

**Domain 3 — CSRF (Cross-Site Request Forgery):**
- [ ] CSRF tokens present on state-changing requests
- [ ] Tokens are session-tied and regenerated on login
- [ ] SameSite cookie attribute set (Lax minimum, Strict preferred)
- [ ] Double-submit cookie pattern as backup for API endpoints
- [ ] GET requests never perform state changes

**Domain 4 — SSRF (Server-Side Request Forgery):**
- [ ] URL allowlist validation (not blocklist — blocklists are bypassable)
- [ ] DNS rebinding prevention (resolve DNS, validate IP, THEN connect)
- [ ] Cloud metadata endpoint blocked: `169.254.169.254`, `fd00:ec2::254`
- [ ] Internal network ranges blocked: `10.x`, `172.16-31.x`, `192.168.x`
- [ ] IP bypass vectors checked (see catalog below)

**Domain 5 — SQL Injection:**
- [ ] All queries use parameterized statements (never string concatenation)
- [ ] ORM usage verified as safe (no raw query building from user input)
- [ ] Database user has least-privilege permissions (no DROP, no schema changes)
- [ ] Dynamic column/table names validated against allowlist (not user-controlled)

**Domain 6 — File Upload:**
- [ ] File type validated by magic bytes (not just extension)
- [ ] Files stored outside the webroot (not directly accessible via URL)
- [ ] Filename sanitized (stripped of path separators, null bytes, special chars)
- [ ] File size limits enforced server-side (not just client-side)
- [ ] Image files re-encoded to strip embedded scripts/metadata

**Domain 7 — Path Traversal:**
- [ ] Paths canonicalized before use (`path.resolve`, `realpath`)
- [ ] Resolved path validated against base directory (must be child of allowed dir)
- [ ] No user input used directly in filesystem paths
- [ ] Null byte injection prevented (relevant for older runtimes)
- [ ] Symlink following restricted or validated

**IP Bypass Catalog (for SSRF testing):**
```
127.0.0.1 variants:
- Decimal:     2130706433
- Octal:       017700000001
- Hex:         0x7f000001
- IPv6:        ::1
- IPv6 mapped: ::ffff:127.0.0.1
- Short:       127.1
- Zero:        0.0.0.0

Cloud metadata:
- AWS:         169.254.169.254, fd00:ec2::254
- GCP:         metadata.google.internal
- Azure:       169.254.169.254 (header: Metadata: true)
```

**Security Headers Baseline:**
```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

- [ ] All 6 headers present in HTTP responses
- [ ] CSP does not include `unsafe-inline` or `unsafe-eval` without justification

### After assessment

1. **Generate VIBE-SECURITY-CHECK.md:**
   ```markdown
   ## Vibe Security Check — [date]
   **Scope:** [what was assessed]
   **Time spent:** [X minutes]
   **Risk level:** LOW / MEDIUM / HIGH / CRITICAL

   ### Findings
   | # | Domain | Finding | Severity | Remediation |
   |---|--------|---------|----------|-------------|
   | 1 | ...    | ...     | ...      | ...         |

   ### Headers Status
   [present/missing for each of 6 headers]

   ### Needs Deeper Review
   [list anything that requires full security-review skill]
   ```

2. **Severity classification:**
   - CRITICAL: Exploitable now, leads to data breach or auth bypass
   - HIGH: Exploitable with moderate effort, significant impact
   - MEDIUM: Requires specific conditions, limited impact
   - LOW: Defense-in-depth improvement, not directly exploitable

3. **Escalation rules:**
   - Any CRITICAL finding: STOP all other work, fix immediately
   - 2+ HIGH findings: escalate to full `security-review` skill
   - MEDIUM/LOW: add to backlog, fix in next sprint

## Self-check before task completion

Before marking a vibe security check done:

- [ ] Did I check all 7 domains (access control, XSS, CSRF, SSRF, SQLi, upload, path traversal)?
- [ ] Did I verify security headers (all 6 present and correctly configured)?
- [ ] Did I check for IP bypass vulnerabilities in any SSRF-adjacent code?
- [ ] Did I stay within the 5-minute time budget?
- [ ] Did I generate VIBE-SECURITY-CHECK.md with findings and severity?
- [ ] Did I escalate CRITICAL findings immediately?
- [ ] Did I flag items needing deeper review for the full security-review skill?
