# MindForge — Enterprise Agentic Framework (v2.1.1)

MindForge turns Claude Code and Antigravity into production-grade engineering
partners with governance, observability, and a disciplined workflow engine.
Release published: v2.1.1.

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
- **Real-time Dashboard** — web-based observability and governance (v2)
- **Browser Runtime** — headful/headless visual QA and sessions (v2)
- **Multi-Model Intelligence** — dynamic routing, adversarial reviews, and deep research (v2)
- **Persistent Knowledge Graph** — long-term memory across all engineering sessions (v2)
- **Self-Building Skills** — automatically capture knowledge from any source into reusable skills (v2)
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


### Cursor

```bash
npx mindforge-cc@latest --cursor --local
```


### Gemini CLI

```bash
npx mindforge-cc@latest --gemini --global
```


### GitHub Copilot

```bash
npx mindforge-cc@latest --copilot --local
```


### OpenCode

```bash
npx mindforge-cc@latest --opencode --global
```


### Specific Runtime (Universal)

```bash
npx mindforge-cc@latest --runtime <name>
```


### Multiple runtimes

```bash
npx mindforge-cc@latest --runtime claude,cursor --local
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
/mindforge:do I want to plan the next phase
/mindforge:plan-phase 1
```

---


## Core workflow

```bash
/mindforge:init-project
    → Requirements interview
    → Creates PROJECT.md, REQUIREMENTS.md, STATE.md

/mindforge:do <text>
    → Smart natural language dispatcher (v2)

/mindforge:note <text>
    → Zero-friction idea capture and todo promotion (v2)

/mindforge:ui-phase 1
    → Create UI design contract (UI-SPEC.md) (v2)

/mindforge:plan-phase 1
    → Discuss scope and decisions
    → Research domain (parallel)
    → Create atomic XML task plans

/mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/mindforge:ui-review 1
    → Retroactive 6-pillar visual audit (v2)

/mindforge:validate-phase 1
    → Requirement coverage and test gap audit (v2)

/mindforge:session-report
    → Automated post-session stakeholder summary (v2)

/mindforge:add-backlog <desc>
    → Park ideas in 999.x "parking lot" (v2)

/mindforge:review-backlog
    → Review and promote backlog items (v2)

/mindforge:plant-seed <idea>
    → Capture speculative ideas with triggers (v2)

/mindforge:workstreams
    → Parallel feature tracks with isolated state (v2)

/mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/mindforge:verify-phase 1
    → Human acceptance testing
    → Debug agent on failures
    → UAT sign-off

/mindforge:ship 1
    → Changelog generation
    → Final quality gates
    → PR creation

/mindforge:auto --phase 1
    → Walk-away autonomous execution (v2)
    → Intelligent stuck detection and node repair
    → External steering via steering-queue

/mindforge:qa
    → Systematic visual verification of UI changes (v2)
    → Automated regression test generation
    → Persistent browser sessions and daemon

/mindforge:cross-review
    → Adversarial multi-model code review and synthesis (v2)
    → Consensus detection and severity normalization

/mindforge:research
    → Deep research using Gemini 1.5 Pro 1M context (v2)
    → Codebase-wide context packaging and SSRF protection

/mindforge:costs
    → Real-time token usage and cost profiling (v2)
    → Daily budget tracking across all providers

/mindforge:remember
    → Manual knowledge management and search (v2)
    → Persistent knowledge graph retrieval and promotion

/mindforge:dashboard
    → Real-time web observability and governance at localhost:7339 (v2)
    → Live audit logs, metrics, activity, and team feed

/mindforge:learn
    → Automatically capture skills from Docs, Sessions, or npm (v2)
    → 7-dimension quality scoring and injection protection

/mindforge:marketplace
    → Search, install, and publish community skills (v2)
    → Verified installation via npm-based registry

/mindforge:new-runtime
    → Scaffold custom runtime configurations for any AI agent (v2)
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

## What's new in v2.1.1
- **Unified 4-Pillar Workflow**: `plan`, `execute`, `verify`, `ship` now hardened with `.agent/` structural integrity.
- **Expanded Persona Ecosystem**: 32+ specialized engineering personas integrated from the GSD core.
- **Real-time Dashboard**: `/mindforge:dashboard` and high-performance web-based observability.
- **Persistent Knowledge Graph**: `/mindforge:remember` and long-term project memory.
- **Multi-Model Intelligence Layer**: `/mindforge:cross-review`, `/mindforge:research`, and `/mindforge:costs`.
- **Visual QA Engine**: `/mindforge:qa` and automated regression test generation.
- **Persistent Browser Runtime**: `/mindforge:browse` and Playwright-powered Chromium daemon.
- **Autonomous Execution Engine**: `/mindforge:auto` and mid-execution `/mindforge:steer`.
- **Unified Skills Registry**: 3-tier registry (Core/Org/Project) with 12 core skill packs.
- **120+ Framework Assets**: Standardized directory structure for cross-IDE compatibility.
- **Enterprise Manifest**: `file-manifest.json` for multi-project codebase mapping.
- **Enterprise Integrations**: Jira, Confluence, Slack, GitHub, GitLab.
- **Governance Pillars**: 6 non-bypassable compliance gates and Tier 3 security scaffolding.

---

## Security
MindForge never stores credentials in files. Review:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

---

## License
MIT
