# 🚀 MindForge CI/CD Architecture

MindForge v2 uses a modular, enterprise-grade GitHub Actions system designed for agentic workflows, security-first compliance, and observability.

## 🏗️ Workflow Overview

| Workflow | Trigger | Description |
| --- | --- | --- |
| **MindForge Core CI** | Push / PR | Health check, Linting, Testing, Security Scanning, and Governance Gates. |
| **MindForge AI Review** | Pull Request | Cross-model architectural review (Claude + GPT-4o). |
| **MindForge Autonomous** | Manual / Schedule | Headless execution for autonomous agents to complete phases. |
| **MindForge Release** | Version Tag (`v*`) | Automated push to npm and creation of GitHub Releases. |
| **MindForge Observability** | Post-CI | Resource usage tracking and session quality analysis. |

---

## ⚖️ Governance & Compliance

MindForge enforces **Tier 3 (Block-by-Design)** governance. If a PR touches sensitive components:

- **Auth Systems**
- **Payment Rails**
- **PII / Sensitive Data**

The `mindforge-ci` workflow will **FAIL** immediately with a "Governance Block".

### To Resolve a Block

1. Review the pending approval in `.planning/approvals/`.
2. Run `/mindforge:approve [id]` within the MindForge environment.
3. Commit the resulting approval signature and push again.

---

## 🛡️ Security Gates

The CI pipeline includes non-bypassable security checks:

1. **Secret Detection**: Scans for API keys, tokens, and private keys.
2. **Dependency Audit**: `npm audit` is configured to fail on `high` or `critical` vulnerabilities.
3. **OWASP Compliance**: Automated security scans via `node bin/validate-config.js --security`.

---

## 🤖 AI Code Review

When a PR is opened, MindForge triggers a cross-model review:

- **Primary**: Claude-3-5-Sonnet (Architectural alignment).
- **Adversarial**: GPT-4o (Edge case detection & security).

Findings are posted as a summary comment on the PR and listed in detailed artifacts (`CODE-REVIEW.md`).

---

## 📦 Automated Releases

Releases are triggered by pushing a semver tag:

```bash
git tag v2.0.0
git push origin v2.0.0
```

This will automatically:

- Run the full test suite.
- Generate a CHANGELOG.
- Publish to npm.
- Create a GitHub Release with build artifacts.

---

## 📊 Observability

After every CI run, metrics are collected and stored:
- **Token Usage**: Tracked per session.
- **Success Rate**: Phase completion percentage.
- **Audit Logs**: Full trace available in `.planning/AUDIT.jsonl`.
