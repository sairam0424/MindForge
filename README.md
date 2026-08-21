# MindForge

**An agentic intelligence framework for Claude Code** — orchestrates multi-agent workflows with governance, memory, and autonomous execution. Production-hardened with true parallelism, streaming SDK, and zero-trust security. Install once, get structured AI-driven development with built-in quality gates.

---

## Latest release

**v11.9.4** (2026-08-22) — Delivery: the gates register, the tarball matches its tag. 11.9.3
shipped the hook-registration code and then declined to run it: the installer skipped whenever any
ancestor directory held a `.claude`, which on a machine that has ever run Claude Code means
`~/.claude` — so essentially every install copied the enforcement in and wired none of it. Measured
against the published 11.9.3 tarball: **11 hook scripts installed, 0 registered.** On 11.9.4, the
same sandbox registers **8, with 3 deny-class hooks verified blocking** at install time. Also: the
published tarball is now reproducible from its tag (11.9.3 shipped one untracked file), and the
enforcement table below was corrected — it had been understating what ships.

**Contains a behaviour change under a patch bump**: the installer now writes
`.claude/settings.json` on projects where it previously declined, merging append-only into any
existing file and backing it up first. See the BREAKING section in
[CHANGELOG.md](./CHANGELOG.md), or [RELEASENOTES.md](./RELEASENOTES.md) for human-readable notes.

`mindforge-sdk` did **not** publish in 11.9.4 and remains at 11.8.0 — see the changelog for why.

---

## What is actually enforced

Read this before the install instructions. MindForge ships a large corpus of agent
instructions — commands, skills, personas, protocols — and those are advisory: they work by
being in the model's context, and a model can decline them. The parts that would *block* an
action are hooks. Through 11.9.2 **no channel registered them.** 11.9.3 added the registration code
but it declined to run on almost every project, so in practice nothing was enforced there either.
**As of 11.9.4** both channels register and execute them **on Claude Code**, and nowhere else.

| Capability | Plugin channel | `npx` channel |
|---|---|---|
| Slash commands | Yes | Yes |
| Skills / personas / protocol docs | Yes | Yes |
| Subagents | Yes | Yes |
| Audit hash-chain (`bin/verify-audit.js`) | Yes | Yes |
| **Hooks enforced (can block a tool call)** | **Claude Code only** | **Claude Code + `--local` only** |

What that means, measured rather than asserted:

- **The `npx` channel generates the config it never used to ship.** `files[]` has 49 entries and
  none of them contains `settings`, so no settings file is *published* — instead
  `bin/installer/hook-registration.js` writes one at install time, merging append-only into any
  file you already have. Measured on a confined install: **8 hooks registered** into
  `.claude/settings.json`, of which the installer's own preflight **executed 7 and verified all 3
  deny-class hooks returning exit 2** before keeping the file. A preflight failure rolls the
  registration back rather than leaving a config whose commands do not run.
- **The plugin channel's dispatcher runs.** It previously crashed on every fire —
  `run-with-flags.js` requires `./lib/hook-flags` and `plugins/mindforge/scripts/lib/` was not
  copied in. That directory now exists, all **14 path tokens** in
  `plugins/mindforge/hooks/hooks.json` resolve under the plugin root, and driving the dispatcher by
  hand returns **exit 2** for `mindforge-block-no-verify` and `mindforge-config-protection`.

Still **not** enforced, deliberately and with a printed reason for each: any runtime other than
Claude Code (Cursor, Copilot, Gemini/Antigravity, OpenCode), `--global` scope, a self-install
inside a MindForge checkout, and Windows. Writing a Claude-schema config into `.cursor/` without an
execution-verified hook contract would be decorative. Every outcome, including "not registered", is
printed by the installer and written to `.mindforge/hook-registration.json`.

Three things gate whether a registered hook is *live*, none of them in MindForge's control: the
harness must be **restarted** (hooks are snapshotted at session start), the project must be
**trusted** in the harness, and `CLAUDE_PROJECT_DIR` must be set with `node` on the hook PATH —
if it is not, the commands exit 1 and the gate is simply absent, which is a deliberate trade
against a fail-closed tail that was measured denying benign commands on a fresh clone. See
*Hooks are installed but nothing is blocked* in `docs/troubleshooting.md`.

So: on Claude Code, treat MindForge as a policy enforcement point for the 8 registered hooks plus
a tamper-evident audit log; on every other harness, as **governance-by-convention** plus that same
audit log. Installing it also expands your repository's trust boundary by a large volume of agent
instructions — review what you install. The audit chain is verifiable today
(`node bin/verify-audit.js`).

---

## Install

Claude Code plugin marketplace (no project files written). The plugin's hooks now fire — see
*What is actually enforced* above for what that does and does not cover.

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
