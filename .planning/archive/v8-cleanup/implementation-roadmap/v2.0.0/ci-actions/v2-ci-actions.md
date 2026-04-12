# 🧠 MindForge Day 10 — GitHub Actions + Workflow System (Enterprise Grade)

## Context

You are working on **MindForge v2.0.0**, an enterprise-grade agentic framework with:

* Autonomous execution engine (`/mindforge:auto`)
* Multi-model intelligence layer (Claude, GPT-4o, Gemini)
* CI/CD integration with governance gates
* Skills system, audit logs, and compliance enforcement

Your task is to design and implement a **production-grade GitHub Actions system** that aligns with:

* Enterprise CI/CD standards
* Agentic workflow orchestration
* Security-first pipelines
* Observability + failure-first design

---

## 🎯 Objective

Design a **modular, scalable GitHub Actions architecture** that supports:

1. Continuous Integration (CI)
2. Autonomous Agent Execution (Headless Mode)
3. Cross-Model Code Review
4. Security + Compliance Gates (non-bypassable)
5. Release + Distribution pipeline (npm + GitHub Releases)
6. Observability + Debuggability

---

## 🏗️ Required Workflows (MANDATORY)

Create the following workflows inside `.github/workflows/`:

---

### 1. `mindforge-ci.yml` (Core CI Pipeline)

Trigger:

* `push` to `main`, `develop`
* `pull_request`

Jobs:

#### Job 1 — Setup & Cache

* Node.js setup (v18+)
* Cache npm dependencies
* Install dependencies

#### Job 2 — Health Check

* Run: `/mindforge:health --repair`
* Validate:

  * HANDOFF.json schema
  * MINDFORGE.md config
  * Required directories exist

#### Job 3 — Code Quality

* TypeScript compile (`tsc`)
* ESLint
* Prettier check
* Fail on any issue

#### Job 4 — Testing

* Unit tests
* Integration tests
* Coverage enforcement (>= MIN_TEST_COVERAGE_PCT)

#### Job 5 — Security Scan (NON-BYPASSABLE)

* Secret detection
* Dependency audit (`npm audit`)
* OWASP checks via `/mindforge:security-scan`
* ❗ If CRITICAL → FAIL pipeline immediately

#### Job 6 — Governance Gate

* Run compliance gates:

  * No secrets
  * No CRITICAL vulnerabilities
  * GDPR checks (PII detection)
* ❗ Tier 3 changes MUST fail without approval

---

### 2. `mindforge-ai-review.yml` (Cross-Model Review)

Trigger:

* Pull Requests only

Jobs:

#### AI Review Job

* Run `/mindforge:pr-review`
* Run `/mindforge:cross-review --models claude,gpt4o`
* Generate:

  * CODE-REVIEW.md
  * CROSS-REVIEW.md

Post results as:

* PR comment
* GitHub annotations

Constraints:

* Respect daily token limits
* Cache results per commit SHA

---

### 3. `mindforge-autonomous.yml` (Headless Execution)

Trigger:

* Manual (`workflow_dispatch`)
* Scheduled (cron)

Inputs:

* phase number
* timeout
* dry-run flag

Steps:

* Run:

```bash
mindforge-cc headless --phase $PHASE --timeout $TIMEOUT --output json
```

Outputs:

* Structured JSON result
* Upload artifacts:

  * HANDOFF.json
  * AUDIT.jsonl
  * AUTONOMOUS-REPORT.md

Failure Handling:

* If partial → mark as warning
* If critical failure → fail job

---

### 4. `mindforge-release.yml` (Release Pipeline)

Trigger:

* Tag push (`v*`)

Steps:

1. Validate version consistency
2. Run full CI pipeline
3. Generate CHANGELOG
4. Build package
5. Publish to npm
6. Create GitHub Release
7. Attach artifacts
8. Notify Slack (if configured)

---

### 5. `mindforge-observability.yml` (Advanced)

Trigger:

* Always-on (post CI)

Responsibilities:

* Upload metrics:

  * session-quality.jsonl
  * token-usage.jsonl
* Generate summary:

  * success rate
  * failure patterns
* Store as artifacts

---

## ⚙️ Advanced Design Requirements

### 1. Pipeline Architecture

* Use **job dependencies (needs:)**
* Parallelize where possible
* Fail fast on critical stages

### 2. Security First

* Secrets via GitHub Secrets ONLY
* No credentials in logs
* Mask all sensitive output

### 3. Caching Strategy

* Node modules cache
* AI review cache (commit SHA)
* Skill registry cache

### 4. Observability

* Use GitHub Step Summary
* Upload logs as artifacts
* Structured JSON outputs

### 5. Failure Handling

* Exit code 0 for timeout (resume later)
* Exit code 1 for real failures
* Retry transient failures (3 attempts)

---

## 🧠 Integration with MindForge Core

Ensure workflows integrate with:

* `.planning/HANDOFF.json`
* `.planning/AUDIT.jsonl`
* `/mindforge:auto`
* `/mindforge:review`
* `/mindforge:security-scan`

---

## 📦 Deliverables

1. Full `.github/workflows/*.yml` files
2. Reusable composite GitHub Actions (if needed)
3. CI configuration in `MINDFORGE.md`
4. Documentation:

   * docs/ci-cd.md
   * pipeline architecture diagram

---

## 🚀 Bonus (HIGH PRIORITY)

* Add **matrix builds** (Node versions)
* Add **self-healing retry logic**
* Add **artifact versioning**
* Add **PR status checks integration**
* Add **branch protection compatibility**

---

## 🧪 Testing

* Simulate:

  * PR with security issue
  * PR with Tier 3 change
  * Autonomous execution
* Ensure:

  * Correct failures
  * Proper logs
  * No silent errors

---

## 🔥 Final Goal

This pipeline should:

* Match or exceed enterprise CI/CD systems (Amazon / Stripe level)
* Fully support agentic workflows
* Be scalable, observable, and secure
* Enable autonomous development safely

---
