# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MindForge (`mindforge-cc`, v11.5.1) is an agentic-intelligence framework for Claude Code / Antigravity: it installs slash commands, subagents, skills, hooks, and a Node runtime that add governance, memory, cost-aware model routing, and autonomous wave execution to AI-driven development. It ships as an npm package (`npx mindforge-cc@latest`) and a Claude Code plugin marketplace. Pure JS runtime + a separate TypeScript SDK; **zero native deps** (persistence is sql.js / WASM SQLite).

## Commands

All from the root `package.json` / Makefile-less Node scripts unless noted. **Node >= 18 required.**

```bash
npm install                              # install deps
npm test                                 # node tests/run-all.js — runs ALL *.test.js (Husky pre-commit also runs this)
node tests/<name>.test.js                # run ONE test file directly (each is self-contained, Node assert)
node tests/run-all.js --filter=security,audit   # subset by case-insensitive filename substring (comma list)
npm run lint                             # eslint .  (root tolerates warnings; CI: eslint . --max-warnings=9999)
npm run coverage                         # npx c8 node tests/run-all.js  (CI gates lines at 30%)
npm run commit                           # Commitizen conventional-commit prompt (cz)
node bin/mindforge-cli.js verify         # verification runner: tests/lint/audit/typecheck -> .planning/VERIFICATION.md
node bin/verify-audit.js                 # verify AUDIT.jsonl hash-chain (fail-closed, exit 1 on break)
node bin/validate-config.js              # validate MINDFORGE.md against its JSON schema
```

SDK (separate package `mindforge-sdk`, lives in `sdk/`, strict TypeScript):

```bash
cd sdk && npm install && npm run build   # tsc -> sdk/dist/
cd sdk && npm test                       # node tests/sdk.test.js && node tests/execute-command.test.js (pretest runs build)
npx tsc --noEmit -p sdk/tsconfig.json    # typecheck only
```

To skip a test, make its **first line** `// @skip: reason`. There is no Jest/Mocha — `tests/run-all.js` discovers `*.test.js`, runs them sequentially with a 60s timeout, and propagates exit codes.

**Version bumps touch 5 files** (asserted by `tests/version-consistency.test.js`): `package.json`, `sdk/package.json`, `.mindforge/config.json`, `MINDFORGE.md` (`[VERSION]`), `sdk/README.md`.

## High-level Architecture

Four layers, top to bottom — understand the flow, not individual files:

1. **Interface (`.claude/`, `.agent/`)** — `.claude/commands/mindforge/*.md` are the `/mindforge:*` slash commands (~174). `.agent/` is the Gemini-CLI/Antigravity mirror with hooks, skills, and ~130 workflow pipelines. The two hook configs (`.claude/settings.json` real Claude events `PreToolUse`/`PostToolUse`/`SessionStart`, vs `.agent/settings.json` Gemini `BeforeTool`/`AfterTool`) **must be kept in sync** — `mindforge-context-monitor.js` switches event names when `GEMINI_API_KEY` is set.
2. **Engine specs (`.mindforge/`)** — declarative config + content published in the npm package: `engine/` (25 spec docs), `skills/` (20 core SKILL.md), `personas/` (117), `config.json` (the runtime knobs: governance/revops/security/instincts/council/cost_routing/temporal). Edit behavior here, not in code, where possible.
3. **Execution (`bin/`, ~22K LOC)** — the actual Node runtime, organized by domain: `autonomous/` (wave executor, auto-runner, repair, stuck-monitor), `engine/` (council-runtime, nexus-tracer, verification-runner, temporal-hindsight, otel-exporter), `memory/` (knowledge-graph, vector-hub, RRF fusion, embedding), `governance/` (policy-engine, audit, rbac, quantum-crypto), `models/` (provider clients + pricing), `dashboard/` (Express + SSE, port 7339), `security/`, `browser/` (Playwright QA), `eval/`.
4. **Persistence (`.planning/`)** — execution state: `STATE.md`, `HANDOFF.json` (resumable), `AUDIT.jsonl` (tamper-evident, gitignored), `history/` snapshots. Plus sql.js DB at `.mindforge/celestial.db`.

**Task lifecycle** (the core control flow): command/plan → pre-flight → skill loader (trigger-match → tier-prioritize Project>Org>Core → resolve `compose:` deps) → context injector (≤60K tokens) → cost router (difficulty → Haiku/Sonnet/Opus/Gemini tier) → fresh-context subagent (implement → self-verify → commit) → verification (build/typecheck/lint/test/security/diff) → stuck detection → instinct capture → handoff (HANDOFF.json + AUDIT.jsonl).

**Two single-sources-of-truth — do not bypass:**
- **Audit hash-chain:** `bin/governance/audit-hash.js` is the only canonical SHA-256 hasher; the writer (`bin/autonomous/audit-writer.js`) and verifier (`bin/governance/audit-verifier.js`) both use it. `.planning/AUDIT.jsonl` links via `previous_hash`.
- **Pricing:** `bin/models/pricing-registry.js`; all providers call `priceCall()`. Never hardcode per-model prices in a provider.

**Config / identity hierarchy** (source of truth, in order): `SOUL.md` → `MINDFORGE.md` (parameter registry — `[VERSION]`, model topology, cost limits, non-overridable gates) → `.agent/CLAUDE.md` (contributor protocol) → `.mindforge/`. Note `MINDFORGE.md`'s `[FORBIDDEN]`/`[INSTRUCTIONS]` blocks and the `.claude/CLAUDE.md` "Unified Protocol Engine" describe an aspirational multi-agent protocol — treat `bin/` source + `tests/` as ground truth for what actually runs (e.g. PQAS is simulated/inactive by default; Tier-3 trust uses real Ed25519).

## Conventions

- Enforce **Plan → Execute → Verify**; never skip planning for changes touching >3 files (per `.agent/CLAUDE.md`).
- Changes to Auth/Payment/PII/Uploads auto-trigger security review — run `mindforge:security-scan` pre-commit, resolve Medium+ findings (`[BLOCK_ON_SECURITY]` is non-overridable).
- ESLint flat config (`eslint.config.mjs`): single quotes + semicolons enforced, `sourceType: module`. SDK is strict TS, zero-warning in CI (`eslint src/ --max-warnings 0`).
- Conventional Commits via Commitizen, with a trailing `(UC-XX)` use-case ref where applicable, e.g. `feat(council): wire runCouncil runtime (UC-22)`.
