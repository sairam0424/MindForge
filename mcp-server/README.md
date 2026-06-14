# mindforge-mcp-server

> Read the MindForge engine — knowledge graph, project health, and audit log — from Claude Code or any MCP host, over stdio.

[![npm version](https://img.shields.io/npm/v/mindforge-mcp-server?label=npm&color=cb3837)](https://www.npmjs.com/package/mindforge-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A self-contained Model Context Protocol (MCP) server that exposes the [MindForge](https://github.com/sairam0424/MindForge) engine to AI agents: query the SQLite-backed knowledge graph, find related memory, check project health, and read the tamper-evident audit log — plus one guarded write to persist new knowledge. Zero runtime dependencies (the server and its deps are bundled into a single file), so it runs on a clean install, offline, and on first session.

## Install

```bash
claude mcp add mindforge -- npx -y mindforge-mcp-server
```

Or add it manually to your MCP host config (Claude Desktop, Cursor, VS Code):

```json
{
  "mcpServers": {
    "mindforge": {
      "command": "npx",
      "args": ["-y", "mindforge-mcp-server"],
      "env": { "CLAUDE_PROJECT_DIR": "${workspaceFolder}" }
    }
  }
}
```

> The server scopes every operation to `CLAUDE_PROJECT_DIR` (the project containing `.mindforge/` and `.planning/`). If unset, it falls back to the current working directory. Every tool degrades gracefully with an actionable message when MindForge is not initialized in the project — it never throws.

## Tools

| Tool | Access | Description |
| --- | --- | --- |
| `mindforge_health` | read-only | Run a MindForge health check on the current project (config, state, knowledge graph, audit chain). |
| `mindforge_status` | read-only | Read current project status: whether MindForge is initialized, active phase, and handoff state. |
| `mindforge_memory_query` | read-only | Search the knowledge graph (architectural decisions, patterns, preferences) by topic, tags, and type. |
| `mindforge_memory_stats` | read-only | Report knowledge-graph statistics: total/active entries, types, and tag distribution. |
| `mindforge_memory_find_related` | read-only | Given free text, find related knowledge entries via hybrid (FTS5 + graph-traversal) retrieval. |
| `mindforge_audit_log` | read-only | Read entries from the tamper-evident audit log (`.planning/AUDIT.jsonl`), optionally filtered by event. |
| `mindforge_memory_remember` | **write** (guarded) | Persist a new knowledge entry (decision, pattern, or preference) into the graph. |

All tools are annotated with `readOnlyHint` / `destructiveHint` so MCP hosts can enforce the right trust boundary; only `mindforge_memory_remember` writes, and it is append-only.

## Transport & security

- **Transport:** stdio JSON-RPC (single embedded client).
- **Scope:** read/append only within `CLAUDE_PROJECT_DIR`; no shell execution, no network egress.
- **Self-contained:** the SDK and Zod are bundled into `dist/index.js`; no `node_modules` are needed at runtime.

## Part of MindForge

This server ships standalone (npm + MCP registries) **and** bundled inside the [MindForge Claude Code plugin](https://github.com/sairam0424/MindForge). For the full framework — slash commands, subagents, governance, and cost-aware model routing — see the [main repository](https://github.com/sairam0424/MindForge).

## License

MIT © MindForge Team
