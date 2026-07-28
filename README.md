# MindForge

**An agentic intelligence framework for Claude Code** — orchestrates multi-agent workflows with governance, memory, and autonomous execution. Production-hardened with true parallelism, streaming SDK, and zero-trust security. Install once, get structured AI-driven development with built-in quality gates.

---

## Latest release

**v11.9.0** (2026-07-27) — Bedrock provider + full dry-run audit. See [CHANGELOG.md](./CHANGELOG.md) for full history, or [RELEASENOTES.md](./RELEASENOTES.md) for human-readable notes.

---

## Install

Fastest path — Claude Code plugin marketplace (no project files written):

```bash
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

Or the full framework engine via `npx` (writes `.mindforge/` governance, memory, and planning into your project):

```bash
npx mindforge-cc@latest --claude --local
```

All install channels (global, local, Antigravity, Cursor, Copilot, Gemini CLI, MCP server, combined runtimes, `--minimal`): see [docs/getting-started.md](docs/getting-started.md).

---

## Verify

```bash
/mindforge:health              # framework + installation health check
/mindforge:health --repair     # fix anything the health check flags
/mindforge:status              # project status snapshot
/mindforge:next                # auto-discover your first task
```

Full verification walkthrough: [docs/quick-verify.md](docs/quick-verify.md).

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

## Documentation

- **User Guide:** [docs/user-guide.md](docs/user-guide.md)
- **Getting started:** [docs/getting-started.md](docs/getting-started.md)
- **Quick verify:** [docs/quick-verify.md](docs/quick-verify.md)
- **Troubleshooting:** [docs/troubleshooting.md](docs/troubleshooting.md)
- **FAQ:** [docs/faq.md](docs/faq.md)
- **Full tutorial:** [docs/tutorial.md](docs/tutorial.md)
- **Commands reference (full):** [docs/commands-reference.md](docs/commands-reference.md)
- **Commands (quick):** [docs/References/commands.md](docs/References/commands.md)
- **Config reference:** [docs/References/config-reference.md](docs/References/config-reference.md)
- **SDK:** [docs/References/sdk-api.md](docs/References/sdk-api.md)
- **Skills:** [docs/References/skills-api.md](docs/References/skills-api.md)
- **Audit events:** [docs/References/audit-events.md](docs/References/audit-events.md)
- **Upgrade guide:** [docs/upgrade.md](docs/upgrade.md)
- **Workflow atlas:** [docs/workflow-atlas.md](docs/workflow-atlas.md)
- **Security:** [docs/security/SECURITY.md](docs/security/SECURITY.md) (MindForge never stores credentials in files)
- **Threat model:** [docs/security/threat-model.md](docs/security/threat-model.md)
- **Architecture:** [docs/architecture/README.md](docs/architecture/README.md)
- **Contributing:** [docs/contributing/CONTRIBUTING.md](docs/contributing/CONTRIBUTING.md)
- **Release notes:** [RELEASENOTES.md](RELEASENOTES.md)
- **CI quickstart:** [docs/ci-quickstart.md](docs/ci-quickstart.md)
- **Requirements:** [docs/requirements.md](docs/requirements.md)
- **Release checklist guide:** [docs/release-checklist-guide.md](docs/release-checklist-guide.md)
- **USPs and features:** [docs/usp-features.md](docs/usp-features.md)

---

## Core workflow

| Command | What it does |
| :--- | :--- |
| `/mindforge:init-project` | Requirements interview → creates `PROJECT.md`, `REQUIREMENTS.md`, `STATE.md` |
| `/mindforge:plan-phase 1 [--ads]` | Discuss scope, research the domain in parallel, create atomic XML task plans |
| `/mindforge:execute-phase 1` | Wave-based parallel execution, one commit per task, automated verification |
| `/mindforge:verify-phase 1` | Human acceptance testing, debug agent on failures, UAT sign-off |
| `/mindforge:ship 1` | Changelog generation, final quality gates, PR creation |
| `/mindforge:auto --phase 1` | Walk-away autonomous execution with stuck detection and steering |

Full command list: [docs/commands-reference.md](docs/commands-reference.md).

---

## Dynamic Workflow Library

35 pre-built multi-agent workflow scripts that run via Claude Code's `Workflow` tool. Each fans out concurrent agents, synthesizes results, and returns structured output across 5 tiers (Research, Dev, Ops, Intelligence, Beast).

**Discover:** `/mindforge:wf-catalog` or `node bin/mindforge-cli.js workflow list`

Full, verified 35-workflow table by tier: [docs/workflow-atlas.md](docs/workflow-atlas.md).

---

## Execution Modes

MindForge supports multiple interaction models to fit your engineering workflow:

- **In-IDE Orchestration**: Use `/mindforge:agent <persona>` for real-time delegation.
- **Enterprise Workflows**: Specialized commands like `/mindforge:wf-tdd-sprint` and `/mindforge:plan-phase`.
- **CLI Automation**: Run `node bin/mindforge-cli.js spawn <persona>` for scripted tasks.

---

## Updates and migrations

Run `/mindforge:update` (add `--apply` to install) — see [docs/upgrade.md](docs/upgrade.md) for the full upgrade guide and fallback steps.

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

## License

MIT © 2026 MindForge Team
