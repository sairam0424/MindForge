---
description: "Quick security assessment across 7 attack domains in 2-5 minutes. Usage - /mindforge:vibe-check [path] [--domain web|api|cli|all] [--headers-only]"
---

<objective>
Rapid security gut-check covering the most common vulnerability categories.
Faster than full threat modeling — catches 80% of issues in 20% of the time.
</objective>

<execution_context>
@.mindforge/skills/vibe-security/SKILL.md
@.mindforge/skills/security-review/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse target path (default: current diff) and domain filter (default: all).
2. If --headers-only: skip code analysis, check security headers only, report.
3. Identify application type (web app, API, CLI tool, library) to scope checks.
4. Quick-scan all 7 domains applicable to the type:
   - Access Control: check for sequential IDs, missing ownership verification, broken authz
   - XSS: check output encoding, CSP presence, unsafe innerHTML or React raw-HTML usage
   - CSRF: check token presence, SameSite cookies, state-changing GET requests
   - SSRF: check URL inputs, allowlists, metadata endpoint blocking
   - SQL Injection: check for string concatenation in queries, missing parameterization
   - File Upload: check extension vs magic bytes validation, storage location
   - Path Traversal: check user input in file paths, canonicalization
5. Check security headers: HSTS, CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy.
6. Check for common IP bypass patterns if SSRF-relevant code found.
7. Classify findings by severity: LOW / MEDIUM / HIGH / CRITICAL.
8. If any HIGH/CRITICAL: recommend escalating to `/mindforge:threat-model` for full analysis.
9. Write VIBE-SECURITY-CHECK.md to `.planning/` with findings + remediation.
10. Log vibe-check event in AUDIT. Total time target: under 5 minutes.
</process>
