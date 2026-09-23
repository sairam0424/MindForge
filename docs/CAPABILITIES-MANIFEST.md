# MindForge — Capabilities Manifest

Line-item inventory of what's actually in a MindForge v12.0.0 install. Earlier versions of this
page described "Pillars IX-XII" of "Sovereign Intelligence" (PQAS, ZK-Audit, biometric approval
gates) as live features — they are not. `bin/governance/quantum-crypto.js` labels itself
SIMULATED and gated off the live trust path by default; no ZK-proof or biometric mechanism exists
anywhere in `bin/`. See *What is actually enforced* in the root [README](../README.md).

## 1. Security & governance

- `bin/governance/policy-engine.js` — real blast-radius/impact scoring and tiered approval gates
  (Tier 1 auto / Tier 2 manual / Tier 3 cryptographic-attestation-required).
- `bin/governance/ztai-manager.js` — real Ed25519 identity signing where it's live; its own
  `SECURITY_TIER_3_SIMULATED` flag disclosures where it isn't.
- `bin/governance/audit-hash.js` / `audit-verifier.js` — the single canonical SHA-256 hash chain
  for `.planning/AUDIT.jsonl`, verifiable via `node bin/verify-audit.js`.
- `bin/governance/quantum-crypto.js` — explicitly simulated post-quantum signing, opt-in only,
  not a production trust boundary.

## 2. Autonomous execution

- `bin/engine/council-runtime.js` — real, CLI-wired 4-voice model debate (`/mindforge:council`).
- `bin/autonomous/` — a fully-built wave-execution engine (dependency DAG, stuck-detection,
  repair ladder) that is unit-tested but not yet wired to any live command path; `/mindforge:auto`
  is currently an LLM-interpreted markdown spec, not a call into this engine.
- `bin/engine/temporal-hub.js` — real session-state snapshot/rollback, driven by
  `node bin/engine/temporal-cli.js`.

## 3. Memory & knowledge

- `bin/memory/` — local-first JSONL knowledge store + graph, plus a unified `sql.js` SQLite
  store (`celestial.db`) for traces/skills/remediations. Zero native dependencies.
- `mindforge-sdk` — standalone TypeScript client (`MindForgeClient`, `MindForgeMemory`) for
  reading project state and the knowledge graph without importing `bin/`.
- `mindforge-mcp-server` — exposes 8 of those same read/write operations as MCP tools.

## 4. Integrations

- Jira/Confluence/Slack sync command specs exist as markdown; the underlying wiring is inert —
  `bin/mindforge-cli.js` explicitly marks jira-sync/confluence-sync as "Planned ... not yet
  implemented" — treat as a template to fill in, not a working integration out of the box.
- GitHub Actions: `.github/workflows/mindforge-ci.yml` is the real CI gate suite this project
  runs on itself.

## 5. Personas, subagents, skills, commands

- **`.mindforge/personas/`** — 216 in-session role-overlay files, loaded via
  `/mindforge:agent <name>`. Distinct from subagents below; no isolated context.
- **`subagents/categories/`** — 164 genuine Claude-Code-native subagent definitions with their
  own isolated context, installable as separate marketplace plugins.
- **`.claude/commands/mindforge/`** — 221 slash commands.
- **Skills** — 232 engine-tier (`.mindforge/skills/`, auto-triggered) + 122 extended-tier
  (`.agent/skills/`, explicit activation) = 354 total.

For the exhaustive, currently-verified command list see
[docs/commands-reference.md](commands-reference.md).
