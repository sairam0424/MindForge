# MindForge

**An agentic intelligence framework for Claude Code** — orchestrates multi-agent workflows with governance, memory, and autonomous execution. Production-hardened with true parallelism, streaming SDK, and zero-trust security. Install once, get structured AI-driven development with built-in quality gates.

---

## Latest release

**v11.9.2** (2026-08-16) — Correctness: the config gate can now fail, the audit chain no longer
forks under concurrent writers, trace retrieval works, and the cost ledger has one record shape.
**Contains a breaking change to the dashboard HTTP surface** (loopback-only) — see the BREAKING
section in [CHANGELOG.md](./CHANGELOG.md), or [RELEASENOTES.md](./RELEASENOTES.md) for
human-readable notes.

---

## What is actually enforced

Read this before the install instructions. MindForge ships a large corpus of agent
instructions — commands, skills, personas, protocols — and those are advisory: they work by
being in the model's context, and a model can decline them. The parts that would *block* an
action are hooks, and **no install channel currently registers them.**

| Capability | Plugin channel | `npx` channel |
|---|---|---|
| Slash commands | Yes | Yes |
| Skills / personas / protocol docs | Yes | Yes |
| Subagents | Yes | Yes |
| Audit hash-chain (`bin/verify-audit.js`) | Yes | Yes |
| **Hooks enforced (can block a tool call)** | **No** | **No** |

Why, specifically:

- **No hook configuration ships, and nothing generates one.** `package.json` `files[]` has 47
  entries and none contains `settings`, so neither `.claude/settings.json` nor
  `.agent/settings.json` is published. All references to those paths in `bin/` are reads or
  metadata strings — there is no code that writes or merges one. `bin/harness-audit.js:335`
  even offers "wire trust-gate + block-no-verify into both …" as a *fix suggestion*, auditing a
  wiring nothing creates.
- **The plugin channel's hooks additionally crash when fired.**
  `plugins/mindforge/scripts/run-with-flags.js:24` requires `./lib/hook-flags`, and
  `plugins/mindforge/scripts/lib/` does not exist in the published plugin. Running the
  dispatcher gives `Error: Cannot find module './lib/hook-flags'` and exit 1. The module it
  needs does exist at `.agent/hooks/lib/hook-flags.js`; it was never copied in.

So treat MindForge as **governance-by-convention plus a tamper-evident audit log**, not as a
policy enforcement point. Installing it also expands your repository's trust boundary by a large
volume of agent instructions — review what you install. Making hook registration real per
harness is the headline goal of v12; the audit chain is genuinely verifiable today
(`node bin/verify-audit.js`).

---

## Install

Claude Code plugin marketplace (no project files written). **Note:** the plugin's hooks do not
fire — see *What is actually enforced* above. Slash commands, skills and subagents do work.

```bash
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

Or the full framework engine via `npx` (writes `.mindforge/` governance, memory, and planning into your project):

```bash
npx mindforge-cc@latest --claude --local
```

All install channels (global, local, Antigravity, Cursor, Copilot, Gemini CLI, MCP server, combined runtimes, `--minimal`): see [docs/getting-started.md](docs/getting-started.md).

**Upgrading from 11.9.x?** The installer does not overwrite an existing
`.mindforge/MINDFORGE-SCHEMA.json`, so 11.9.2's armed config validator keeps the older
permissive schema on a plain upgrade. Run with `--force` if you want the stricter gate. The
daily cost cap declared as `[COST_HARD_LIMIT_USD]` in `MINDFORGE.md` was **not enforced** in
11.9.2; 11.9.3 arms it. An upgrade never rewrites an existing `MINDFORGE.md`, so if yours
predates the key the cap stays off — add `[COST_HARD_LIMIT_USD] = 25.00` to turn it on.

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
