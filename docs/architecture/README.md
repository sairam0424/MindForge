# MindForge Architecture Overview

## Architectural style
MindForge is a modular, file-driven framework. Behavior is defined by
Markdown protocols and JSON schemas, with a small Node.js CLI runtime.

## Core layers
1. **Command layer** — Markdown commands in `.claude/commands/mindforge/`
2. **Engine layer** — Execution protocols under `.mindforge/engine/`
3. **Governance layer** — Approvals, audit, compliance gates in `.mindforge/governance/`
4. **Intelligence Layer** — Health, difficulty, anti-patterns in `.mindforge/intelligence/`
5. **Knowledge Layer** — Long-term memory, capture, and sync in `.mindforge/memory/`
6. **Distribution Layer** — Installer, registry, CI, SDK, plugins
7. **Observability Layer (v2)** — Real-time dashboard, SSE bridge, metrics aggregator

## Key data artifacts
- `.planning/PROJECT.md` — project brief
- `.planning/STATE.md` — current execution state
- `.planning/HANDOFF.json` — machine-readable session handoff
- `.mindforge/memory/knowledge-base.jsonl` — local project memory
- `.planning/AUDIT.jsonl` — append-only audit log

## Runtime flow (high level)
1. `/mindforge:plan-phase` generates atomic plans with dependencies
2. `/mindforge:execute-phase` runs plans in waves
3. `/mindforge:verify-phase` runs automated + human gates
4. `/mindforge:ship` generates release artifacts and PR metadata
5. `/mindforge:dashboard` provides real-time observability and governance

## Installation targets
- Claude Code: `~/.claude/` or `.claude/`
- Antigravity: `~/.gemini/antigravity/` or `.agent/`
- Cursor: `.cursor/rules/`
- Gemini CLI: `.gemini/`
- GitHub Copilot: `.github/copilot-instructions.md`
- OpenCode: `.opencode/`

## SDK integration
`@mindforge/sdk` provides programmatic access to health checks, audit log
streaming, and command builders.

## Stability contract
See ADR-020: command interfaces, schemas, and SDK exports are stable in v2.x.x.
See ADR-041: runtime interfaces are stabilized for community extension.
