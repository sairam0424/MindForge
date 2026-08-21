# MindForge — Getting Started (v11.9.3)

This guide gets you from zero to a working MindForge project in under five minutes.

## Prerequisites

- **Node.js** >= 18.0.0 (`node --version` to check)
- **Claude Code** CLI installed and authenticated (`claude --version`)
- Git (recommended for project-level install)

## Install

MindForge ships across several channels. Pick the one that matches how you work — the CLI installer is the recommended starting point.

### 1. CLI installer (recommended, via `npx`)

Zero-config setup that scaffolds the full framework:

```bash
# Recommended (auto-detects your runtime)
npx mindforge-cc@latest

# Antigravity (local development)
npx mindforge-cc@latest --antigravity --local

# Claude Code (local, per project)
npx mindforge-cc@latest --claude --local
```

After installation, the `mindforge` CLI command is available for runtime operations (health checks, security scans, headless execution, etc.).

**Global install** (system-wide `/mindforge` commands for your primary AI coding runtime):

```bash
npm install -g mindforge-cc@latest
```

### 2. Claude Code plugin (self-hosted marketplace)

Install MindForge as a Claude Code plugin from its marketplace:

```bash
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

Prefer just a slice (e.g. Python agents)? Install a focused pack like `mindforge-lang@mindforge` instead. See [docs/plugin-installation.md](plugin-installation.md) for all 10 plugin packs, token-budget guidance, and team setup.

### 3. Standalone MCP server

Run the MindForge MCP server (`mindforge-mcp-server`) over stdio — it exposes 7 tools (6 read-only plus 1 guarded write): `mindforge_health`, `mindforge_status`, `mindforge_memory_query`, `mindforge_memory_stats`, `mindforge_memory_find_related`, `mindforge_audit_log`, and `mindforge_memory_remember`.

```bash
claude mcp add mindforge -- npx -y mindforge-mcp-server
```

This server is also published to the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.sairam0424/mindforge` (currently `11.9.0`, marked latest).

### 4. Homebrew

```bash
brew install sairam0424/tap/mindforge
```

### SDK

To build on top of MindForge programmatically, install the TypeScript SDK:

```bash
npm i mindforge-sdk
```

## Configuration & Runtimes

MindForge adapts to your existing engineering environment via runtime flags:

| Runtime | Global Command | Local Setup |
| :--- | :--- | :--- |
| **Claude Code** | `mindforge-cc --claude --global` | `mindforge-cc --claude --local` |
| **Antigravity** | `mindforge-cc --antigravity --global` | `mindforge-cc --antigravity --local` |
| **Cursor** | `mindforge-cc --cursor --global` | `mindforge-cc --cursor --local` |
| **GitHub Copilot** | `mindforge-cc --copilot --global` | `mindforge-cc --copilot --local` |
| **Gemini CLI** | `mindforge-cc --gemini --global` | `mindforge-cc --gemini --local` |

### Advanced Setup Options
- **Combined Runtimes**: `mindforge-cc --runtime claude,cursor --local`
- **With Utilities**: `mindforge-cc --local --with-utils` (Installs specialized bin scripts)
- **Minimalist**: `mindforge-cc --local --minimal` (Only basic protocols, no persona library)

## Dynamic Workflow Library (35 workflows across 5 tiers)


| Tier | Count | Workflows |
|------|-------|-----------|
| Research | 5 | competitive-analysis, tech-evaluation, ai-model-eval, ux-heuristic-audit, competitive-teardown |
| Dev | 14 | code-audit, feature-planner, pr-review, tdd-sprint, refactor-plan, test-coverage-gap, api-contract-test, debug-detective, writer-reviewer, mutation-testing, code-explainer, design-system-audit, orchestrate-review, verification-loop |
| Ops | 6 | incident-response, release-prep, dependency-health, database-migration, multi-repo-sync, cost-analysis |
| Intelligence | 7 | onboard-codebase, perf-optimize, architecture-modernization, documentation-gen, api-migration, data-pipeline-validate, workflow-optimizer |
| Beast | 3 | security-hardening, accessibility-audit, security-threat-model |

**Run any workflow:**
```bash
node bin/mindforge-cli.js workflow list              # browse all 32
node bin/mindforge-cli.js workflow info code-audit   # details + phases
```
Or use slash commands: `/mindforge:wf-code-audit`

## Your First 5 Minutes with MindForge

1. **Verify install:** `node bin/mindforge-cli.js health`
2. **Check version:** `node bin/mindforge-cli.js --version` (should print `11.9.3`)
3. **List workflows:** `node bin/mindforge-cli.js workflow list`
4. **Run first slash command:** Open Claude Code → `/mindforge:status`
5. **Onboard your codebase:** Open Claude Code → `/mindforge:wf-onboard-codebase`

## Initialise Your Project

Open your agentic runtime (Antigravity or Claude Code) in your repository and run:

```bash
/mindforge:init-project
```

The `init-project` command scaffolds the framework in `.agent/` and creates your core planning files:

- `.planning/PROJECT.md`: Your roadmap and high-level vision.
- `.planning/REQUIREMENTS.md`: Detailed functional and technical specs.
- `.planning/STATE.md`: Real-time tracking of project health and milestones.

## The Standard Workflow

MindForge operates on a high-velocity 4-pillar lifecycle:

1. **Plan**: `/mindforge:plan-phase 1` (Strategic planning and task breakdown)
2. **Execute**: `/mindforge:execute-phase 1` (Autonomous execution in parallel waves)
3. **Verify**: `/mindforge:verify-phase 1` (Automated tests + Human-in-the-loop validation)
4. **Ship**: `/mindforge:ship 1` (Final delivery, PR generation, and release output)

## Next Steps

- Explore the [User Guide](user-guide.md) for advanced features.
- Switch to a specialized [Persona](PERSONAS.md) for target tasks.
- Join the community: https://github.com/sairam0424/MindForge/issues.
