# MindForge 5-Layer Plane Architecture (CI/CD)

MindForge v10.0.0 uses a sophisticated Control + Execution Plane architecture for its GitHub Actions, ensuring enterprise-grade governance and autonomous execution capabilities.

## 🏗️ The 5 Planes

| Plane | Purpose | Trigger |
| --- | --- | --- |
| **Control Plane** | Change classification & Routing | `push`, `pull_request` |
| **Execution Plane** | Headless agent runtime | `workflow_call` |
| **AI Intelligence** | Multi-model code validation | PRs (reusable) |
| **Release Plane** | Packaging & Deployment | Tags (`v*`) |
| **Observability** | Run metrics & Analytics | Post-run |

---

## 🔄 PR Workflow Lifecycle

When you open or update a Pull Request, MindForge triggers the following "Enterprise" sequence:

1. **🔍 Classify**: Analyzes diffs to assign a **Governance Tier (1, 2, or 3)**.
2. **⚖️ Govern**:
    - **Tier 3 Enforcement**: Blocks the PR if sensitive changes are detected without an approval file.
    - **Security Scan**: Automatically validates `MINDFORGE.md` and project configurations.
3. **⚡ Execute**:
    - Runs **Headless Agent** to verify autonomous logic.
    - Executes full **Test Suite** and **Linter**.
4. **🤖 Review**:
    - Triggers **AI Intelligence Layer** (Claude + GPT-4o).
    - Posts architectural/security findings as a **PR Comment**.
5. **📊 Observe**: Generates a performance and audit trace report.

---

## 🔍 Control Plane & Tiers

Every change is automatically classified into a governance tier:

- **Tier 1 (Trivial)**: Auto-approves and executes basic verification.
- **Tier 2 (Logic)**: Executes full test suites and AI review.
- **Tier 3 (Sensitive)**: Blocks the pipeline unless a manual approval is found in `.planning/approvals/`.

---

## 🛠️ MindForge CLI (`bin/mindforge-cli.js`)

All planes interact with MindForge via a centralized CLI router:

- `health`: Validates project integrity.
- `security-scan`: Scans for secrets and PII.
- `headless`: Executes agents in non-interactive mode.
- `pr-review`: Standard code review.
- `cross-review`: Multi-model architecture validation.

---

## 🛡️ Governance Enforcement

If a PR touches sensitive components (Auth, Payments, Security):
1. The **Control Plane** identifies it as **Tier 3**.
2. The **Governance Gate** fails unless a valid `.planning/approvals/*.json` file exists.
3. Once approved, the **Execution Plane** resumes the workflow.



---

## 📦 Automated Releases

Releases are triggered by pushing a semver tag:

```bash
git tag v10.0.0
git push origin v10.0.0
```

This will automatically:

- Run the full test suite across Node 18, 20, and 22.
- Generate a CHANGELOG.
- Publish to npm with provenance attestation.
- Create a GitHub Release with build artifacts.

> **Dependabot** is enabled for automated dependency updates. **npm provenance** ensures every published package is cryptographically linked to its source commit and CI run.

---

## 📊 Observability

MindForge tracks every CI execution:

- **Success Rate**: Phase completion status.
- **Token Usage**: AI cost monitoring.
- **Audit Trace**: Full execution history in `AUDIT.jsonl`.
