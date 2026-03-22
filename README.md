# MindForge — Enterprise Agentic Framework (v2.0.0-alpha.4)

MindForge turns Claude Code and Antigravity into production-grade engineering
partners with governance, observability, and a disciplined workflow engine.
Release published: v1.0.0 (GitHub Releases).

```bash
npx mindforge-cc@latest
```

---

## Why MindForge
AI coding agents degrade over long sessions. Context fills up. Quality drops.
Decisions get forgotten. MindForge fixes that with:

- **Context engineering** — structured project state, always current
- **Role personas** — specialised agent modes for each task type
- **Skills** — just-in-time domain knowledge loaded on demand
- **Wave execution** — parallelism with dependency safety
- **Autonomous Engine** — walk-away execution with steerability (v2)
- **Browser Runtime** — headful/headless visual QA and sessions (v2)
- **Multi-Model Intelligence** — dynamic routing, adversarial reviews, and deep research (v2)
- **Persistent Knowledge Graph** — long-term memory across all engineering sessions (v2)
- **Quality gates** — compliance and security are non-bypassable
- **Audit trail** — append-only history of every action

---

## Install

### Claude Code (global)
```bash
npx mindforge-cc@latest --claude --global
```

### Claude Code (local)
```bash
npx mindforge-cc@latest --claude --local
```

### Quick Start

```bash
# Install the latest stable version
npm install -g mindforge-cc

# Or try the v2.0.0-alpha (latest features)
npm install -g mindforge-cc@alpha
```

### Antigravity
```bash
npx mindforge-cc@latest --antigravity --global
```

Local installs use `agents/` by default. Legacy `.agent/` is supported for existing projects.

Optional: add bin utilities on local install
```bash
npx mindforge-cc@latest --claude --local --with-utils
```

Optional: minimal project scaffolding
```bash
npx mindforge-cc@latest --claude --local --minimal
```

### Both runtimes
```bash
npx mindforge-cc@latest --all --global
```

---

## Verify
Open Claude Code or Antigravity in your project directory and run:
```bash
/mindforge:health
```

If issues are found, run:
```bash
/mindforge:health --repair
```

---

## Quick start (new project)
```bash
/mindforge:init-project
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```

## Quick start (existing codebase)
```bash
/mindforge:map-codebase
/mindforge:plan-phase 1
```

---

## Core workflow
```bash
/ mindforge:init-project
    → Requirements interview
    → Creates PROJECT.md, REQUIREMENTS.md, STATE.md

/ mindforge:plan-phase 1
    → Discuss scope and decisions
    → Research domain (parallel)
    → Create atomic XML task plans

/ mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/ mindforge:verify-phase 1
    → Human acceptance testing
    → Debug agent on failures
    → UAT sign-off

/ mindforge:ship 1
    → Changelog generation
    → Final quality gates
    → PR creation

/ mindforge:auto --phase 1
    → Walk-away autonomous execution (v2)
    → Intelligent stuck detection and node repair
    → External steering via steering-queue

/ mindforge:qa
    → Systematic visual verification of UI changes (v2)
    → Automated regression test generation
    → Persistent browser sessions and daemon

/ mindforge:cross-review
    → Adversarial multi-model code review and synthesis (v2)
    → Consensus detection and severity normalization

/ mindforge:research
    → Deep research using Gemini 1.5 Pro 1M context (v2)
    → Codebase-wide context packaging and SSRF protection

/ mindforge:costs
    → Real-time token usage and cost profiling (v2)
    → Daily budget tracking across all providers

/ mindforge:remember
    → Manual knowledge management and search (v2)
    → Persistent knowledge graph retrieval and promotion
```

---

## Updates and migrations
```bash
/mindforge:update
/mindforge:update --apply
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

---

## Plugin system (v1.0.0)
Plugins extend MindForge via the `mindforge-plugin-*` namespace.

```
/mindforge:plugins list
/mindforge:plugins install mindforge-plugin-<name>
/mindforge:plugins validate
```

---

## Token usage profiling
```
/mindforge:tokens --profile
```
See `.mindforge/production/token-optimiser.md`.

---

## Documentation
- **User Guide:** `docs/user-guide.md`
- **Troubleshooting:** `docs/troubleshooting.md`
- **CI Quickstart:** `docs/ci-quickstart.md`
- **Requirements:** `docs/requirements.md`
- **Quick verify:** `docs/quick-verify.md`
- **Upgrade guide:** `docs/upgrade.md`
- **FAQ:** `docs/faq.md`
- **Release notes:** `RELEASENOTES.md`
- **Release checklist guide:** `docs/release-checklist-guide.md`
- **USPs and features:** `docs/usp-features.md`
- **Full tutorial:** `docs/tutorial.md`
- **Commands:** `docs/reference/commands.md`
- **Config reference:** `docs/reference/config-reference.md`
- **SDK:** `docs/reference/sdk-api.md`
- **Skills:** `docs/reference/skills-api.md`
- **Audit events:** `docs/reference/audit-events.md`
- **Security:** `docs/security/SECURITY.md`
- **Threat model:** `docs/security/threat-model.md`
- **Architecture:** `docs/architecture/README.md`
- **Contributing:** `docs/contributing/CONTRIBUTING.md`

---

## What ships in v2.0.0-alpha.4
- **Persistent Knowledge Graph**: `/mindforge:remember` and long-term memory engine.
- **Multi-Model Intelligence Layer**: `/mindforge:cross-review`, `/mindforge:research`, and `/mindforge:costs`.
- **Visual QA Engine**: `/mindforge:qa` and automated regression tests.
- **Persistent Browser Runtime**: `/mindforge:browse` and Playwright integration.
- **Autonomous Execution Engine**: `/mindforge:auto` and `/mindforge:steer`.
- 48+ commands across 10 workflow categories.
- 12 core skill packs with a three-tier registry.
- 8 specialised agent personas.
- Wave-based execution with dependency graph and compaction.
- Enterprise integrations: Jira, Confluence, Slack, GitHub, GitLab.
- Three-tier governance with 6 non-bypassable compliance gates.
- Intelligence layer: health engine, difficulty scoring, anti-pattern detection.
- Public skills registry and plugin system.
- @mindforge/sdk with event stream and command builders.
- 20 test suites, production checklist, and 32 ADRs.

---

## Security
MindForge never stores credentials in files. Review:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

---

## License
MIT
