# MindForge — Security Scan Command
# Usage: /mindforge:security-scan [path] [--deep] [--deps] [--secrets]
# Standalone security scan. Can be run independently of the phase lifecycle.

## Scan modes
- Default: OWASP Top 10 review on the changed files or specified path
- `--deep`: Extended scan including all files, not just changed
- `--deps`: Dependency audit (CVE scan of package.json / requirements.txt)
- `--secrets`: Secret detection scan only (fast, suitable for pre-commit hook)
- Flags composable: `--deps --secrets` runs both dependency audit and secret detection

## Step 1 — Activate Security Reviewer persona

Load `security-reviewer.md` persona immediately and completely.
This command runs entirely in security mode. Do not switch personas.

## Step 2 — Build scan scope

```bash
# Default: staged + unstaged changes
git diff HEAD --name-only

# With path argument
find [path] -name "*.ts" -o -name "*.js" -o -name "*.py"

# --deep: all source files
find src/ -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" \)
```

## Step 3 — OWASP Top 10 scan (always runs unless --secrets only)

For each file in scope, check all 10 OWASP categories:

### A01 — Broken Access Control
- Scan for: missing auth middleware, direct object references, path traversal
- Patterns to flag:
  ```
  req.params.userId         # Direct user ID from request — verify ownership check
  fs.readFile(userInput)    # Path traversal risk
  WHERE id = ${id}          # Direct injection without parameterisation
  ```

### A02 — Cryptographic Failures
- Scan for: weak algorithms, insecure transport, unencrypted sensitive data
- Patterns to flag:
  ```
  md5(, sha1(, sha256(password  # Weak password hashing
  http://   # Non-HTTPS URLs in API calls
  Math.random()  # Cryptographically insecure random
  ```

### A03 — Injection
- Scan for: SQL, NoSQL, OS, LDAP injection
- Patterns to flag:
  ```
  `SELECT * FROM users WHERE email = '${  # SQL injection
  exec(, execSync(, child_process         # OS command injection
  eval(userInput                          # Code injection
  ```

### A04 — Insecure Design
- Scan for: missing rate limiting, no input validation, trust boundary issues
- Patterns to flag: endpoints without validation middleware, no rate limit decorators

### A05 — Security Misconfiguration
- Scan for: debug mode in production, default credentials, verbose errors
- Patterns to flag:
  ```
  console.error(err)        # Exposes stack traces to clients
  NODE_ENV !== 'production' # Debug code paths
  ALLOW_ALL, *, cors({origin: '*'})  # Overly permissive CORS
  ```

### A06 — Vulnerable Components
- Run: `npm audit --audit-level=moderate` or `pip-audit`
- Flag any HIGH or CRITICAL CVEs

### A07 — Authentication Failures
- Scan for: missing password complexity, no brute force protection, weak sessions
- Patterns to flag:
  ```
  bcrypt.hashSync(pass, 1)  # Cost factor too low
  jwt.verify(token, '', {   # Empty secret
  session.destroy(          # Verify redirect after destroy
  ```

### A08 — Software and Data Integrity Failures
- Check: no package-lock.json means no integrity guarantee
- Check: any `curl | sh` or `wget | bash` patterns

### A09 — Security Logging Failures
- Scan for: no logging on auth failures, admin actions not logged, PII in logs
- Patterns to flag:
  ```
  user.email in any log statement
  password in any log statement
  catch(e) {}  # Silent failure = no security log
  ```

### A10 — SSRF
- Scan for: server-side requests to user-controlled URLs
- Patterns to flag:
  ```
  fetch(req., axios.get(req., axios.post(req., http.get(req.,
  req.body.url, req.params.url, req.query.url, req.headers
  ```

## Step 4 — Secret detection (--secrets or always as part of default scan)

Pattern-based scan across all files in scope:

```bash
# High confidence patterns (always flag as CRITICAL)
grep -rn -E "(sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{36})" .

# Credential assignment patterns (flag as HIGH)
grep -rn -E "(password|passwd|secret|api_key|apikey|access_token)\s*=\s*['\"][^'\"]{8,}" .

# Azure connection strings
grep -rn -E "DefaultEndpointsProtocol=https;AccountName=" .

# GCP service account keys
grep -rn -E "\"type\"\\s*:\\s*\"service_account\"" .

# PEM/Certificate content
grep -rn "-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----" .

# Database URLs with credentials
grep -rn -E "postgres://[^:]+:[^@]+@|mysql://[^:]+:[^@]+@" .
```

Report each finding with:
- File and line number
- The matched pattern (redact the actual secret value: show first 4 chars + ***)
- Severity: CRITICAL if a real credential pattern, HIGH if credential-shaped pattern
Redaction applies to both console output and the report file.

## Step 5 — Dependency audit (--deps flag)

```bash
# Node.js projects
npm audit --json 2>/dev/null | node -e "
  const data = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
  const vulns = data.vulnerabilities || {};
  Object.entries(vulns).forEach(([name, v]) => {
    if (['high','critical'].includes(v.severity)) {
      console.log(v.severity.toUpperCase() + ': ' + name + ' — ' + v.via[0]?.title);
    }
  });
"

# Python projects
pip-audit --format json 2>/dev/null
```

## Step 6 — Write security scan report

`.planning/SECURITY-SCAN-[timestamp].md`:

```markdown
# Security Scan Report
**Date:** [ISO-8601]
**Scope:** [what was scanned]
**Scanner:** MindForge Security Reviewer

## Executive Summary
[1-2 sentences: overall security posture, number of findings by severity]

## Critical Findings (fix immediately — block all merges)
[OWASP category] | [File:Line] | [Description] | [Remediation]

## High Findings (fix before next release)
...

## Medium Findings (fix in next sprint)
...

## Low Findings (backlog)
...

## Dependency Audit
| Package | Version | Severity | CVE | Fixed in |
|---|---|---|---|---|

## Secret Detection
| File | Pattern | Severity | Action |
|---|---|---|---|

## Verdict
✅ CLEAN — No critical or high findings
⚠️  ISSUES — [N] critical, [N] high findings require attention
```

## Important: scan report visibility

Security scan reports are written to `.planning/SECURITY-SCAN-[timestamp].md`.

**Private repository:** Keep reports committed — they are valuable for audit
history and team security review.

**Public repository:** Add `.planning/SECURITY-SCAN-*.md` to `.gitignore`
to avoid exposing vulnerability information to potential attackers.

MindForge does not make this decision for you — configure `.gitignore`
based on your repository's visibility.

## Step 7 — Write AUDIT entry

```json
{
  "event": "security_scan_completed",
  "scope": "[path or 'staged changes']",
  "flags": ["--deps", "--secrets"],
  "critical_findings": [N],
  "high_findings": [N],
  "secrets_detected": [N],
  "vulnerable_deps": [N],
  "report_path": ".planning/SECURITY-SCAN-[timestamp].md"
}
```

## Automatic blocking behaviour
If CRITICAL findings are detected: print a prominent warning:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL SECURITY FINDINGS DETECTED

  [N] critical issues must be fixed before any code is merged.
  See: .planning/SECURITY-SCAN-[timestamp].md

  Do NOT commit or deploy until these are resolved.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
