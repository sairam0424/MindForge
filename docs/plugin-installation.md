# Installing MindForge as a Claude Code Plugin (v11.3.1)

MindForge ships as a native **Claude Code plugin marketplace** in addition to the
`npx mindforge-cc` installer. The plugin path is the fastest way to get MindForge's
commands, subagents, and skills into Claude Code — no project files written, one-command
install, and automatic updates.

> **Plugin vs. npx installer — which do I use?**
> - **Plugin** (`/plugin install`): the cleanest way to get the 174 commands, 154
>   subagents, 73 skills, and governance hooks. Lives in Claude Code's plugin cache,
>   updates via `/plugin update`. Best for most users.
> - **npx installer** (`npx mindforge-cc@latest --claude --local`): also writes the full
>   `.mindforge/` framework engine (governance, memory/SQLite, planning scaffolding) into
>   your project. Use this when you want the complete autonomous engine, not just the
>   commands/agents/skills.
> You can use both: install the plugin for the command surface, and run the npx installer
> if/when you want the engine.

## Quick start

```bash
# 1. Add the MindForge marketplace (from the GitHub repo)
/plugin marketplace add sairam0424/MindForge

# 2. Install the full framework plugin
/plugin install mindforge@mindforge
```

That's it. Run `/help` to see the MindForge commands (namespaced as `/mindforge:*`),
and `/agents` to see the 154 subagents.

## What you get

| Plugin | Contents | Install |
|--------|----------|---------|
| **`mindforge`** | The full framework: 174 commands, 154 subagents, 73 skills, the `mindforge-protocol` skill, and governance hooks | `/plugin install mindforge@mindforge` |
| `mindforge-core-dev` | 11 core development agents (backend, frontend, fullstack, mobile, API) | `/plugin install mindforge-core-dev@mindforge` |
| `mindforge-lang` | 30 language specialists (Python, TypeScript, Go, Rust, Java, React, …) | `/plugin install mindforge-lang@mindforge` |
| `mindforge-infra` | 16 DevOps/cloud/SRE agents | `/plugin install mindforge-infra@mindforge` |
| `mindforge-qa-sec` | 17 testing/security/quality agents | `/plugin install mindforge-qa-sec@mindforge` |
| `mindforge-data-ai` | 13 data engineering / ML / AI agents | `/plugin install mindforge-data-ai@mindforge` |
| `mindforge-dev-exp` | 15 developer-experience / tooling agents | `/plugin install mindforge-dev-exp@mindforge` |
| `mindforge-domains` | 14 domain specialists (blockchain, fintech, gaming, IoT, payments) | `/plugin install mindforge-domains@mindforge` |
| `mindforge-biz` | 16 product / legal / business agents | `/plugin install mindforge-biz@mindforge` |
| `mindforge-meta` | 11 multi-agent orchestration agents | `/plugin install mindforge-meta@mindforge` |
| `mindforge-research` | 11 research / analysis agents | `/plugin install mindforge-research@mindforge` |

### Token-budget note

The comprehensive `mindforge` plugin loads ~16.7k tokens into every session (the
descriptions of 248 skill entries + 154 agents — this is the always-on listing cost,
not per-use). If you only need a slice — say Python work — install just the focused pack
(`mindforge-lang`, 30 agents) instead of the full plugin to keep your context budget low.
Check a plugin's cost before installing with `claude plugin details <name>@mindforge`.

## Managing the plugin

```bash
/plugin list                       # see installed plugins + status
/plugin update mindforge@mindforge # pull the latest version
/plugin disable mindforge@mindforge
/plugin uninstall mindforge@mindforge
/plugin marketplace update mindforge   # refresh the catalog
```

## Team setup (project scope)

To make MindForge available to everyone who clones your repo, add it at project scope.
In your project's `.claude/settings.json`:

```json
{
  "extraKnownMarketplaces": {
    "mindforge": {
      "source": { "source": "github", "repo": "sairam0424/MindForge" }
    }
  },
  "enabledPlugins": {
    "mindforge@mindforge": true
  }
}
```

Teammates are prompted to enable the plugin when they trust the project folder.

## For maintainers — how the plugin is built

The plugin tree is **generated** from MindForge's canonical sources (never hand-edited),
so it can't drift from what the npx installer ships:

```bash
node scripts/fix-command-frontmatter.js   # quote YAML-unsafe frontmatter (idempotent)
node scripts/build-subagent-plugins.js    # per-category plugin.json from on-disk agents
node scripts/build-mindforge-plugin.js    # the comprehensive plugins/mindforge/ tree
node scripts/build-plugin-marketplace.js  # the repo-root .claude-plugin/marketplace.json
claude plugin validate .                  # validate the marketplace
claude plugin validate ./plugins/mindforge # deep-validate the plugin
```

`tests/plugin-packaging.test.js` (in the standard `npm test` suite) guards the generated
tree against drift and frontmatter regressions.

> **Note:** the `.mindforge/` framework engine (governance, memory/SQLite, the autonomous
> runtime) is **not** part of the plugin — a plugin's install directory is ephemeral and
> can't hold persistent state. The engine remains available through the npx installer. A
> future release may expose it as a bundled MCP server writing to `${CLAUDE_PLUGIN_DATA}`.
