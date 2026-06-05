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

## The bundled MindForge engine (MCP server)

The full plugin also bundles a **MindForge MCP server** that exposes the framework's
knowledge graph and project state to Claude Code as tools — so plugin users get the
engine's *reads* without running the npx installer. Tools:

| Tool | Purpose |
|------|---------|
| `mindforge_health` | Project health check (required files, HANDOFF validity, audit size) |
| `mindforge_status` | Init state, STATE.md, HANDOFF.json, auto-state.json |
| `mindforge_memory_query` | Search the knowledge graph (decisions, patterns, preferences) |
| `mindforge_memory_stats` | Knowledge + graph statistics |
| `mindforge_memory_find_related` | Keyword + graph-traversal related-knowledge search |
| `mindforge_audit_log` | Read `.planning/AUDIT.jsonl` (filterable) |
| `mindforge_memory_remember` | Append a knowledge entry (non-destructive write) |

How it works: the server is a thin stdio adapter over the MindForge SDK
(`MindForgeMemory` + `MindForgeClient`), scoped to your project via `${CLAUDE_PROJECT_DIR}`.
Its `node_modules` (~48 MB) is **not** bundled; a SessionStart hook installs the runtime
deps into `${CLAUDE_PLUGIN_DATA}` on first run (the documented persistent-data pattern), so
the committed plugin stays small. Every tool degrades gracefully — if MindForge isn't set
up in the project, it returns an actionable message pointing you to the npx installer or
`/mindforge:init-project` rather than failing.

> The **autonomous runtime + SQLite/governance write-path** still live with the npx
> installer; the MCP server exposes the safe read surface plus an append-only `remember`.

## For maintainers — how the plugin is built

The plugin tree is **generated** from MindForge's canonical sources (never hand-edited),
so it can't drift from what the npx installer ships:

```bash
node scripts/fix-command-frontmatter.js   # quote YAML-unsafe frontmatter (idempotent)
node scripts/build-subagent-plugins.js    # per-category plugin.json from on-disk agents
node scripts/vendor-sdk-into-mcp.js       # vendor the SDK into the MCP server
npm --prefix mcp-server install            # MCP server deps (first time only)
npm --prefix mcp-server run build          # compile mcp-server/dist
node scripts/build-mindforge-plugin.js    # the comprehensive plugins/mindforge/ tree (incl. MCP bundle)
node scripts/build-plugin-marketplace.js  # the repo-root .claude-plugin/marketplace.json
claude plugin validate .                  # validate the marketplace
claude plugin validate ./plugins/mindforge # deep-validate the plugin
```

`tests/plugin-packaging.test.js` (in the standard `npm test` suite) guards the generated
tree against drift, frontmatter regressions, and MCP-bundle integrity.

> **Note:** the compiled `plugins/mindforge/mcp/dist/` is committed (a github-source
> install copies it). It is the only `dist/` exempted from `.gitignore`; `mcp-server/dist`
> and `sdk/dist` remain build artifacts.
