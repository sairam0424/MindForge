# MindForge — Getting Started (v11.5.1)

This guide gets you from zero to a working MindForge project in under five minutes.

## Prerequisites

- **Node.js 18+** (LTS recommended)
- No native build tools required — MindForge uses sql.js (pure WASM) for all database operations

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

### 2. Claude Code plugin (self-hosted marketplace)

Install MindForge as a Claude Code plugin from its marketplace:

```bash
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

### 3. Standalone MCP server

Run the MindForge MCP server (`mindforge-mcp-server`) over stdio — it exposes 7 tools (6 read-only plus 1 guarded write): `mindforge_health`, `mindforge_status`, `mindforge_memory_query`, `mindforge_memory_stats`, `mindforge_memory_find_related`, `mindforge_audit_log`, and `mindforge_memory_remember`.

```bash
claude mcp add mindforge -- npx -y mindforge-mcp-server
```

This server is also published to the [MCP Registry](https://registry.modelcontextprotocol.io) as `io.github.sairam0424/mindforge` (currently `11.5.1`, marked latest).

### 4. Homebrew

```bash
brew install sairam0424/tap/mindforge
```

### SDK

To build on top of MindForge programmatically, install the TypeScript SDK:

```bash
npm i mindforge-sdk
```

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
- Join the community: `/mindforge:join-discord`.
