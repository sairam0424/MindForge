# 🗺️ MindForge Workflow Atlas

This document classifies every workflow and action in the MindForge `.github/` directory, explaining their triggers, roles, and governance tiers.

---

## 🏗️ The 5-Layer Plane Architecture (v2.0.0 — Recommended)

These workflows form the modular "Enterprise" architecture implemented for enterprise-grade autonomy.

### 1. Control Plane (`control-plane.yml`)
- **Primary Trigger**: `push` or `pull_request` to `main` or `develop`.
- **Role**: The Central Nervous System. It runs the `change-classifier.js` to assign a **Governance Tier (1-3)**. It enforces security gates and routes execution to other planes.
- **Priority**: High. This is the non-bypassable entry point.

### 2. Execution Plane (`execution-plane.yml`)
- **Primary Trigger**: `workflow_call` (Exclusively invoked by the Control Plane).
- **Role**: The Muscle. It handles the environment setup, project health checks (`mindforge-cli.js health`), and executes the agent in `--headless` mode.
- **Verification**: Runs `npm test` and `npm run lint`.

### 3. AI Intelligence Layer (`ai-intelligence.yml`)
- **Primary Trigger**: `workflow_call` (Invoked by Control Plane specifically on Pull Requests).
- **Role**: The Brain. Performs adversarial code reviews using **Claude** and **GPT-4o**. Posts a combined architectural review as a PR comment.

### 4. Release Plane (`release-plane.yml`)
- **Primary Trigger**: `push` of a version tag (e.g., `git push origin v1.2.3`).
- **Role**: The Logistics. Automates building the package, publishing to **npm**, and drafting a GitHub Release with changelogs.

### 5. Observability Plane (`observability-plane.yml`)
- **Primary Trigger**: `workflow_run` (Auto-runs whenever the "MindForge Control Plane" completes).
- **Role**: The Memory. Collects metrics on token costs, success rates, and audit logs to generate a summary of CI effectiveness.

---

## 🏛️ Maintenance & Legacy Workflows

These are existing workflows that provide secondary check-points or manual controls.

| Workflow | Trigger | Role | Status |
| :--- | :--- | :--- | :--- |
| `mindforge-ci.yml` | `push` to `main` or `feat/**` | Basic health/test check for feature branches. | **Active** |
| `mindforge-autonomous.yml` | `schedule` (Daily) or Manual | Runs deep maintenance or long-running tasks. | **Active** |
| `mindforge-ai-review.yml` | PR Label: `needs-review` | Label-triggered deep AI review. | **Fallback** |
| `mindforge-release.yml` | Tag: `v*` | Original release script. | **Redundant** |
| `mindforge-observability.yml`| `workflow_run` of "Core CI" | Original observability collector. | **Redundant** |

---

## 🚦 Trigger Logic Summary

| Event | Workflow Triggered | Primary Action |
| :--- | :--- | :--- |
| **New PR** | `control-plane.yml` | Classify → Security Scan → AI PR Review |
| **Commit to main** | `control-plane.yml` | Governance check → Execution |
| **Push Tag (v*)** | `release-plane.yml` | Publish to npm → Create GitHub Release |
| **Manual Reset** | `mindforge-autonomous.yml` | Run /mindforge:auto on specific phase |
| **Midnight** | `mindforge-autonomous.yml` | Daily health & autonomous cleanup |
