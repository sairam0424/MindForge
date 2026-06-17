# Security Policy

## Supported Versions

| Version | Status | Support Level |
|---------|--------|---------------|
| 11.x | **Current** | Full security and feature updates |
| 10.x | Maintenance | Critical security patches only (until 2026-11-30) |
| 9.x | End of Life | No further updates |
| 8.x and below | End of Life | No further updates |

We recommend all users upgrade to the latest 11.x release. Security patches for 10.x will be provided for critical vulnerabilities only, on a best-effort basis, until November 2026.

---

## Reporting a Vulnerability

If you discover a security vulnerability in MindForge, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

### How to Report

1. **Email**: Send a detailed report to the repository maintainer via the email listed in their GitHub profile.
2. **GitHub Security Advisories**: Use the "Report a vulnerability" button on the repository's Security tab (preferred).

### What to Include

- Description of the vulnerability and its potential impact
- Steps to reproduce (minimal test case preferred)
- Affected version(s)
- Any suggested fix or mitigation

### Response Timeline

| Stage | Target |
|-------|--------|
| Acknowledgment | Within 48 hours |
| Severity assessment | Within 5 business days |
| Patch development | Within 14 days for Critical/High |
| Public disclosure | After patch is released, coordinated with reporter |

We follow responsible disclosure practices. We will credit reporters in the release notes unless they prefer anonymity.

---

## Security Features (v11.0.0)

### Authentication & Authorization

- **Bearer token auth on dashboard** — All mutating endpoints (`/api/steering`, `/api/approve`, SSE control) require `Authorization: Bearer <token>`. Token is sourced from `MINDFORGE_DASHBOARD_TOKEN` environment variable.
- **Token expiration with refresh** — Dashboard tokens expire after 24 hours. Use `/api/v1/auth/refresh` to obtain a new token without re-authenticating.
- **Dashboard rate limiting** — 100 requests per minute per IP address. Exceeding the limit returns 429 with `Retry-After` header.
- **Session-scoped RBAC with TTL elevation** — Elevated permissions are session-scoped and auto-expire. No persistent privilege escalation.
- **Browser daemon authentication** — The `/evaluate` endpoint requires auth before executing code in the Playwright context.
- **ZTAI Trust Tiers** — 4-tier authorization model (Tier 0-3) controls which agents can perform which actions. Tier 3 (catastrophic-risk) operations require explicit human approval.

### Cryptographic Security

- **Ephemeral enclave keys** — All crypto keys generated via `crypto.randomBytes()` at runtime. No hardcoded secrets in source.
- **Structured crypto boundaries** — Simulated (governance-enforcement) vs real (production-grade) cryptographic operations are clearly separated and labeled in code.
- **GPG approval verification** — Optional GPG signature verification on governance approvals for high-trust environments.
- **HMAC-signed temporal snapshots** — Temporal state captures are HMAC-signed to detect tampering during rollback operations.

### Audit & Integrity

- **Merkle-chain audit log** — Every entry in `AUDIT.jsonl` includes a SHA-256 hash of the previous entry. Tampering with any historical entry breaks the chain, making modifications detectable.
- **AuditWriter with buffered writes** — Atomic append operations prevent partial writes from corrupting the log.
- **Log rotation with archival** — AUDIT.jsonl auto-archives beyond 5000 lines with gzip compression, preventing unbounded disk growth.
- **npm provenance** — Published packages include SLSA Build Level 2 attestation via `--provenance`, proving the package was built from the stated source commit in CI.

### Input Validation & Injection Prevention

- **Parameterized SQL queries** — All VectorHub queries use bound parameters. No string concatenation of user input into SQL.
- **Path traversal prevention** — The temporal API validates `auditId` against `[a-zA-Z0-9_-]` and verifies resolved paths remain within the expected directory.
- **No shell interpretation** — Commands that invoke external processes use argument arrays, never shell string interpolation.
- **Structured action allowlist** — Autonomous actions are validated against an explicit permit list (replaces the previous regex blocklist that was prone to bypass).

### Governance & Policy

- **Structured ZK verification** — `verifyZKProof()` returns a structured result with `verified`, `reason`, and `timestamp` fields. The system denies by default when `verified` is false.
- **Non-overridable parameters** — Security-critical MINDFORGE.md settings cannot be overridden by project-level or session-level configuration.
- **CSP headers on dashboard** — Content Security Policy headers prevent XSS in the dashboard UI.
- **Localhost-only binding** — The dashboard server binds to `127.0.0.1` only. It is not accessible from the network.

### Supply Chain

- **Zero native dependencies** — The removal of `better-sqlite3` eliminates the entire native compilation toolchain (node-gyp, Python, C++ compiler) from the install process, reducing the attack surface.
- **Dependabot enabled** — Automated weekly scans for vulnerable npm dependencies and monthly GitHub Actions version updates.
- **CODEOWNERS enforcement** — Changes to `bin/governance/`, `bin/engine/`, and the SDK require review from designated security owners.
- **.npmignore** — Prevents accidental publication of secrets, test fixtures, planning state, and intelligence logs.

---

## Security Hardening Checklist (for Contributors)

Before submitting code that touches security-sensitive paths:

- [ ] No hardcoded secrets, tokens, or API keys in code or config
- [ ] All user inputs validated before processing
- [ ] SQL queries use bound parameters (never string concatenation)
- [ ] File path inputs validated and contained within expected directories
- [ ] External process invocations use argument arrays (no shell)
- [ ] Authentication checks present on all mutating endpoints
- [ ] Error messages do not leak internal paths or stack traces to clients
- [ ] Audit log entries include the action for traceability
- [ ] Tests cover the security-relevant behavior (positive and negative cases)

---

## Agentic-Harness Threat Model

This document covers application/code vulnerabilities. The **outward** harness threat
model — prompt injection, poisoned project config / hooks / MCP, supply-chain risk in
skills/agents, the lethal trifecta, sandboxing, and the autonomous-agent minimum-bar
checklist — lives in **[MINDFORGE-AGENTIC-SECURITY.md](./MINDFORGE-AGENTIC-SECURITY.md)**.
Both are required reading before running MindForge autonomously.

Minimum bar (see that doc for detail): separate agent identities · short-lived scoped
creds · sandbox untrusted work · deny egress by default · `permissions.deny` on
secret-bearing paths · sanitize foreign content · human approval for shell/egress/deploy
(TrustGate + Tier-3) · log tool calls (AUDIT.jsonl) · process-group kill + heartbeat ·
narrow disposable memory · scan skills/hooks/MCP/agents as supply-chain artifacts.

---

## Known Mitigations & Limitations

- **ZK-proofs are simulated** — The Dilithium-5 / ZK-proof layer uses cryptographic simulation, not hardware-backed TEEs. It provides logical governance enforcement, not hardware-grade isolation.
- **Dashboard is localhost-only** — The dashboard is designed for local development. Do not expose it to the public internet, even behind a reverse proxy, without adding additional authentication.
- **ZTAI keys are ephemeral** — Agent identity keys are generated per-session via `crypto.randomBytes()`. In production deployments requiring persistent hardware-bound keys, integrate with your organization's HSM or secure enclave.
- **Rate limiting is per-process** — The 100 req/min limit is tracked in-memory. Restarting the dashboard resets counters. For distributed deployments, add an external rate limiter (e.g., nginx, Cloudflare).

---

## Contact

For security questions that are not vulnerability reports, open a GitHub Discussion with the "security" label.
