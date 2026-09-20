# MindForge

[![npm version](https://img.shields.io/npm/v/mindforge-cc.svg)](https://www.npmjs.com/package/mindforge-cc)
[![npm downloads](https://img.shields.io/npm/dm/mindforge-cc.svg)](https://www.npmjs.com/package/mindforge-cc)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node >=18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](package.json)
[![CI](https://github.com/sairam0424/MindForge/actions/workflows/mindforge-ci.yml/badge.svg)](https://github.com/sairam0424/MindForge/actions/workflows/mindforge-ci.yml)

**A governance and orchestration layer for Claude Code.**

Claude Code alone runs one agent in one context. MindForge adds the parts that don't fit in a
single context window: skills that auto-load by trigger, personas you can call by name, a
wave-based executor that fans work out to fresh-context subagents and commits per task, a
tamper-evident audit chain, and cost-aware routing across providers. Install it once and get
`/mindforge:plan-phase` → `/mindforge:execute-phase` → `/mindforge:verify-phase` → `/mindforge:ship`
as your actual working loop, not a slogan.

<!-- TODO: record a ~30s terminal cast of one real /mindforge:plan-phase -> /mindforge:execute-phase
     run (asciinema or GIF) and embed it here. Every comparable README in this space leads with a
     visual in the first 15 lines; this is currently the single biggest gap. -->

**Jump to:** [Latest release](#latest-release) · [What you get](#what-you-get) · [What is actually enforced](#what-is-actually-enforced) · [Install](#install) · [Quick start](#quick-start-new-project) · [Documentation](#documentation) · [Core workflow](#core-workflow) · [Dynamic workflows](#dynamic-workflow-library)

---

## What you get

| | Capability | Detail |
|---|---|---|
| 🧩 | **221 slash commands** | `/mindforge:plan-phase`, `/mindforge:execute-phase`, `/mindforge:ship`, and 218 more — [full reference](docs/commands-reference.md) |
| 🛠️ | **355 skills** | 232 auto-triggered by keyword match (engine tier) + 123 explicit, invoked by name (extended tier) |
| 🎭 | **216 personas** | In-session role overlays via `/mindforge:agent <name>` — same context, different behavioral spec |
| 🤖 | **164 subagents** | Genuine isolated-context Claude-Code-native subagent definitions — a separate mechanism from personas, see [docs/PERSONAS.md](docs/PERSONAS.md) |
| 🔀 | **35 dynamic workflows** | Multi-agent fan-out scripts across 5 tiers (Research, Dev, Ops, Intelligence, Beast) — [workflow atlas](docs/workflow-atlas.md) |
| 🔒 | **Tamper-evident audit chain** | SHA-256 hash-linked `.planning/AUDIT.jsonl`; verify independently with `node bin/verify-audit.js` |
| 💸 | **Cost-aware model routing** | Anthropic / OpenAI / Gemini / Bedrock / Ollama, routed by task difficulty tier |
| 🧠 | **Local-first knowledge graph** | Zero-native-dependency SQLite (`sql.js` / WASM) — no native build step |
| 📊 | **Live dashboard** | Express + SSE at `localhost:7339` |

Ships three ways: an npm package (`npx mindforge-cc@latest`), a Claude Code plugin marketplace
entry, and an MCP server.

---

## Install

Pick whichever matches how you work — all of these are real, live channels.

### `npx` (recommended)

Writes `.mindforge/` governance, memory, and planning into your project:

```bash
npx mindforge-cc@latest --claude --local      # Claude Code, this project only
npx mindforge-cc@latest --antigravity --local # Antigravity, this project only
npx mindforge-cc@latest                       # auto-detects your runtime
```

**Global** (system-wide, for your primary AI coding runtime):

```bash
npx mindforge-cc@latest --claude --global
```

(`npm install -g mindforge-cc@latest` only puts the `mindforge-cc`/`mindforge` binaries on your
PATH — it doesn't select a runtime or write anything. Run the command above, or the equivalent
`mindforge-cc --claude --global` once installed, to actually scaffold a global setup.)

**Other runtimes** — same flag pattern, swap `--global`/`--local`:

| Runtime | Flag |
|---|---|
| Claude Code | `--claude` |
| Antigravity | `--antigravity` |
| Cursor | `--cursor` |
| GitHub Copilot | `--copilot` |
| Gemini CLI | `--gemini` |

**Advanced:** `--runtime claude,cursor` (combined runtimes) · `--with-utils` (installs local `bin/` utilities) · `--minimal` (essential scaffolding only, no persona library) · `--force` (rewrite an existing `.mindforge/MINDFORGE-SCHEMA.json` with the current, stricter schema)

### Claude Code plugin marketplace

No project files written — the plugin's hooks fire, see [What is actually enforced](#what-is-actually-enforced) for what that does and does not cover.

```bash
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

Prefer just a slice (e.g. Python agents)? `mindforge-lang@mindforge` and 9 other focused packs exist — see [docs/plugin-installation.md](docs/plugin-installation.md) for all 10, token-budget guidance, and team setup.

### Standalone MCP server

```bash
claude mcp add mindforge -- npx -y mindforge-mcp-server
```

Exposes 8 tools over stdio (6 read-only, 1 guarded write, 1 guarded browse proxy). Also listed on
the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.sairam0424/mindforge`
— that entry is republished manually and can lag; check what it actually serves before relying on
it, or install `mindforge-mcp-server` from npm directly to pin a version.

### Homebrew

```bash
brew install sairam0424/tap/mindforge
```

### SDK

Build on MindForge programmatically:

```bash
npm i mindforge-sdk
```

**Upgrading from 11.9.x?** The installer does not overwrite an existing
`.mindforge/MINDFORGE-SCHEMA.json`, so 11.9.2's armed config validator keeps the older
permissive schema on a plain upgrade — run with `--force` for the stricter gate. The daily cost
cap declared as `[COST_HARD_LIMIT_USD]` in `MINDFORGE.md` was **not enforced** in 11.9.2 (11.9.3
arms it), and an upgrade never rewrites an existing `MINDFORGE.md` — add
`[COST_HARD_LIMIT_USD] = 25.00` yourself if yours predates the key.

Full install matrix, plugin packs, and team-setup guidance: [docs/getting-started.md](docs/getting-started.md).

---

## Verify

These `/mindforge:*` commands require the Claude Code plugin or an `npx`/Homebrew framework
install — the standalone MCP server exposes MCP tools instead, and `mindforge-sdk` exposes a
programmatic API; neither installs these slash commands.

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

## Latest release

**v11.9.7** (2026-09-20) — The install banner stops contradicting itself. Found by
actually running v11.9.6's own documented install command in a clean project instead of
stopping at `--version`: the top banner claimed `SOVEREIGN INTELLIGENCE v8.1.1` while the
install activation line two screens later said `v8.2.0` for the same subsystem, and claimed
`PQAS ... Enabled` right before accurately disclosing it's simulated and off by default a
few lines down. Both fixed, plus a dead `docs.mindforge.cc` link and a persona-count doc
regression (218 → back to the correct 216) introduced by v11.9.6's own honesty pass. No
new features. See [RELEASENOTES.md](./RELEASENOTES.md) or [CHANGELOG.md](./CHANGELOG.md).

The previous release, **v11.9.6**, was the release-readiness pass before pointing real,
external users at the project for the first time: fixed a crash in `/mindforge:learn`, a
token-leak in the browser daemon, three dashboard panels that silently rendered nothing, a
stale Homebrew formula, and docs describing PQAS/ZTAI/"Pillar"-numbered subsystems as live
guarantees when the code already self-labels them simulated. **v11.9.5** fixed a release
pipeline that could strand itself mid-publish and shipped `mindforge-sdk` for the first
time since 11.8.0, with provenance. **v11.9.4**, before that, is where the hook gates
started actually registering: 11.9.3
shipped the code and then declined to run it on essentially every project. Measured against
the published tarballs — 11.9.3: **11 hook scripts installed, 0 registered**; 11.9.4:
**8 registered, 3 deny-class verified blocking**. That **behaviour change under a patch
bump** still applies — the installer writes `.claude/settings.json` where it previously
declined, merging append-only and backing up first. See the BREAKING section in
[CHANGELOG.md](./CHANGELOG.md).

---

## What is actually enforced

Read this before you rely on anything below blocking a bad command. MindForge ships a large
corpus of agent instructions — commands, skills, personas, protocols — and those are advisory: they work by
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

## How it fits together

```
                     /mindforge:plan-phase N
                              |
                              v
   Skill Loader (trigger-match, tier: Project > Org > Core)
                              |
                              v
        Context Injector (<=60K tokens)  --> Cost Router
                              |             (Haiku / Sonnet / Opus / Gemini,
                              v              by task difficulty)
      Fresh-context Subagent (implement -> self-verify -> commit)
                              |
                              v
   Verification (build / typecheck / lint / test / security / diff)
                              |
                              v
        Handoff (.planning/HANDOFF.json + AUDIT.jsonl)
```

Four layers underlie this, top to bottom: **Interface** (`.claude/`, `.agent/` — the 221 slash
commands and hooks), **Engine specs** (`.mindforge/` — the 355 skills, 216 personas, and
`config.json` runtime knobs), **Execution** (`bin/`, ~22K LOC — the wave executor, governance,
memory, and dashboard code that actually runs), and **Persistence** (`.planning/` — `STATE.md`,
the audit chain, resumable `HANDOFF.json`). Edit behavior in layer 2 where possible; layer 3 is
the only place with real enforcement, per *What is actually enforced* above.

---

## Documentation

Six categories, read in this order the first time:

| Category | Doc | Read this when |
|---|---|---|
| Start here | [Getting started](docs/getting-started.md) | Installing for the first time |
| Start here | [Quick verify](docs/quick-verify.md) | Right after install — confirm it actually works |
| Start here | [User guide](docs/user-guide.md) | Learning the day-to-day command loop |
| Start here | [Full tutorial](docs/tutorial.md) | Want a guided walkthrough instead of reference docs |
| Reference | [Commands (full)](docs/commands-reference.md) / [Commands (quick)](docs/References/commands.md) | Looking up a specific `/mindforge:*` command |
| Reference | [Config reference](docs/References/config-reference.md) | Editing `MINDFORGE.md` or `.mindforge/config.json` |
| Reference | [SDK API](docs/References/sdk-api.md) / [Skills API](docs/References/skills-api.md) | Building on `mindforge-sdk` or authoring a new skill |
| Reference | [Audit events](docs/References/audit-events.md) | Parsing `.planning/AUDIT.jsonl` |
| Reference | [Workflow atlas](docs/workflow-atlas.md) | Choosing one of the 35 dynamic workflows |
| Reference | [Requirements](docs/requirements.md) | Checking supported Node/OS versions before install |
| When something's wrong | [Troubleshooting](docs/troubleshooting.md) | A command or hook isn't behaving as documented |
| When something's wrong | [FAQ](docs/faq.md) | Common questions before filing an issue |
| When something's wrong | [Upgrade guide](docs/upgrade.md) | Moving between major/minor versions |
| Security | [SECURITY.md](SECURITY.md) | Reporting a vulnerability; credentials are read from env vars and never committed |
| Security | [Threat model](docs/security/threat-model.md) | Understanding what MindForge does and doesn't protect against |
| Contributing | [Architecture](docs/architecture/README.md) | Understanding the codebase before sending a PR |
| Contributing | [Contributing guide](docs/contributing/CONTRIBUTING.md) | Sending a PR |
| Contributing | [CI quickstart](docs/ci-quickstart.md) | Understanding what CI checks before you push |
| Contributing | [Release checklist](docs/release-checklist-guide.md) | Cutting a release |
| Reference | [USPs and features](docs/usp-features.md) | Evaluating MindForge against other tools |
| Release notes | [RELEASENOTES.md](RELEASENOTES.md) | What changed, in prose, per version |

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

<details>
<summary><strong>Execution modes</strong></summary>

MindForge supports multiple interaction models to fit your engineering workflow:

- **In-IDE Orchestration**: Use `/mindforge:agent <persona>` for real-time delegation.
- **Enterprise Workflows**: Specialized commands like `/mindforge:wf-tdd-sprint` and `/mindforge:plan-phase`.
- **CLI Automation**: Run `node bin/mindforge-cli.js spawn <persona>` for scripted tasks.

</details>

---

## Updates and migrations

Run `/mindforge:update` (add `--apply` to install) — see [docs/upgrade.md](docs/upgrade.md) for the full upgrade guide and fallback steps.

---

<details>
<summary><strong>Plugin system (v1.0.0)</strong></summary>

Plugins extend MindForge via the `mindforge-plugin-*` namespace.

```bash
/mindforge:plugins list
/mindforge:plugins install mindforge-plugin-<name>
/mindforge:plugins validate
```

</details>

---

## Token usage profiling

```
/mindforge:tokens --profile
```
See `.mindforge/production/token-optimiser.md`.

---

## License

MIT © 2026 MindForge Team
