# MindForge

MindForge is an agentic-intelligence framework for Claude Code. This plugin installs 221 slash commands, 164 subagents and 123 skills, a small set of governance hooks, and a local MCP server. Together they add a plan, execute and verify workflow, security review, a tamper-evident audit trail and cost-aware model routing to Claude Code sessions.

MIT licensed. Source and full documentation: https://github.com/sairam0424/MindForge

## Install

```text
/plugin marketplace add sairam0424/MindForge
/plugin install mindforge@mindforge
```

Node.js 18 or newer is required, because the hooks and the MCP server run on Node.

## What you get

- **Commands.** Every command is namespaced `/mindforge:*`. Run `/mindforge:help` for the full list. Common starting points are `/mindforge:plan-phase`, `/mindforge:execute-phase`, `/mindforge:verify-phase`, `/mindforge:security-scan`, `/mindforge:pr-review` and `/mindforge:costs`.
- **Subagents.** Specialist subagents, grouped by discipline, that Claude Code can delegate work to.
- **Skills.** Claude Code loads a skill when a task matches its description. The `mindforge-protocol` skill carries the plan, execute and verify discipline.
- **MCP server.** A local server named `mindforge`. Its tools are listed below.
- **Hooks.** Hooks that guard risky commands and record an audit trail, listed below.

## What runs on your machine

Everything in this plugin runs locally and needs no account. The shipped hook scripts make one outbound network request, described under Network access. The MCP server talks to Claude Code over stdio, and the only network connection in its own source is to a local browser daemon on 127.0.0.1.

### Hooks

Hooks are started through `scripts/run-with-flags.js`, which runs the hook script only when the active profile enables it.

| Event | Hook id | What it does |
| --- | --- | --- |
| SessionStart | `mindforge-check-update` | Starts a background check for a newer MindForge release. See Network access. |
| SessionStart | `mindforge-session-init` | If the project has `.agent/skills/mindforge-neural-orchestrator/SKILL.md`, adds that skill's text to the session context. Otherwise it does nothing. |
| PreToolUse (Write, Edit, MultiEdit, Bash) | `mindforge-prompt-guard` | Scans content written to `.planning/` for prompt-injection patterns and prints an advisory warning. It does not block. |
| PreToolUse (Write, Edit, MultiEdit, Bash) | `mindforge-config-protection` | Blocks edits to existing linter, formatter and tsconfig files, so the agent fixes the code instead of weakening the checks. |
| PreToolUse (Bash) | `trust-gate` | Denies destructive shell commands. |
| PreToolUse (Bash) | `mindforge-block-no-verify` | Blocks `--no-verify` and `-c core.hooksPath=` on git commands, so git hooks cannot be skipped. |
| PostToolUse (Bash, Edit, Write, MultiEdit, Agent, Task) | `mindforge-context-monitor` | Warns the agent when context usage is high. Keeps a small state file in the OS temp directory. |
| PostToolUse (Bash, Task) | `instinct-capture` | Only when the project's `.mindforge/config.json` sets `instincts.mode` to `auto-capture`: appends short notes about completed tasks to the file named by `instincts.store_path`. Otherwise it does nothing. |
| PreCompact, SubagentStart, SubagentStop | `mindforge-lifecycle-audit` | Appends a SHA-256 hash-chained entry to `.planning/AUDIT.jsonl` in the current project. |

Set `MINDFORGE_DISABLED_HOOKS` to a comma-separated list of hook ids to switch hooks off. Set `MINDFORGE_HOOK_PROFILE` to `minimal`, `standard` or `strict` (default `standard`) to choose which hooks run. Switching off a security gate such as `trust-gate` prints a warning on stderr.

### MCP tools

Six tools are read-only: `mindforge_status`, `mindforge_health`, `mindforge_audit_log`, `mindforge_memory_query`, `mindforge_memory_find_related` and `mindforge_memory_stats`. They read project state, the audit log and the project knowledge base. The cross-project knowledge base at `~/.mindforge/global-knowledge-base.jsonl` is read only when a query asks to include it.

`mindforge_memory_remember` is the one write tool. It appends an entry to the project knowledge base at `.mindforge/memory/knowledge-base.jsonl`, never overwrites or deletes, and asks for your confirmation before it writes.

`mindforge_browse` sends requests to a MindForge browser daemon on 127.0.0.1. The daemon loads whichever pages you or the agent ask it to open.

### Files written

- `.planning/AUDIT.jsonl` in the current project, by `mindforge-lifecycle-audit`.
- The file named by `instincts.store_path`, by `instinct-capture`, when auto-capture is enabled.
- `.mindforge/memory/knowledge-base.jsonl` in the current project, by `mindforge_memory_remember`, after you confirm.
- Small state files in the OS temp directory, by `mindforge-context-monitor` and `instinct-capture`.
- `cache/mindforge-update-check.json` in your Claude config directory (`$CLAUDE_CONFIG_DIR`, falling back to `~/.agent`), by `mindforge-check-update`.

### Network access

At the start of a session, `mindforge-check-update` runs `npm view mindforge-cc version` in a background process with a 10-second timeout. That asks the npm registry for the latest published version number and compares it with the installed one. No project files, prompts or usernames are passed to the command. The result is written to the cache file above.

No other shipped hook script makes an outbound network request.

## License

MIT. See the LICENSE file in the repository.
