# MindForge — Enterprise Agentic Framework (v1.0.0)

MindForge turns Claude Code and Antigravity into production-grade engineering
partners with governance, observability, and a disciplined workflow engine.

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

### Antigravity
```bash
npx mindforge-cc@latest --antigravity --global
```

### Both runtimes
```bash
npx mindforge-cc@latest --all --global
```

---

## Verify
Open Claude Code or Antigravity in your project directory and run:
```
/mindforge:health
```
If issues are found, run:
```
/mindforge:health --repair
```

---

## Quick start (new project)
```
/mindforge:init-project
/mindforge:plan-phase 1
/mindforge:execute-phase 1
/mindforge:verify-phase 1
/mindforge:ship 1
```

## Quick start (existing codebase)
```
/mindforge:map-codebase
/mindforge:plan-phase 1
```

---

## Core workflow
```
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
```

---

## Updates and migrations
```
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
- **Release checklist guide:** `docs/release-checklist-guide.md`
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

## What ships in v1.0.0
- 36 commands across 7 workflow categories
- 10 core skill packs with a three-tier registry (Core/Org/Project)
- 8 specialised agent personas
- Wave-based execution with dependency graph and compaction
- Enterprise integrations: Jira, Confluence, Slack, GitHub, GitLab
- Three-tier governance with 5 non-bypassable compliance gates
- Intelligence layer: health engine, difficulty scoring, anti-pattern detection
- Public skills registry and plugin system
- @mindforge/sdk with event stream and command builders
- 15 test suites, production checklist, and threat model

---

## Security
MindForge never stores credentials in files. Review:
- `docs/security/SECURITY.md`
- `docs/security/threat-model.md`

---

## License
MIT
