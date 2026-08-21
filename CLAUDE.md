# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

MindForge (`mindforge-cc`, v11.9.3) is an agentic-intelligence framework for Claude Code / Antigravity: it installs slash commands, subagents, skills, hooks, and a Node runtime that add governance, memory, cost-aware model routing, and autonomous wave execution to AI-driven development. It ships as an npm package (`npx mindforge-cc@latest`) and a Claude Code plugin marketplace. Pure JS runtime + a separate TypeScript SDK; **zero native deps** (persistence is sql.js / WASM SQLite).

## Commands

All from the root `package.json` / Makefile-less Node scripts unless noted. **Node >= 18 required.**

```bash
npm install                              # install deps
npm test                                 # validate-assets.js THEN node tests/run-all.js (Husky pre-commit also runs this)
node tests/<name>.test.js                # run ONE test file directly (each is self-contained, Node assert)
node tests/run-all.js --filter=security,audit   # subset by case-insensitive filename substring (comma list)
npm run lint                             # eslint .  (root tolerates warnings; CI: eslint . --max-warnings=9999)
npm run coverage                         # npx c8 node tests/run-all.js  (CI gates lines at 30%)
npm run commit                           # Commitizen conventional-commit prompt (cz)
npm run validate:assets                  # asset validation only (unicode safety, frontmatter schema checks)
npm run harness:audit                    # node bin/harness-audit.js — audit trail inspection
npm run harness:compliance               # harness-adapter compliance scorecard (--check mode gates CI vs. doc drift)
npm run release:ready                    # node bin/utils/readiness-gate.js release — pre-release gate
node bin/mindforge-cli.js verify         # verification runner: tests/lint/audit/typecheck -> .planning/VERIFICATION.md
node bin/verify-audit.js                 # verify AUDIT.jsonl hash-chain (fail-closed, exit 1 on break)
node bin/validate-config.js              # validate MINDFORGE.md against its JSON schema
node bin/mindforge-cli.js security-scan  # validate config + run security checks
node bin/mindforge-cli.js health         # project health / installation integrity check
node bin/dashboard/server.js             # start Express dashboard at localhost:7339 (--port N, --open, --status, --stop). NOT a CLI verb — `mindforge-cli.js dashboard` exits 1
node bin/mindforge-cli.js headless       # run agent in headless/walk-away mode
node bin/mindforge-cli.js pr-review      # cross-model PR review
node bin/mindforge-cli.js classify       # classify changes into governance tiers
node bin/mindforge-cli.js spawn <persona> # scripted agent spawn — NOTE: spawn dispatch is a v1.0 stub — use /mindforge:auto instead
node bin/mindforge-cli.js temporal       # temporal hindsight CLI
```

SDK (separate package `mindforge-sdk`, lives in `sdk/`, strict TypeScript):

```bash
cd sdk && npm install && npm run build   # tsc -> sdk/dist/
cd sdk && npm test                       # node tests/sdk.test.js && node tests/execute-command.test.js (pretest runs build)
npx tsc --noEmit -p sdk/tsconfig.json    # typecheck only
```

MCP server (separate package `mindforge-mcp-server`, lives in `mcp-server/`):

```bash
cd mcp-server && npm install && npm run build   # tsc --noEmit + node build.mjs -> mcp-server/dist/
cd mcp-server && npm run typecheck              # tsc --noEmit only
```

To skip a test, make its **first line** `// @skip: reason`; to raise its timeout, `// @timeout: <ms>` (default `60000`). There is no Jest/Mocha — `tests/run-all.js` walks `tests/` **recursively** and runs every file matching `*.test.js`, sequentially, each in its own `node` process with the repo root as `cwd`, propagating exit codes. **134 files today: 132 pass, 2 env-dependent skips (`browser.test.js`, `sre-integration.test.js`), 0 failures.** A run that discovers zero files exits **1**, not 0 — see `tests/run-all-floor.test.js`. Directories named `tmp-*`, `node_modules` or `.*` are pruned — that prune applies to **directories only**, so a *file* matching `tmp-*.test.js` still runs; use `// @skip:` to exclude a test, never a filename prefix. `--filter=` matches the whole `tests/`-relative path, so it can select a subdirectory; a `--filter` that selects **nothing** now exits 1 — pass `--allow-empty` when an empty selection is intended. The module exports `discoverTests`/`getSkipReason`/`getTimeoutMs` and `main()` is behind a `require.main` guard, so requiring it does not start a run.

**Never bump versions by hand — run `node scripts/sync-version.js`.** `package.json` is canonical and **15 other files** (16 channels) are derived from it: `sdk/package.json`, `mcp-server/package.json`, `.mindforge/config.json`, all three `package-lock.json`s (top-level *and* `packages[""]`), `mcp-server/server.json` (`.version` *and* the npm package entry, matched by `identifier`), `sdk/src/index.ts`, `sdk/README.md` (two shapes — the heading *and* the `VERSION,  // '…'` comment), `AGENTS.md`, `MINDFORGE.md` (`[VERSION]` + H1 title — two channels), this file's own intro line, `.claude-plugin/marketplace.json` (the `mindforge` entry **only**), `Dockerfile` (the `ARG` default — what `docker build .` uses with no flag) and `Formula/mindforge.rb` (url + sha256 + `assert_match`; pass `--sha256 <hex>` or `--fetch-sha`, since the digest cannot be derived offline — it may lag canonical but must never lead it). `npm run version:check` is the offline `--check` mode, wired into the `mindforge-quality` CI job; `tests/version-consistency.test.js` asserts every channel.

**A bump is not finished when `sync-version.js` exits.** Two *tracked* artifacts are gated against `package.json` and only a build can write them: `plugins/mindforge/.claude-plugin/plugin.json` (`tests/plugin-packaging.test.js`) and `plugins/mindforge/mcp/dist/index.js` (`tests/mcp-server-version.test.js`, which spawns the bundle and reads `serverInfo.version` back). The script reports these under `🔨 REQUIRE A BUILD` and exits non-zero rather than claiming success. Clear them with `npm --prefix mcp-server install && npm --prefix mcp-server run build && node scripts/build-mindforge-plugin.js` — all three, in order, because `build-mindforge-plugin.js` refuses without `mcp-server/dist/index.js` and `mcp-server/dist` is gitignored — then commit both regenerated files. Measured on an 11.9.2 → 11.9.3 rehearsal, skipping this leaves `npm test` at 128 passed / **3 failed** and `npm run release:ready` at **12/14**, while `sync-version.js` itself reported success; `mindforge-release.yml` runs `npm test` before publishing.

This replaced a claim that bumps "touch 5 files". Trusting it is why 11.9.2 shipped with the Homebrew formula and `Dockerfile` still pinned to **11.5.1** and the marketplace entry to **11.4.0** — four releases behind — while every npm-relevant location was correctly in sync. Two deliberate exclusions, both asserted rather than merely omitted: `MINDFORGE.md`'s `[REQUIRED_CORE_VERSION]` is a *minimum floor* with no code readers, so it may lag but must never exceed canonical; and the **10 subagent-category entries** in `marketplace.json` version on their own `1.x` line and must never be swept (a regex over that file would silently republish all ten).

## High-level Architecture

Four layers, top to bottom — understand the flow, not individual files:

1. **Interface (`.claude/`, `.agent/`)** — `.claude/commands/mindforge/*.md` are the `/mindforge:*` slash commands (221). `.agent/` is the Gemini-CLI/Antigravity mirror with hooks, skills, and ~130 workflow pipelines. The two hook configs (`.claude/settings.json` real Claude events `PreToolUse`/`PostToolUse`/`SessionStart`, vs `.agent/settings.json` Gemini `BeforeTool`/`AfterTool`) **must be kept in sync** — `.agent/hooks/mindforge-context-monitor.js` switches event names when `GEMINI_API_KEY` is set.
2. **Engine specs (`.mindforge/`)** — declarative config + content published in the npm package: `engine/` (12 spec docs), `skills/` (232 core SKILL.md), `personas/` (216), `config.json` (the runtime knobs: governance/revops/security/instincts/council/cost_routing/temporal). Edit behavior here, not in code, where possible.
3. **Execution (`bin/`, ~22K LOC)** — the actual Node runtime, organized by domain: `autonomous/` (wave executor, auto-runner, repair, stuck-monitor), `engine/` (council-runtime, nexus-tracer, verification-runner, temporal-hindsight, otel-exporter), `memory/` (knowledge-graph, vector-hub, RRF fusion, embedding), `governance/` (policy-engine, audit, rbac, quantum-crypto), `models/` (provider clients + pricing), `dashboard/` (Express + SSE, port 7339), `security/`, `browser/` (Playwright QA), `eval/`.
4. **Persistence (`.planning/`)** — execution state: `STATE.md`, `HANDOFF.json` (resumable), `AUDIT.jsonl` (tamper-evident, gitignored), `history/` snapshots. Plus sql.js DB at `.mindforge/celestial.db`.

**Task lifecycle** (the core control flow): command/plan → pre-flight → skill loader (trigger-match → tier-prioritize Project>Org>Core → resolve `compose:` deps) → context injector (≤60K tokens) → cost router (difficulty → Haiku/Sonnet/Opus/Gemini tier) → fresh-context subagent (implement → self-verify → commit) → verification (build/typecheck/lint/test/security/diff) → stuck detection → instinct capture → handoff (HANDOFF.json + AUDIT.jsonl).

**Two single-sources-of-truth — do not bypass:**
- **Audit hash-chain:** `bin/governance/audit-hash.js` is the only canonical SHA-256 hasher; the writer (`bin/autonomous/audit-writer.js`) and verifier (`bin/governance/audit-verifier.js`) both use it. `.planning/AUDIT.jsonl` links via `previous_hash`.
- **Pricing:** `bin/models/pricing-registry.js`; all providers call `priceCall()`. Never hardcode per-model prices in a provider.

**Config / identity hierarchy** (source of truth, in order): `SOUL.md` → `MINDFORGE.md` (parameter registry — `[VERSION]`, model topology, cost limits, non-overridable gates) → `.agent/CLAUDE.md` (contributor protocol) → `.mindforge/`. Note `MINDFORGE.md`'s `[FORBIDDEN]`/`[INSTRUCTIONS]` blocks and the `.claude/CLAUDE.md` "Unified Protocol Engine" describe an aspirational multi-agent protocol — treat `bin/` source + `tests/` as ground truth for what actually runs (e.g. PQAS is simulated/inactive by default; Tier-3 trust uses real Ed25519).

**Asset validation** (`scripts/ci/validate-assets.js`, runs before every `npm test`): enforces three distinct frontmatter schemas per asset type (strict for `.mindforge/skills`, lenient for `.agent/skills` and `subagents/`, command-style for slash commands), plus a blocking invisible-unicode scan (bidi overrides, zero-width, ASCII-tag smuggling) across all markdown. Emoji are allowed and not flagged.

## Extended Skill Library

MindForge ships with two skill tiers. Both are validated by `validate-assets.js` on every `npm test` run.

**Engine tier (`.mindforge/skills/`, strict schema — auto-triggers):** 232 skills total. Requires `name`, `version`, `status`, and `triggers` fields. The skill-loader matches against `triggers:` on every task; matching skills are auto-loaded into context. Includes 30 skills ported from external community sources (software-development, devops, github, research, security, creative, data-science, note-taking categories).

**Extended tier (`.agent/skills/`, lenient schema — explicit activation):** 123 skills total. Requires only `name` + non-empty body. Activated by explicitly requesting "use the [skill-name] skill" or via `/mindforge:skills-index`. Includes all 50 community-sourced skills across the same categories, plus their companion `references/` documentation.

**Discovery:** `/mindforge:skills-index` — browseable catalog of all available skills, grouped by category with one-line descriptions.

**Key community-sourced engine-tier skills (auto-trigger):** `systematic-debugging`, `test-driven-development`, `plan`, `simplify-code`, `kanban-orchestrator`, `kanban-worker`, `github-code-review`, `github-pr-workflow`, `osint-investigation`, `web-pentest`, `concept-diagrams`, `research-paper-writing`, `arxiv`, `jupyter-live-kernel`, and 16 more.

**Adding new skills:** Drop into `.agent/skills/<name>/SKILL.md` (lenient, just needs `name:`). To promote to engine tier, copy to `.mindforge/skills/<name>/SKILL.md` and add `version:`, `status: stable`, and `triggers:` (≥10 comma-separated terms, unique across all engine skills — asserted by `tests/skills-platform.test.js`). Must also have `## Mandatory actions` section and `- [ ]` checklist in body.

**Bulk import pattern** (for future skill packs): copy SKILL.md files into `.agent/skills/<name>/`, strip `author:`, `license:`, and `metadata:` frontmatter blocks, then run `npm run validate:assets` to confirm. For engine-tier promotion, additionally add `version:`, `status: stable`, `triggers:` (≥10 terms), `## Mandatory actions` section, and `- [ ]` checklist block.

## Conventions

- Enforce **Plan → Execute → Verify**; never skip planning for changes touching >3 files (per `.agent/CLAUDE.md`).
- Changes to Auth/Payment/PII/Uploads auto-trigger security review — run `mindforge:security-scan` pre-commit, resolve Medium+ findings (`[BLOCK_ON_SECURITY]` is non-overridable).
- ESLint flat config (`eslint.config.mjs`): single quotes + semicolons enforced, `sourceType: module`. SDK is strict TS, zero-warning in CI (`eslint src/ --max-warnings 0`).
- Conventional Commits via Commitizen, with a trailing `(UC-XX)` use-case ref where applicable, e.g. `feat(council): wire runCouncil runtime (UC-22)`.
- The harness compliance scorecard (`npm run harness:compliance`) must stay in sync with documentation — `--check` mode will fail CI if the rendered matrix in docs was hand-edited rather than generated from `ADAPTER_RECORDS` in `bin/installer/harness-adapter-compliance.js`. This is enforced by the `mindforge-quality` job in `.github/workflows/mindforge-ci.yml`, alongside `npm run harness:gate` and `npm run release:ready`. Until CI-01 none of the three ran in any workflow, so this sentence described an intention rather than a gate; `tests/ci-gates-wired.test.js` now asserts the wiring so it cannot quietly revert. `node bin/verify-audit.js` and `npm run eval:retrieval` are deliberately **not** wired — see the reasons in that test.
