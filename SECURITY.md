# Security Policy

## Supported Versions

| Version | Status | Support Level |
|---------|--------|---------------|
| 10.x | **Current** | Full security and feature updates |
| 9.x | Maintenance | Critical security patches only (until 2026-08-31) |
| 8.x | End of Life | No further updates |
| 7.x and below | End of Life | No further updates |

We recommend all users upgrade to the latest 10.x release. Security patches for 9.x will be provided for critical vulnerabilities only, on a best-effort basis, until August 2026.

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

## Security Features (v10.0.1)

### Authentication & Authorization

- **Bearer token auth on dashboard** — All mutating endpoints (`/api/steering`, `/api/approve`, SSE control) require `Authorization: Bearer <token>`. Token is sourced from `MINDFORGE_DASHBOARD_TOKEN` environment variable.
- **Browser daemon authentication** — The `/evaluate` endpoint requires auth before executing code in the Playwright context.
- **ZTAI Trust Tiers** — 4-tier authorization model (Tier 0-3) controls which agents can perform which actions. Tier 3 (catastrophic-risk) operations require explicit human approval.

### Audit & Integrity

- **Merkle-chain audit log** — Every entry in `AUDIT.jsonl` includes a SHA-256 hash of the previous entry. Tampering with any historical entry breaks the chain, making modifications detectable.
- **AuditWriter with buffered writes** — Atomic append operations prevent partial writes from corrupting the log.
- **npm provenance** — Published packages include SLSA Build Level 2 attestation via `--provenance`, proving the package was built from the stated source commit in CI.

### Input Validation & Injection Prevention

- **Parameterized SQL queries** — All VectorHub queries use bound parameters. No string concatenation of user input into SQL.
- **Path traversal prevention** — The temporal API validates `auditId` against `[a-zA-Z0-9_-]` and verifies resolved paths remain within the expected directory.
- **No shell interpretation** — Commands that invoke external processes use argument arrays, never shell string interpolation.
- **Structured action allowlist** — Autonomous actions are validated against an explicit permit list (replaces the previous regex blocklist that was prone to bypass).

### Governance & Policy

- **Fail-closed ZK verification** — `verifyZKProof()` throws on invalid or missing proofs. The system denies by default.
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

## Known Mitigations & Limitations

- **ZK-proofs are simulated** — The Dilithium-5 / ZK-proof layer uses cryptographic simulation, not hardware-backed TEEs. It provides logical governance enforcement, not hardware-grade isolation.
- **Dashboard is localhost-only** — The dashboard is designed for local development. Do not expose it to the public internet, even behind a reverse proxy, without adding additional authentication.
- **ZTAI keys are file-based** — Agent identity keys are stored on disk. In production deployments requiring hardware-bound keys, integrate with your organization's HSM or secure enclave.

---

## Contact

For security questions that are not vulnerability reports, open a GitHub Discussion with the "security" label.
