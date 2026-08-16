# MindForge — Definitive Codebase Index

> ## STATUS OF THIS SNAPSHOT — updated 2026-08-16
>
> **Measured against `f7b9e180` (v11.9.1) on 2026-08-15/16. Nothing below has been rewritten**
> — the snapshot is preserved so it can be audited. Six findings have since been fixed on
> branch `fix/v11.9.2-ship-blockers` (base `f7b9e180`, head `0174432`). Superseded findings
> are named here, not edited in place. Instructions (§10 Navigation Map), dangling `path:line`
> citations, and errors that were wrong when written HAVE been corrected in place and are
> marked `[corrected 2026-08-16]`.
>
> | Superseded claim | Where it appears in this file | Fixed by |
> |---|---|---|
> | `revops-api.js` unmounted, `/api/revops` 404s, and even mounted it throws on the `{entries,total,limit,offset}` wrapper | `:88`, `:96`, `:317`, `:345` (§9-#9), `:409` | `fe9390b` — mounted; the routes now receive `.entries`; `/api/revops/overview` returns HTTP 200 with all three engines populated |
> | Hindsight injection commits its audit record and state flip even when the rollback throws | `:341` (§9-#7), `:409` | `4b09f19` — `TemporalHub.rollbackTo` is awaited, so a failed injection writes nothing; `_verifyMetadata` type- and length-guards before `crypto.timingSafeEqual` |
> | `defaultArgs` are replaced, not prepended | `:135`, `:339` (§9-#6), `:386`, `:409`, `:415` | `37392d5` — now prepended. `install-skill`, `register-skill`, `audit-skill` and `record-learning` had their `defaultArgs` **removed** instead, because prepending converted them from inert refusals into live state writers (`audit-skill` minted hash-chained `{validation_passed:true}` entries for nonexistent skills); all four refuse with exit 1 as at v11.9.1. `subagent` is now a first-class command because prepending `spawn` shadowed `spawn-agent`'s only implemented mode |
> | `run-all.js` discovery is a flat `readdirSync`; subdirectories and `test/` are invisible | `:357`, `:400` | `5177225` + `a9bdb0f` — recursive walk; `SKIP_DIRS` applies to **directories only** (it had been dropping files named `tmp-*`/`.*`); `discoverTests`/`getSkipReason`/`getTimeoutMs` exported behind a `require.main` guard |
> | Undiscoverable orphan suites | `:243`, `:409` | `5177225` — `tests/run-nexus-tests.js` (`fs.truncateSync('.planning/AUDIT.jsonl', 0)`), `tests/governance/test-cadia-optimizer.js` (overwrote `.planning/STATE.md`) and `test/sovereign-status.test.js` **deleted**; `tests/{entropy-test,mca-routing-test,sre-zk-proof-test}.js` moved to `scripts/demos/*.demo.js` |
> | "the 95-file suite was never run end-to-end (multi-minute, sequential, 60 s/file)" | `:437` | Run 2026-08-16 on `0174432`: **95 passed, 0 failed, 2 skipped, 97 total, 17,286 ms** |
>
> **Still open, unchanged by that branch:** `unhandledRejection` logs and continues (the
> policy was deliberately split — `uncaughtException` now logs and **exits**);
> `timingSafeEqual` still compares UTF-16 length, not bytes, so a 64-unit/65-byte value can
> throw; `cwd: ROOT` at `bin/mindforge-cli.js:185` is deferred to v12; the four
> `finally { process.exit(0) }` suites at `:242`; every other finding below.
>
> **Measured as of.** `.planning/AUDIT.jsonl`, `celestial.db` and `.mindforge/metrics/*.jsonl`
> are gitignored, append-only local machine state, so every count taken from them is a
> timestamp. This file's **1907** audit entries (`:142`, `:180`, `:189`, `:294`, `:321`,
> `:409`) was correct on 2026-08-15; the report and plan's **1934** was correct on 08-16.
> Neither is wrong — the log grew. Re-measured 2026-08-16 on `0174432`:
> `✅ audit chain valid: 2067 entries`. `celestial.db` is now **4,231,168 bytes** (`:158`'s
> 64,933,888 was correct on 08-15) after a **local** purge of 1,381 `Synthesized Skill%` rows;
> current row counts are `skills` 696 (4 synthesized remain), `traces` 5,748,
> `traces_search` 2,796, `graph_edges` 0, `_migrations` 0, `knowledge` 12. The purge was local
> only — the DB is gitignored and enters no tarball — so DEL-01's code half is still open.

**Package:** `mindforge-cc` v11.9.1 · "MindForge — Sovereign Agentic Intelligence Framework"
**Runtime:** Node ≥18 · runtime deps: `express`, `sql.js` only · 2,859 tracked files · ~66.3k LOC JS/CJS/TS + ~7.3k LOC Python vs **291,667 tracked lines of Markdown (4.4:1)**
**Index basis:** 17 subsystem maps + 6 adversarially-verified cross-cutting themes + 2 completeness critiques. Where verification corrected an analysis, the correction is what appears below. Unresolved conflicts are flagged inline.

---

## 1. WHAT MINDFORGE IS

MindForge is an **agentic-development operating protocol** for AI coding harnesses (Claude Code, Gemini/Antigravity, Cursor, OpenCode, Copilot). It solves *process discipline for LLM agents*: plan-before-code, phase/wave execution, tamper-evident audit, cost routing, governance tiers, and a persistent knowledge graph — installed into a user's project by `npx mindforge-cc`.

Mechanically it is **a prompt corpus with a Node executor attached, not a framework with docs**. The substance is 221 slash-command prompts, 355 skills, 216 personas, 164 subagents and ~35 engine specs in Markdown; the ~66k LOC of JavaScript is instrumentation (audit hash-chain, hooks, installer, dashboard, memory stores, CLI router). The named orchestrators — `SwarmController`, `PersonaFactory`, `shard-controller.js`, `soul-engine.js` — exist **only as Markdown or not at all**; `SwarmController`, `HNSW` and `soul-engine` have **zero occurrences in any `.js`/`.cjs`/`.ts`**. Audience: solo operators and small teams running long autonomous agent sessions who want auditability and repeatable process.

---

## 2. ARCHITECTURE AT A GLANCE

### The parallel-implementation question, resolved

There are **six trees, six distinct consumers, and one language** (CommonJS). The `.cjs` extension is *not* a module boundary: 174 `.js` files under `bin/` are **100% CommonJS** (157 `require(`, 154 `module.exports`); root `package.json` sets no `"type"`, `mcp-server/package.json:6` pins `"commonjs"`. `bin/browser/regression-writer.js` is CJS — its apparent `import` is line 24 *inside a template literal* that emits a Playwright spec.

The discriminator is **`package.json` `files[]`** (publication boundary), not layering:

| Tree | Published in `mindforge-cc`? | Language | Consumer | Canonicity |
|---|---|---|---|---|
| `bin/` (174 files, ~26k LOC) | **yes** (`"bin/"`) | CJS, required in-process | `bin/mindforge-cli.js` router, hooks | canonical runtime |
| `.agent/bin/` (18 files, 11,192 LOC) | **no** | CJS `.cjs`, **shell-out only** | 72 markdown files invoke `node ".agent/bin/mindforge-tools.cjs"`; **zero** JS requires it | canonical `.planning/` document lifecycle |
| `.agent/hooks/` (10 files, 1,648 LOC) | **yes** (`.agent/hooks/`) | CJS | both `.claude/settings.json` and `.agent/settings.json` | canonical hook impl (byte-duplicated into `plugins/`) |
| `sdk/` (TS) | **no** | TypeScript | external programs; **never published by CI** | re-implementation of `bin/memory` (incompatible checksums) |
| `mcp-server/` (TS) | **no** | TypeScript | MCP stdio clients | vendors 4 SDK files verbatim |
| `plugins/mindforge/` (433 files) | **no** | generated | Claude Code plugin marketplace | **stale generated snapshot** (4 minors behind) |
| `.mindforge/` (Markdown + 2 files) | **yes** | Markdown | the LLM | the actual engine |

**Cross-tree imports are near-zero but not zero.** The single exception is deliberate and documented: `.mindforge/engine/nexus-tracer.js:11` is `module.exports = require('../../bin/engine/nexus-tracer');`, self-labelled *"Legacy Shim (v5.9.0)"* at `:2-6`. (`.mindforge/engine/` is 37 files: 35 `.md` + this shim + `integrity.json`.) Otherwise the trees are **independent adapters over a shared filesystem contract** (`.planning/*`, `.mindforge/memory/*.jsonl`, `.mindforge/celestial.db`).

```
                        ┌──────────────────────────────────────────┐
   USER / AGENT ───────▶│  HARNESS  (Claude Code | Gemini/Antigravity | Cursor | …)
                        └───────┬──────────────────────┬───────────┘
        SessionStart / PreToolUse│                      │ /mindforge:* (prompt lookup)
                                 ▼                      ▼
        ┌────────────────────────────────┐   ┌──────────────────────────────────┐
        │ HOOK LAYER (mechanical)        │   │ PROMPT CORPUS (discretionary)    │
        │ .claude/settings.json (8 hooks)│   │ .claude/commands/mindforge/ 221  │
        │ .agent/settings.json  (7 hooks)│   │ .agent/mindforge/           221  │  ← 146 differ
        │  └▶ .agent/hooks/run-with-flags│   │ .mindforge/skills/  232 (triggers)│
        │      ├ trust-gate  (exit 2)    │   │ .agent/skills/      123 (explicit)│
        │      ├ block-no-verify         │   │ .mindforge/personas/ 216         │
        │      ├ config-protection       │   │ .mindforge/engine/*.md  ← THE engine
        │      ├ prompt-guard (advisory) │   │ subagents/categories/ 164        │
        │      └ session-init ──┐        │   └───────┬──────────────────┬───────┘
        └───────────────────────┼────────┘           │ literal shell line│ @-include
                                │ injects SKILL.md   ▼ (44/221 only)    ▼
                                └───────────▶ ┌──────────────────────────────────┐
                                              │ bin/mindforge-cli.js  (26 cmds)  │
                                              │  spawnSync('node', script, args) │
                                              └───────┬──────────────────────────┘
                                                      ▼
    ┌─────────────────────────────────────────────────────────────────────────────┐
    │ bin/  engine/ autonomous/ memory/ governance/ models/ dashboard/ installer/ │
    │       migrations/ review/ revops/ sre/ security/ skills-builder/ browser/   │
    └───────┬──────────────────────────┬──────────────────────┬──────────────────┘
            ▼                          ▼                      ▼
   .planning/*  (markdown+jsonl)   .mindforge/celestial.db   .mindforge/memory/*.jsonl
            ▲                          ▲  (sql.js WASM,        ▲  (append-only)
            │                          │   NO LOCK)            │
   .agent/bin/mindforge-tools.cjs ─────┘                       └── sdk/ + mcp-server/
   (shell-out from 72 .md files)                                    (read-only clients)
```

---

## 3. SUBSYSTEM INDEX

| # | Subsystem | Purpose | Entry point | Key files | Persists |
|---|---|---|---|---|---|
| 1 | **CLI & commands** | 26-command router, no CLI framework | `bin/mindforge-cli.js:25-190` (`COMMANDS` map + `spawnSync` at `:184-188`) | `bin/install.js`, `bin/workflows/workflow-runner.js`, `bin/utils/{paths,file-io,readiness-gate,version-check}.js` | nothing directly; forces `cwd: ROOT`, sets `MINDFORGE_CLI=true` |
| 2 | **Installer & harness adapters** | copy protocol corpus into 6 harness conventions | `bin/install.js` → `bin/installer-core.js:891` `run()` / `:417` `install()` | `RUNTIMES` map `:18-97`, `SENSITIVE_EXCLUDE :292-315`, `MINDFORGE_DEV_EXCLUDE :318-327`, `bin/harness-audit.js`, `bin/installer/harness-adapter-compliance.js` | `<runtime>/{commands,agents,skills,hooks,personas}`, `CLAUDE.md`, `MINDFORGE.md`, `~/.mindforge/registry.json` |
| 3 | **Engine (markdown tier)** | the real orchestration protocol | `.mindforge/engine/autonomous/auto-executor.md` (LLM-executed) | `wave-executor.md`, `swarm-controller.md`, `persona-factory.md`, `shard-controller.md`, `verification-pipeline.md` | — (prompt corpus; ships in npm) |
| 4 | **Engine (JS tier)** | observability/governance primitives | `bin/engine/nexus-tracer.js:357` (process singleton) | `temporal-hub.js`, `council-runtime.js`, `logic-drift-detector.js`, `logic-validator.js`, `remediation-engine.js`, `sre-manager.js`, `verify-cli.js`, `temporal-cli.js` | `.planning/AUDIT.jsonl`, `.planning/history/`, `.planning/decisions/`, `celestial.db` |
| 5 | **Autonomous runner** | `/mindforge:auto` wave loop + 9 gates | `bin/autonomous/auto-runner.js:109` `class AutoRunner`, `:232` `run()` — **no production caller** | `state-manager.js`, `wave-executor.js`, `audit-writer.js:89` (the one audit primitive), `repair-operator.js`, `stuck-monitor.js`, `dependency-dag.js`, `session-guardian.sh` | `.planning/{auto-state.json,HANDOFF.json,AUDIT.jsonl,phases/*/AUTONOMOUS-REPORT.md}` |
| 6 | **Governance & audit** | hash-chained audit, CADIA impact, ZTAI identity, tier gates | `bin/verify-audit.js`; `bin/autonomous/audit-writer.js:89` | `bin/governance/{audit-hash.js (12 lines, canonical),audit-verifier.js,impact-analyzer.js,policy-engine.js,ztai-manager.js,ztai-archiver.js,quantum-crypto.js,approve.js}` | `.planning/{AUDIT.jsonl,RISK-AUDIT.jsonl,approvals/}`, `.mindforge/audit/{AUDIT.jsonl,manifests/}` |
| 7 | **Security** | destructive-shell gate + config-write block + CI unicode scan | `bin/security/trust-gate-hook.js` (PreToolUse, exit 2) | `bin/security/trust-boundaries.js:97-204` (~35 regexes, 14 audit categories), `.agent/hooks/mindforge-{config-protection,prompt-guard,block-no-verify}.js`, `scripts/ci/validate-assets.js:128-146` | — |
| 8 | **Memory & knowledge graph** | JSONL knowledge graph + TF-IDF/BM25 + sql.js trace DB | `bin/memory/cli.js` (`/mindforge:remember`); `bin/memory/vector-hub.js:602` | `knowledge-store.js`, `knowledge-graph.js`, `embedding-engine.js`, `knowledge-capture.js`, `knowledge-indexer.js`, `semantic-hub.js`, `federated-sync.js`, `retrieval-fusion.js` | `.mindforge/memory/*.jsonl`, `.mindforge/celestial.db`, `~/.mindforge/global-knowledge-base.jsonl` |
| 9 | **Dashboard** | localhost:7339 Express + SSE observability | `bin/dashboard/server.js:200` (`node bin/dashboard/server.js`; **not** a CLI command) | `api-router.js`, `metrics-aggregator.js`, `sse-bridge.js`, `temporal-api.js`, `revops-api.js` (**unmounted**), `frontend/index.html` (751 L) | `.planning/{dashboard-server.pid,steering-queue.jsonl,approvals/}`, `.mindforge/.dashboard-token` |
| 10 | **Browser runtime** | Playwright Chromium daemon :7338 + `<verify-visual>` DSL | `bin/browser/browser-daemon.js`; `daemon-manager.js` | `visual-verify-executor.js`, `qa-engine.js`, `session-manager.js`, `regression-writer.js` | `.planning/{screenshots,browser-daemon.log}`, `.mindforge/browser/sessions/*.json`, `tests/regression/` |
| 11 | **Agent harness adapter** | `.planning/` document lifecycle as a shell-callable JSON oracle | `node .agent/bin/mindforge-tools.cjs <cmd>` (~40 cmds) | `lib/{core,init,state,commands,phase,verify,frontmatter,profile-output,workstream,security,config,roadmap,template,uat}.cjs` | `.planning/{STATE.md,ROADMAP.md,REQUIREMENTS.md,config.json,phases/,workstreams/,milestones/,todos/}`, `GEMINI.md` |
| 12 | **SDK & MCP** | read-only clients for external programs | `sdk/src/index.ts`; `mcp-server/src/index.ts:277` `main()` | `sdk/src/{client,memory,events,types,commands}.ts`, `mcp-server/src/vendor/*` (generated), `scripts/vendor-sdk-into-mcp.js`, `mcp-server/build.mjs` | reads only; 1 append tool (`mindforge_memory_remember`) |
| 13 | **Models & learning** | persona/tier→model routing, pricing, cost ledger, instincts | `bin/models/model-client.js` `complete()`; `bin/learning/instinct-cli.js` | `model-router.js`, `pricing-registry.js`, `cost-tracker.js`, `cloud-broker.js`, `difficulty-scorer.js`, `bin/engine/feedback-loop.js`, `bin/eval/eval-harness.js` | `.mindforge/metrics/token-usage.jsonl`, `bin/models/performance-stats.json`, `.planning/ROI.jsonl` |
| 14 | **Skills platform** | authoring, 7-D scoring, validation, signing, registry, npm marketplace | `bin/skill-validator.js`, `bin/skill-registry.js`, `bin/skills-builder/{learn,marketplace}-cli.js` | `skill-scorer.js`, `skill-generator.js`, `source-loader.js`, `skill-registrar.js`, `bin/engine/skill-loader.js` (**4-line stub, 0 callers**) | `.mindforge/skills/`, `.mindforge/org/skills/{MANIFEST.md,SIGNATURES.json}`, `.planning/AUDIT.jsonl` |
| 15 | **Dynamic workflows** | 35 declarative multi-agent scripts for the host `Workflow` tool | `bin/mindforge-cli.js:144` → `bin/workflows/workflow-runner.js:108` (`run` **prints**, does not execute) | `.mindforge/dynamic-workflows/{index.json,REGISTRY.md,scripts/*.js}` | read-only |
| 16 | **Personas / subagents / agents** | 216 personas + 164 subagents + 6 identities | `bin/spawn-agent.js` (dry-run only); `/mindforge:agent` prompt | `.mindforge/personas/*.md`, `swarm-templates.json` (49 templates, **0 code readers**), `subagents/categories/`, `.mindforge/imported-agents.jsonl`, `scripts/build-subagent-index.js` | `.mindforge/imported-agents.jsonl` (generated) |
| 17 | **RevOps / review / research** | ROI+velocity+debt scoring, cross-model PR review, ADS council, research packaging | `bin/review/cross-review-engine.js:94`; `bin/dashboard/revops-api.js` (unmounted) | `bin/revops/{roi-engine,velocity-forecaster,debt-monitor,market-evaluator,router-steering-v2}.js`, `bin/review/{ads-engine,finding-synthesizer,ads-synthesizer}.js`, `bin/research/research-engine.js` | `.planning/{phases/*/CROSS-REVIEW-*.md,decisions/ADS-*.md,PLAN.md (overwritten)}` |
| 18 | **Worktree engine** ⚠ *unreviewed* | `git merge-tree` merge-readiness, `node_modules` symlinking across worktrees, hunk-level `git apply` | `/mindforge:worktrees` | `bin/worktree/engine.js` (497 LOC) | worktrees, `gh` draft PRs |
| 19 | **Tests / CI / release** | bespoke runner, asset gate, release scorer, 10 workflows | `tests/run-all.js`; `scripts/ci/validate-assets.js`; `bin/utils/readiness-gate.js` | `tests/packaging-allowlist.test.js`, `tests/version-consistency.test.js`, `.github/workflows/{mindforge-ci,control-plane,execution-plane,mindforge-release}.yml` | `coverage/`, `*.tgz` |
| 20 | **Protocol / doc corpus** | the "constitution" + 134 docs | `.agent/skills/mindforge-neural-orchestrator/SKILL.md` (hook-injected) | `SOUL.md`, `MINDFORGE.md`, `.claude/CLAUDE.md` ≡ `.agent/CLAUDE.md`, `CODEBASE-MAP.md`, `.mindforge/{MINDFORGE-SCHEMA.json,MINDFORGE-V2-SCHEMA.json,schemas/}` | — |

---

## 4. EXECUTION MODEL

There are **two boundaries with opposite reliability**.

### 4a. Hook boundary — mechanical, verified working

The only guaranteed code execution. `.claude/settings.json:15-84` registers **8 hooks**; `.agent/settings.json` registers the same 7 minus `instinct-capture` (and has **no `permissions` key** — its only top-level key is `hooks`).

```
harness event
  → node .agent/hooks/run-with-flags.js <id> <relScript> <profilesCsv>
  → read ≤1 MB stdin
  → isHookEnabled()          .agent/hooks/lib/hook-flags.js:57-69
                             (MINDFORGE_HOOK_PROFILE, MINDFORGE_DISABLED_HOOKS)
  → resolve script vs install root; reject traversal        :123-129
  → if /module\.exports/ && /run/  → require() in-process   :144-170
    else                          → spawnSync (30 s)        :173-186
  → exit code → harness (only 2 blocks in Claude Code)      :201
```

Verified: `echo '{}' | node .agent/hooks/run-with-flags.js mindforge-session-init .agent/hooks/mindforge-session-init_extended.js …` returns JSON whose `hookSpecificOutput.additionalContext` contains **the entire 5,275-byte `mindforge-neural-orchestrator/SKILL.md`** wrapped in `<EXTREMELY_IMPORTANT>` (built at `:24`, printed at `:35`; the tag is verbatim from `.agent/hooks/mindforge-session-init_extended.js:24` — an earlier revision of this file showed it backslash-escaped, which was a transcription artefact) `[corrected 2026-08-16]`. That is the whole protocol bootstrap. A second SessionStart hook (`:79`) runs `mindforge-check-update.js`.

`trust-gate-hook.js` has no `module.exports`, so it takes the spawn path and its `exit 2` **does** propagate. The six `process.exit(0)` sites in `run-with-flags.js` (`:113,118,129,135,169,206`) are all *pre-execution*; the real fail-open hole is `:198` — a killed/timed-out spawn yields **exit 1**, which does not block. Every hook, including `trust-gate`, is disableable via `MINDFORGE_DISABLED_HOOKS` with no allowlist exemption.

### 4b. CLI path — thin, process-per-command

```
$ node bin/mindforge-cli.js <cmd> [args]
  :13-21   argv slice; --verbose/-v strips itself after setting MINDFORGE_VERBOSE (read by nothing)
  :144-148 `workflow` intercepted BEFORE --version/--help
  :25-141  literal COMMANDS object (26 entries), no commander/yargs
  :160-177 unknown → hand-rolled levenshtein() at :195
  :180     finalArgs = COMMAND_ARGS.length > 0 ? COMMAND_ARGS : (defaultArgs || [])   ← BUG
  :184-190 spawnSync('node',[script,...finalArgs],{cwd:ROOT,stdio:'inherit',env:{MINDFORGE_CLI:'true'}})
           exit code propagates
```

Then, e.g. `hindsight` → `bin/engine/temporal-cli.js:38` → `bin/hindsight-injector.js` → `TemporalHub.rollbackTo` + `appendAuditEntrySync` + `auto-state.json` rewrite.

**Audit write (the strongest engineering in the repo)** — `bin/autonomous/audit-writer.js:89-123`: immutable spread stamp (`:94-96`) → `previous_hash` from a per-path `Map` cache or `readLastHash()` → `_hash = sha256(JSON.stringify({...entry, previous_hash}))` via the single canonical hasher `bin/governance/audit-hash.js:9` → `openSync('a')`+`writeSync`+`fsyncSync`+`closeSync` (`:112-118`). Independently reproduced: a Python reimplementation regenerated **all 1907** `_hash` values in `.planning/AUDIT.jsonl` byte-exactly.

### 4c. Slash-command path — discretionary, unenforced

No command→handler manifest exists. `/mindforge:auto` resolves by filesystem convention to `.claude/commands/mindforge/auto.md` — 26 lines of prose with **zero `bin/` references**, and there is no `auto` key in `COMMANDS`. Of 221 command files, **48 mention `bin/` and only 44 contain a `node bin/…` line**; `plan-phase.md` has none. **~80 % of the command surface has no executable hop at all.** Whether a named shell line runs depends on model compliance.

The `.agent/bin/` invocation model is the third pattern: prompt bodies shell out and parse JSON, with a `@file:` overflow protocol (`>50 KB` spills to tmp, `.agent/bin/lib/core.cjs:156-164`) that callers must unwrap themselves (`.agent/workflows/mindforge-execute-phase.md:72`).

**Boundary summary:** documented protocol strength lives in Markdown; enforced strength lives in ~500 LOC of hook + audit code.

---

## 5. DATA & STATE

> ⚠ **Almost every artifact below is git-ignored local machine state.** `.gitignore` ignores `.planning/AUDIT.jsonl` (`:74`), `RISK-AUDIT.jsonl` (`:52`), `.mindforge/audit/AUDIT.jsonl` (`:80`), `token-usage.jsonl` (`:82`), `*.db` (`:55`), `ROI.jsonl`. Only `.mindforge/config.json`, both schemas, `.planning/HANDOFF.json`, `skills-lock.json`, `default-policies.jsonl` and one approval file are tracked. Row counts characterise one operator's laptop; a fresh install ships none of it.

### 5a. `.mindforge/celestial.db` — sql.js/WASM SQLite, 64,933,888 bytes

Owner: **`bin/memory/vector-hub.js`** (the only module that opens it). Tables created there: `traces`, `remediations`, `skills`, `attestations` (+`did`,`signed_message` via guarded `ALTER TABLE` at `:161-162`), `mesh_config`, `knowledge`, `graph_edges`, `_migrations`; plus `fts4(...tokenize=porter)` virtuals `traces_search`, `knowledge_search`; 6 indexes incl. `idx_migrations_name UNIQUE`.

| Table | Rows (live) | Note |
|---|---|---|
| `traces` | 5625 (reasoning_trace 4203 / span_started 717 / span_completed 705) | 573 unclosed spans |
| `traces_search_content` | **2733** = `count(DISTINCT trace_id)` | `vector-hub.js:401-404` DELETEs by `trace_id` then INSERTs → **51 % of trace text unsearchable**; hits fan out to siblings |
| `skills` | 2032 | vs 232 authored engine skills |
| `attestations` | 1612 | |
| `remediations` | 677 | |
| `knowledge` | 12 | JSONL side is 0 |
| `graph_edges` | **0** | v9 migration reads `source_id`/`from`; writers emit `sourceId` → NOT NULL insert throws, swallowed as `skippedLines` |
| `_migrations` | **0** | ⇒ `v9-unified-memory.js` never ran here; schema came from `CREATE TABLE IF NOT EXISTS` |
| `workflow_runs` | 0 | **foreign** — different DDL style, zero code references anywhere |

**No lock of any kind.** `init()` slurps the whole 64.9 MB (`:91-93`); `save()`/`saveSync()` export the full DB and `renameSync` over the target (`:279-287`, `:572-590`), autosaving every 10 writes (`:299-305`). Two MindForge processes silently lose one another's entire DB delta (last-rename-wins). `PRAGMA journal_mode=WAL` (`:99`) and `busy_timeout` (`:101`) are inert on an in-memory DB. A leaked `celestial.db.tmp.61984` (0 bytes) sits alongside.

### 5b. Append-log family

| Path | Bytes | Lines | Chain | Owner |
|---|---|---|---|---|
| `.planning/AUDIT.jsonl` | 818,332 | 1907 | **valid** (0 breaks, 0 self-mismatches) | `audit-writer.js:89` — 8 call sites |
| `.planning/RISK-AUDIT.jsonl` | 774,875 | 2150 | **BROKEN**, 312 link breaks | `policy-engine.js:167` via `AuditWriter` |
| `.planning/ROI.jsonl` | 52,224 | 192 | unchained | `bin/models/model-broker.js:100` (dead code) |
| `.mindforge/metrics/token-usage.jsonl` | 144,976 | 1066 | unchained | `bin/models/cost-tracker.js:74` |
| `.mindforge/imported-agents.jsonl` | 61,745 | 164 | index | `scripts/build-subagent-index.js:127` |
| `.mindforge/audit/AUDIT.jsonl` | 436 | 2 | **unchained**, fails verifier at entry 0 | **`tests/ztai-enterprise.test.js:50-62`** |
| `.mindforge/memory/pattern-library.jsonl` | 85 | 1 | — | synthetic fixture |
| `bin/governance/policies/default-policies.jsonl` | 795 | — | **not JSONL** (`<!-- slide -->`-separated pretty JSON) | never loaded |

`.planning/AUDIT.jsonl` field census: only `event,id,timestamp,previous_hash,_hash` on all 1907. `trace_id`/`span_id` 1716, `agent` 763, `thought/entropy/drift_score` 572. **Zero rows** carry `did`, `signature`, `session_id` or `phase` — refuting `.mindforge/audit/AUDIT-SCHEMA.md:38-48`'s "11 universal fields", which also omits the only two real integrity fields.

`token-usage.jsonl`: 1066 **identical** synthetic rows (`gpt-4o`, 1000/500 tok, $0.0125), total $13.325, from `tests/model-routing.test.js:35-40` against `process.cwd()`. Fields are `cost_usd`; the dashboard reads `total_cost_usd` (`metrics-aggregator.js:130,307`) — and `tests/dashboard.test.js:209-210` seeds the wrong shape, so the mismatch is test-validated.

### 5c. Markdown / JSON state

| Path | Format | Owner | Notes |
|---|---|---|---|
| `.planning/STATE.md` | md body + **derived** YAML frontmatter | `.agent/bin/lib/state.cjs:759-804` | **only locked writer** in the repo: `O_EXCL` lock, 10 retries, busy-wait, 10 s stale reclaim, then *"write anyway"* |
| `.planning/ROADMAP.md`, `REQUIREMENTS.md` | md | `phase.cjs:712`, `roadmap.cjs:313`, `milestone.cjs:76` | **unlocked** read-modify-write; `withPlanningLock` (`core.cjs:485`) has **zero callers**, `.planning/.lock` never created |
| `.planning/HANDOFF.json` | JSON, `schema_version 1.0.0` | `state-manager.js`, `auto-runner.js:610` | 374 B, `handoffs: []` |
| `.planning/auto-state.json` | JSON | `state-manager.js:99` (atomic) **and** `auto-runner.js:677-691` (raw, non-atomic) | **does not exist in this repo** |
| `.planning/history/<auditId>/` | copied `.md/.json/.yml/.log` + HMAC `SNAPSHOT-META.json` | `bin/engine/temporal-hub.js:49-103` | 52 dirs; GC 50 snapshots / 7 days |
| `.planning/approvals/*.json` | JSON, **3 incompatible shapes** | `approve.js:110`, `approval-handler.js:128`, `/mindforge:approve` prompt | one **git-tracked** file gates CI forever |
| `.planning/steering-queue.jsonl`, `STEER.json` | JSONL | dashboard `api-router.js:192`, `steer.js:80` | both read-and-discarded or never read |
| `.mindforge/config.json` | JSON, v11.9.1, 16 keys | `bin/governance/config-manager.js` | `wave_concurrency:3`; **`wave_execution` ABSENT** ⇒ DAG + rollback off; `temporal{50,7}`; `pqas_enabled:false`, provider `"Dilithium-5 (simulated — inactive)"`; `cost_routing.shadow_mode:true` |
| `.mindforge/memory/*.jsonl` | append-only, last-write-wins by `id` | `knowledge-store.js`, `knowledge-graph.js` | **empty**: `readAll()`=0, `readAllEdges()`=0; `knowledge-base.jsonl`, `graph-edges.jsonl`, `embeddings.json` all absent |
| `~/.mindforge/{registry.json, global-knowledge-base.jsonl, memory/global/*, observer-last-run.log}` | | installer, `global-sync.js`, `semantic-hub.js:14`, `session-guardian.sh` | **two disjoint "global" memory locations** |
| **Missing but documented** | | | `token-ledger.jsonl` (`cost_routing.ledger_path` — **zero readers/writers**), `session-quality.jsonl`, `phase-metrics.jsonl`, `skill-usage.jsonl`, `instinct-store.jsonl`, `SIGNATURES.json`, `.mindforge/evals/*` (only `.gitkeep`) |

---

## 6. EXTENSION POINTS

| Surface | Contract | Registration | Machine gate | Verdict |
|---|---|---|---|---|
| **Engine skill** (232) | `.mindforge/skills/<kebab>/SKILL.md`, frontmatter `name,version,min_mindforge_version,status,triggers` (inline comma-separated); optional `compose:` (75 files, 2-level cap) | drop-in | `validate-assets.js:91-100` (name/version/status) **+** `tests/skills-platform.test.js:105-128` (semver, status enum, **≥10 triggers**, name≡dirname, mandatory-actions section) | **best-enforced surface.** 0/232 name mismatches |
| **Extended skill** (123) | `.agent/skills/<name>/SKILL.md`, `name`+`description` | drop-in | `validate-assets.js:101-108` (**name presence only**) | 15 name≠dirname, incl. both `_extended` protocols `CLAUDE.md` mandates |
| **Subagent** (164) | `subagents/categories/NN-*/x.md`, `name,description,tools[,model→sonnet]`; name must match `/^[A-Za-z0-9-_]+$/` | `node scripts/build-subagent-index.js` → `.mindforge/imported-agents.jsonl` (+ 3 more generators) | `validate-assets.js:109-117` + `tests/subagent-import.test.js` (164 lines, 16 `-cc` renames, path containment) | works; index freshness **not** gated |
| **Persona** (216) | `.mindforge/personas/<file>.md`, XML-ish body; resolved **by filename** (`bin/spawn-agent.js:110`) | drop-in | **none** — only in the unicode-scan root list (`:135`) | 197/216 declare a `name` ≠ filename; one duplicate declared name |
| **Dynamic workflow** (35) | `.mindforge/dynamic-workflows/scripts/<name>.js`: `export const meta` + top-level `await` against host globals `args, phase, log, agent, parallel, pipeline, budget`; **zero imports** | **4 manual edits**: script, `index.json`, `.agent/mindforge/wf-<n>.md`, `.claude/commands/mindforge/wf-<n>.md` | `tests/workflow-registry.test.js` — enforces `meta.name`≡filename (`:90-98`) and command-file existence, but **not** description/phase equality | registry↔script↔command verified intact for all 35 today |
| **Slash command** (221) | `.md` + `description:` frontmatter | drop-in, dual-mirrored | `validate-assets.js:118-127` | 146/221 mirrors **differ** |
| **Hook** | export `run(input)` → `{exitCode,stderr,additionalContext}` **or** stdin/exit-code script | `.claude/settings.json` **and** `.agent/settings.json` (**and** `plugins/mindforge/hooks/hooks.json`) | none | 3 registration sites, 2 byte-identical impl copies |
| **MCP tool** (7) | zod `RawShape` + async handler + annotations | `registerTool()` funnel, `mcp-server/src/index.ts:81-96` (one cast to dodge TS2589) | `mcp-server/smoke.mjs` — **unwired** (no npm script, no CI) | clean design; must re-run `vendor-sdk-into-mcp.js` + `build-mindforge-plugin.js` |
| **Harness adapter** | add key to `RUNTIMES` (`installer-core.js:18-97`) + `ADAPTER_RECORDS` (`harness-adapter-compliance.js:58-150`, 11 required fields, 7 records = 6 runtimes + `terminal-only`) | code edit | `npm run harness:compliance -- --check` — **byte-equality** against the marker block in `docs/architecture/harness-adapter-compliance.md:20-30`; **not wired to CI** | the repo's only doc-generated-from-code gate |
| **Plugin / marketplace** | `plugins/mindforge/.claude-plugin/plugin.json` (the plugin manifest, 11.5.1) **and** `.claude-plugin/marketplace.json` — the repo-root `.claude-plugin/` contains *only* `marketplace.json`, no `plugin.json` `[corrected 2026-08-16]`. Per-category subagent manifests live at `subagents/categories/NN-*/.claude-plugin/plugin.json` | `scripts/build-{mindforge-plugin,subagent-plugins,plugin-marketplace}.js` | `tests/plugin-packaging.test.js` — **hard-pins stale counts** (182/164/74) | see §9-#12 |

**Declarative install engine is INERT and says so in-band:** `.mindforge/manifests/{install-modules,install-profiles,install-components}.json` (17 modules / 3 profiles / 5 components) + `bin/installer/install-manifests.js` (`resolveInstallPlan` deliberately **throws** if a target is passed, `:131-137`) + `bin/installer/install-state.js` — referenced only by `tests/install-manifests.test.js:24`.

---

## 7. QUALITY & RELEASE

### Test architecture

`tests/run-all.js` is the entire framework: flat `readdirSync` filtered to `.endsWith('.test.js')` (`:34-45`, with a **dead** `f !== 'run-all.js'` filter at `:37`), each file `execFileSync`'d as a child `node`, classified **purely on exit code** (`:126-144`), stdout **discarded on PASS** (`:129-132`), summary counts **files** (`:148-153`). Directives: `// @skip:` (2 users) and `// @timeout:` (1 user, undocumented in `tests/README.md`).

| Metric | Value |
|---|---|
| `tests/*.test.js` | 97 · **95 execute** (`browser`, `sre-integration` are `@skip`) |
| `test(` registrations | **865** (word-boundary); `assert.`+`assert(` = 1781 |
| Files with **zero** assertions | **10** total, **9 running**: `learning-engine`, `revops-roi`, `semantic-hub`, `v7-pillar-integration`, `v8-mesh-sync`, `v8-orbital-governance`, `v8-persistence`, `v8-skill-evolution`, `ztai-enterprise` — `console.log('✅')` inside `if`, cannot fail on a wrong value |
| Bare-throw, no collector | 5: `instinct-capture`, `otel-exporter`, `parse-workflow-args`, `retrieval-fusion`, `workflow-registry` |
| Tautological (reimplement the SUT) | `e2e.test.js` (618 L, requires **zero** `bin/`), `wave-engine.test.js`, `ci-mode.test.js` ≈ 1,100 LOC |
| **Undiscoverable orphans** | *As measured on `f7b9e180`:* `tests/{entropy-test,mca-routing-test,sre-zk-proof-test,run-nexus-tests}.js`, `tests/governance/`, `tests/swarms.test.md`, **`test/sovereign-status.test.js`** (singular dir — tracked, **fails**, asserts `pqas.active === true`). **All but `tests/swarms.test.md` are gone as of `5177225`, so those citations no longer resolve** `[corrected 2026-08-16]`: `run-nexus-tests.js`, `governance/test-cadia-optimizer.js` and `test/sovereign-status.test.js` were **deleted** (the first two destroyed `.planning/AUDIT.jsonl` and `.planning/STATE.md`; the third called a function with zero references in `bin/`); the other three moved to `scripts/demos/{entropy,mca-routing,sre-zk-proof}.demo.js`, outside `files[]` |
| Style contract violated | `tests/README.md:3-6` claims one collector style; 14 files use `node:test`, 5 use bare asserts |
| Coverage | CI floor `--lines 30` only (`mindforge-ci.yml:146`); no `.c8rc`/`.nycrc`; `npm run coverage` thresholdless; `npm run test:single` is literally `node` (no-op) |
| SDK tests | `sdk/tests/*` run only via `cd sdk && npm test` — **no workflow calls it** |

### CI topology

Three pipelines fire on PRs: `mindforge-ci.yml` (`:5-7`, incl. `feat/**` pushes), `control-plane.yml` (`:4-7`), `mindforge-ai-review.yml` (`:3-4`, no branch filter).

**Correction to a widely-repeated claim:** `scripts/ci/validate-assets.js` **does** run on pull requests. `control-plane.yml:102-106` (`routing`) has **no event guard** — only `if: needs.governance-gate.result == 'success'` — and calls `execution-plane.yml`, whose `:42-44` runs `npm test` = `validate-assets.js && run-all.js`. Its sibling `ai-review` (`:112-116`) *does* gate on `github.event_name`, proving the omission is deliberate. `mindforge-ci.yml:146` bypasses the `&&` chain, but that is not the only PR path. **Unresolved:** whether `routing` is a *required* status check (branch-protection config, not in-repo).

Lint: `no-unused-vars: 'warn'`, only `semi`/`quotes` are errors (`eslint.config.mjs:16-21`); root CI runs `--max-warnings=9999` (`:138`) vs SDK `--max-warnings 0` (`:140`). `hermes-agent/` (688 MB, untracked but **not gitignored**, absent from `ignores`) means local `eslint .` and `git status` diverge from CI permanently.

### Gates

| Gate | Command | Reality |
|---|---|---|
| `npm test` | `validate-assets.js && run-all.js` | the whole local gate; `.husky/pre-commit` is exactly `npm test` — no security scan, no readiness gate, no commit-msg hook |
| Asset validation | `scripts/ci/validate-assets.js` | 4 per-root frontmatter schemas + **blocking** invisible-unicode scan (ZW, bidi embed/override/isolate, U+E0000-E007F Tag block) over 7 roots |
| Release readiness | `npm run release:ready` | 6 checks / 14 pts (`readiness-gate.js:78-131`); **no workflow invokes it**; ignores `mcp-server`, Formula, Dockerfile, tarball |
| Harness audit / compliance | `npm run harness:audit`, `harness:compliance -- --check` | **neither is in any workflow**; harness-audit exits non-zero only on a thrown error |
| Tag release | `mindforge-release.yml` | `npm test` → tag≡`package.json` hard fail (`:33-46`) → npm-already-published probe → `npm pack` → `npm publish --provenance` (`mindforge-cc`, then `mindforge-mcp-server`) → GH Release. `mindforge-sdk` is **never published**. MCP built with `npm install`, not `npm ci`. |
| GitLab | `.gitlab-ci-mindforge.yml` | runs `bin/validate-config.js` (proven no-op) + `tests/ci-mode.test.js` (tautological) — **two checks that cannot fail** |
| Dead workflow | root `auto-pr.yml` | diverged duplicate of `.github/workflows/auto-pr.yml`; GitHub reads only the latter |

### Packaging

`package.json` `files[]` = 47 entries. Real tarball ≈ 1968 files / 2.97 MB packed. One dead entry: `.mindforge/docs/` does not exist. A 51-line **`.npmignore` also exists and conflicts today** — `.claude/` (`:10`), `docs/References/` (`:28`), `docs/Templates/` (`:30`), `*.jsonl` (`:22`) all appear in `files[]`; observed behaviour is allowlist-wins, but `tests/packaging-allowlist.test.js:129-139`'s "no `.db` ships" assertion depends on `.npmignore:17-19` still being honoured.

Changelog discipline is the strongest release artifact: `changelogs/index.json` ↔ 99 `v*.md` files, **zero set difference**, and `v11.9.1.md` exists. Only `RELEASENOTES.md` is stale (`grep -c '11\.9\.1'` = 0).

**Version drift is 4-way, gated by nothing:**

| Version | Files |
|---|---|
| **11.9.1** | `package.json`, `sdk/package.json`, `mcp-server/package.json`, `.mindforge/config.json:2`, `MINDFORGE.md:6`, `CHANGELOG.md:3` |
| **11.5.1** | `mcp-server/server.json:5,17`, `plugins/mindforge/.claude-plugin/plugin.json`, `Formula/mindforge.rb:4-5,18` (+ pinned sha256 + `assert_match "11.5.1"`), `Dockerfile:12` |
| **11.4.0** | `mcp-server/src/index.ts:59` — **what the running MCP server advertises** |
| **11.9.0** | ~14 narrative docs (`README.md:9`, `CLAUDE.md:5`, `AGENTS.md:5`, `CODEBASE-MAP.md:1`, `docs/*`) |

`tests/version-consistency.test.js` covers 5 files: `package.json`, `.mindforge/config.json`, `sdk/package.json`, `MINDFORGE.md [VERSION]`, `sdk/README.md`. It covers **none** of the drift above.

---

## 8. SECURITY & TRUST

### Implemented and working

| Control | Location | Notes |
|---|---|---|
| **TrustGate** destructive-shell PreToolUse block | `bin/security/trust-gate-hook.js:27-28,37`; catch at `:41-47` also blocks | genuinely fail-closed. `trust-boundaries.js:97-101` de-obfuscates `${IFS}`/quotes/backslashes (removal-only) before ~35 regexes across 14 numbered audit categories |
| **Hash-chained audit** | `bin/governance/audit-hash.js` (12 lines) shared by writer + `audit-verifier.js` | reproduced independently across all 1907 entries. Provides tamper-evidence for content and ordering — **not** replay or truncation resistance (`SECURITY.md:146` states this correctly) |
| **Invisible-unicode CI scan** | `scripts/ci/validate-assets.js:128-146` | blocking; 7 roots incl. `.mindforge/personas` (upstream imports) and `.mindforge/rules` |
| **Config-write block** | `.agent/hooks/mindforge-config-protection.js` | exit 2 on modifying existing linter/tsconfig/commitlint configs |
| **`--no-verify` guard** | `.agent/hooks/mindforge-block-no-verify.js` (552 L) | real shell tokenizer + git option table; **bypassable** — see below |
| **Path-traversal defense-in-depth** | `bin/spawn-agent.js:24,45,57,86` | allowlist → trusted-index exact lookup → post-resolve containment. **`identity` mode (`:102`) skips `assertSafeName`** |
| **Permissions deny baseline** | `.claude/settings.json` (`~/.ssh`, `~/.aws`, `**/.env*`, `curl|bash`, `ssh`, `scp`, `nc`) | **absent from `.agent/settings.json`**; only `harness-audit.js:322-328` checks it, Claude-only (but `:145` *does* read the `.agent` file, and `:330-336` requires trust-gate in **both**) |
| **Honest simulation disclosure** | `.mindforge/config.json:65-71`, `MINDFORGE.md:29,103`, `sre-manager.js:102` (`zeroKnowledge:false`), `logic-drift-detector.js:1-13` | the code is repeatedly more candid than the marketing docs |

### Aspirational, broken, or misdescribed

| Claim | Reality |
|---|---|
| "All entries must be **Merkle**-linked" (`.claude/CLAUDE.md`, `SECURITY.md`) | `audit-hash.js:9` is a **linear back-link chain**. The only "Merkle" code, `ztai-archiver.js:34-45`, is `cumulative = sha256(cumulative + h_i)` and its own comment (`:39`) says *"Merkle Root equivalent"*. No inclusion proofs; verification is O(n) full replay |
| `soul-engine.js` SOUL-score STOP gate | **zero files match `soul-engine`**. Instructed by `.claude/CLAUDE.md:46`, `.agent/CLAUDE.md:46`, `plugins/mindforge/skills/mindforge-protocol/SKILL.md:57`, **and the shipped auto-trigger skill `.mindforge/skills/agent-architecture-audit/SKILL.md`**. Sole code reference is `harness-audit.js:386` — a substring test that scores itself PASS |
| PQAS / ZK / lattice signatures | gated off (`experimental.pqc_demo:false`); `quantum-crypto.js:49-53` throws by default; `verifyZKProof` returns `{verified:false,'no_verifier_configured'}`; **no CLI entry point**, so `security-scan.md:24`'s mandated integrity check cannot run |
| Skill attestation | structurally impossible: `ztai-manager.js:148` is `new Map()` (no persistence), `:252-254` **throws** for unknown DIDs. `skill-registry.js sign` mints an ephemeral DID and exits. `skill-validator.js` never prints `results.attestation` (`:176-208`) — but does set `valid=false` → `Result: INVALID` + exit 1, so the failure is *unprintable*, not silent |
| Skill supply-chain scanning | `skill-validator.js:153` is one substring: `!/IGNORE ALL PREVIOUS/i`. `.mindforge/distribution/registry-client.md`'s mktemp+chmod+`npm audit`+injection-abort protocol has **no implementation** and is stripped from user installs |
| `scripts/ci/check-unicode-safety.js` | **does not exist**; cited at `MINDFORGE-AGENTIC-SECURITY.md:96,173`. Folded into `validate-assets.js` (`:7`) |
| Kill switch / heartbeat dead-man | `session-guardian.sh` is a **pre-spawn admission gate** (active hours, cooldown, idle); zero `kill`/`SIGKILL`/heartbeat code. `process.kill(-pid` appears nowhere in `bin/` |
| MCP manifest pinning | `trust-boundaries.js:27-67` `pinManifest`/`verifyManifest`/`tagUntrusted` — **zero runtime callers**. `.claude/settings.json` and `.mcp.json` are absent from `config-protection`'s `PROTECTED_FILES` |
| Snapshot tamper detection | implemented-with-a-hole: `temporal-hub.js:22` `HMAC_KEY = 'mindforge-temporal-v3'` (shipped literal ⇒ forgeable); `:40` `timingSafeEqual` on unequal lengths throws `RangeError` whose message matches neither substring test at `:134` ⇒ falls to `:138` *"proceeding without integrity check"* and restores anyway |
| SSRF hardening | real but **TOCTOU-vulnerable**: `source-loader.js:36` `dns.lookup` (first address, no `{all:true}`) then `:67` reconnects **by hostname**. `PRIVATE_RANGES` (`:19-28`) omits `0.0.0.0/8`, `100.64.0.0/10`, IPv4-mapped IPv6 |
| Policy engine | loads exactly **one** policy — `critical-data.json` = `{effect:"PERMIT", max_impact:100}`. **Zero DENY rules.** `default-policies.jsonl` fails the `.endsWith('.json')` filter (`policy-engine.js:185`) *and* is not JSONL; its intended DENY also inverts `min_tier` (`:205`) |
| Security Health Score | **implemented but input-starved and unreachable**: `bin/revops/debt-monitor.js:19-49` exists; `/api/revops` 404s; even mounted it throws (object-vs-array); and **no code anywhere emits `security_finding` or `policy_bypass`** — only two readers exist. Pinned at 100/"Excellent" |
| Env kill switches | every gate incl. `trust-gate` is disableable via `MINDFORGE_DISABLED_HOOKS` (`hook-flags.js:57-69`), while `MINDFORGE-AGENTIC-SECURITY.md:41` lists environment variables as an attack surface |
| Injection-pattern lists | **five** copies with different contents: `skill-validator.js:153`, `skills-builder/skill-scorer.js:15-23`, `.agent/bin/lib/security.cjs:121-145`, and two byte-identical prompt-guards (which self-document as a declared subset at `:17`) |
| Unicode scan coverage | **excludes** `.claude/CLAUDE.md`, `.agent/CLAUDE.md`, `MINDFORGE.md`, `SOUL.md` (the entire declared Source-of-Truth Hierarchy), `.agent/workflows/` (130 XML pipelines), `.mindforge/engine/*.md`, `agents/*/IDENTITY.md`, `plugins/mindforge/**` |
| Two audit logs, wrong one signed | `ztai-archiver.js:12` defaults to `.mindforge/audit/AUDIT.jsonl` (2 rows, unchained). The 1057 manifests attest **that**, not the real 1907-entry chain |

---

## 9. NOTABLE FINDINGS

Ranked by consequence. All verified unless marked *(relayed)*.

**1. Every hook in a plugin-marketplace install is a silent no-op — including TrustGate and the protocol bootstrap.** Two independent defects. (a) `plugins/mindforge/scripts/lib/` was never generated: `run-with-flags.js:24` requires `./lib/hook-flags`, but `scripts/build-mindforge-plugin.js:135-137` copies with a flat `readdirSync` + `.endsWith('.js')` filter that skips `lib/`. Executed against a plugin-tree copy: `Error: Cannot find module './lib/hook-flags'`, exit 1 (repo wiring on the same input returns `{"decision":"block"}`, exit 2). (b) `scripts/build-mindforge-plugin.js:149-152` rewrites with `/node\s+\.agent\/hooks\/([\w.-]+\.js)/` — **non-global, anchored on `node `** — so it rebases only the dispatcher and leaves the *second positional argument* as `.agent/hooks/x.js` (`plugins/mindforge/hooks/hooks.json:8,12,23`). `run-with-flags.js:100-102,123` resolves it against `CLAUDE_PLUGIN_ROOT`, where no `.agent/` or `bin/` exists ⇒ `:132-136` echo stdin, **exit 0 = ALLOW**. `trust-gate-hook.js` lives in `bin/security/` and was never bundled at all. `tests/plugin-packaging.test.js:114` uses the same prefix-only pattern and passes green.

**2. The autonomous engine reports success without doing any work, and nothing starts it.** `bin/autonomous/auto-runner.js:370-372` — the entire per-task body is `writeAudit('task_started')`, `writeAudit('task_completed')`, `completedTasks.add(task.id)`. No executor, subagent, plan read, or commit. `complete()` then prints `✅ Phase N complete — N/N tasks`. `bin/autonomous/wave-executor.js:132-182` *does* implement real executor-awaiting dispatch, but `auto-runner` calls only `.planWaves` (`:569`) — so `executeWave` is **dead code, not a no-op**, and the four audit callbacks wired at `:129-133` are unreachable. `new AutoRunner` appears only in 6 test files. The daily `cron` job `.github/workflows/mindforge-autonomous.yml:46` runs `bin/autonomous/headless.js`, a module with no entrypoint — verified: `node bin/mindforge-cli.js headless --phase 1` prints its banner and exits 0 doing nothing (same for `harvest`, `self-heal`).

**3. The audit-chain concurrency hazard is LIVE, not historical.** `.planning/RISK-AUDIT.jsonl` has **312** link breaks (0 self-hash mismatches; 3 legacy rows with no `_hash` at all, which is why the verifier dies at entry 0). Two mechanisms: 307 rows null-seeded `previous_hash`, plus **9 transposition pairs** (index 755 carries the hash expected at 756 and vice-versa). Split at the UC-04b unification commit `55bcf263` (2026-05-30T13:16Z): **303 before, 9 after**, the 9 falling in `20:25:01Z–20:30:16Z` the same evening. `bin/autonomous/audit-writer.js:70-71` admits correctness holds *"only under the single-operator model"*; nothing enforces it — no lockfile, no pid guard, on any `.jsonl`. Also: `.mindforge/celestial.db` has **no lock at all** and whole-file `renameSync` saves silently discard a concurrent process's entire delta.

**4. `mindforge-tools commit --no-verify` is a first-class, documented git-hook bypass.** `.agent/bin/lib/commands.cjs:299-301`: `// Commit (--no-verify skips pre-commit hooks, used by parallel executor agents)` then `commitArgs.push('--no-verify')` → `spawnSync('git', …)` at `core.cjs:434`. It never crosses the Bash tool boundary, and the guard requires a literal `git` token (`mindforge-block-no-verify.js:281`). Verified: `git commit -m x --no-verify` → BLOCKED/exit 2; the `mindforge-tools` form → exit 0. The hook whose header (`:5`) says *"AI agents cannot skip"* is bypassed by design, and the flag is advertised in the tool's own usage text (`.agent/bin/mindforge-tools.cjs:22`).

**5. `bin/validate-config.js` can never fail, and a second broken parser silently defaults model routing.** `:36` parses `/^([A-Z_]+)=(.+)$/`; `MINDFORGE.md` has **0** such lines and **41** bracketed `[KEY] = value` lines. Compounding: the 31 `MINDFORGE-SCHEMA.json` properties have **∅ key overlap** with those 41, and **no property sets `required`**, so both the missing-value error (`:47`) and every type check (`:52 if (!value) continue`) are dead. Verified output: `✅ MINDFORGE.md valid — 0 settings configured`, exit 0. It is a real CI step (`mindforge-ci.yml:38`, `.gitlab-ci-mindforge.yml:12`). A **second** `^KEY=` parser at `bin/models/model-router.js:48` means `[PLANNER]`/`[EXECUTOR]`/`[SECURITY]` are ignored and routing runs on hardcoded `DEFAULTS` (`:11-22`). A correct bracket-aware parser already exists at `sdk/src/client.ts:141-158`. *Note: the `CLAUDE.md` pre-commit mandate names the **slash command** `mindforge:security-scan` (a 242-line prompt with real grep patterns), not this CLI verb — the defect is that the mandated control has no code gate, and `.husky/pre-commit` is only `npm test`.*

**6. `defaultArgs` are replaced, not prepended — 7 commands break in exactly their documented usage, and one mis-routes into a real install.** `bin/mindforge-cli.js:180`. Verified: `hindsight AUD-abc "some fix"` prints the temporal usage banner (the `inject` token is dropped; children read `ARGS[0]`). 10 entries carry `defaultArgs`; the 7 whose value is a *subcommand token* (`install-skill`, `register-skill`, `audit-skill`, `spawn`, `identity`, `hindsight`, `record-learning`) all break. Worse, `health` carries `['--check']`: `node bin/mindforge-cli.js health --dry-run` printed `Scope : local`, `Mode : DRY RUN`, `Would install:` — it entered `install()` (`installer-core.js:943` fallthrough). Without `--dry-run` in a consumer project this performs a real install. `.claude/commands/mindforge/install-skill.md:18,22,26` instructs the broken forms.

**7. Hindsight injection commits its audit record and state flip even when the rollback throws.** `bin/hindsight-injector.js:22` calls `TemporalHub.rollbackTo(auditId)` **without `await`** on an `async` method (`temporal-hub.js:111`), so the rejection escapes the surrounding `try/catch`. Reproduced in a sandbox: process crashed with `Snapshot deadbeefcafe1234 not found in history.` **after** `auto-state.json` had been rewritten to `{"status":"awaiting_regeneration",…}` and an fsync'd chained AUDIT line existed, with `.planning/history/` never created. Via `bin/dashboard/temporal-api.js:63-80` the endpoint `await`s and would return 200 `{success:true}` — but no `unhandledRejection` handler exists in `bin/`, so under Node ≥15 the same escaped rejection **kills the dashboard process**. And `awaiting_regeneration` has **one writer, zero readers** anywhere, so the documented Temporal Vision Loop step 4 is unimplementable.

**8. The Tier-3 governance gate is satisfied in perpetuity by one stale committed file, and the policy engine has no DENY rules.** `.planning/approvals/approval-mf-auth-mq9f2zpf.json` is git-tracked, records `version: 11.5.1`, `timestamp: 2026-06-11`, `verified:false` + `unverified_ack:true` — exactly the shape `control-plane.yml:64-97` accepts, with no binding to commit, PR, version or expiry. `bin/change-classifier.js:76` sets tier 2 for **any** `.js`/`.ts` change and `SENSITIVE_PATHS` includes `.mindforge/governance/` and `bin/models/`, so Tier 3 fires often. Three mutually incompatible approval-record formats coexist (`approve.js:110` / `approval-handler.js:128` / the slash-command's `status: pending` filter), so a CLI-minted approval is invisible to the dashboard and a dashboard-minted one is rejected by CI.

**9. The dashboard UI is inert, and the AgRevOps hub has no backend.** `bin/dashboard/server.js:39` requires `RevOpsAPI` and **never mounts it** (verified 404; eslint reports the unused require as a warning, which `--max-warnings=9999` tolerates). Even mounted, `revops-api.js:28` passes `getAuditEntries(500)` — an **object** `{entries,total,limit,offset}` (`metrics-aggregator.js:103-108`) — into `.filter` ⇒ TypeError, swallowed into a 500. Beyond that: `server.js:164` sets `script-src 'self'` with no `unsafe-inline`/nonce while the entire client is one inline `<script>` (`frontend/index.html:373`); the frontend sends **no `Authorization` header** so every mutation 401s (Approve/Reject and Rewind & Inject are unusable); `api-router.js:93` drops `confirmation_id` so Tier-3 approvals always fail the gate; and 4 of 7 tabs read response shapes the API never returns (Approvals/Team throw, Metrics renders `NaN`, Memory renders `{}`).

**10. `.agent/bin/` (11,192 LOC) and `.agent/workflows/` (130 pipelines) are excluded from the npm package while 54 shipped skills reference them.** `package.json` `files[]` omits both but includes `.agent/skills/`. Union of `grep -rl "\.agent/bin"` (7) and `grep -rl "@\.agent/workflows"` (48) across `.agent/skills/**/SKILL.md` = **54 of 123**. `.agent/mindforge/` has zero such references. This runtime has **zero automated test coverage** (`grep -rln 'agent/bin\|mindforge-tools' tests/` = empty) despite recursive `fs.rmSync`/`fs.renameSync` loops. Also unpublished but CI-scanned: `.mindforge/rules/` (6 language security packs — one of the 7 blocking unicode-scan roots).

**11. `register-skill` corrupts or aborts `MANIFEST.md`; the whole documented install chain cannot complete.** `grep -c '|---|' .mindforge/org/skills/MANIFEST.md` = **0** (real separators are `|-------|------|--------|`), so `bin/skill-registry.js:207` `indexOf('|---|')` → `-1` and `indexOf('\n',-1)+1` inserts the row near byte 0, outside every table. There is no `## Org Skills` header, so the **default** tier 2 exits 1 (`:181-191`). Row shape is 5 columns against a 3-column table. Four incompatible row schemas exist across `MANIFEST.md`, `skill-registry.js:198`, `skill-registrar.js:54` and `registry.md:23`. Adjacent: `skill-scorer.js:53` only parses YAML-**list** triggers while all 232 engine skills use inline commas ⇒ `trigger_coverage` (30 of 100 pts) is always 0; and `learn-cli.js:44` calls `Registrar.register(path, 'project')` against an options-object signature ⇒ `TypeError`.

**12. The plugin payload is a 4-minor-stale generated snapshot, pinned in place by hard-coded test counts.** `scripts/build-mindforge-plugin.js:36-41` copies `.claude/commands/mindforge` and `.agent/skills` **unfiltered**, and `:223` hoists `version` from `package.json`. Payload: 182 commands / 74 skills / 164 agents / `plugin.json` 11.5.1. Source: **221 / 123 / 11.9.1**. All 36 `wf-*` command files exist in the source dir, so dynamic workflows are missing purely because the generator was never re-run. `tests/plugin-packaging.test.js:93-100` hard-asserts `182`/`164`/`74`, so **re-running the generator fails CI**. Personas are genuinely absent by design (`SRC` at `:36-41` has no personas key) — while shipped commands instruct the model to read `.mindforge/personas/*.md`. Separately, 20 of the 74 plugin skills carry dangling `@.agent/references/` includes (that directory does not exist).

**13. ~8,480 LOC of shipped Python/shell/cjs inside skills, unvalidated and unreviewed.** `.mindforge/skills/**/scripts/` = 21 files / 4,193 LOC (the **auto-trigger** tier); `.agent/skills/**/scripts/` = 25 files / 4,287 LOC (~4.2k duplicated). Includes 13 network-fetching Python scripts reaching **19 external hosts** (`data.sec.gov`, `ofac.treasury.gov`, `api.opencorporates.com`, `offshoreleaks-data.icij.org`, …) and `.agent/skills/mindforge-brainstorming/scripts/server.cjs` (354 LOC — a server a skill starts). Both roots are in `files[]`. `engines` declares only `node >=18`; 7,349 LOC of Python has no declared runtime, no linter, no test, and is not covered by the frontmatter/unicode gates.

**14. Two implementations write incompatible checksums to the same file, and the SQLite migration drops 100 % of edges.** `bin/memory/knowledge-graph.js:107-109` hashes `{...record, checksum:''}` in insertion order → full 64-hex; `sdk/src/memory.ts:174-175` uses `JSON.stringify(data, Object.keys(data).sort())`, omits `checksum`, and `.slice(0,16)`. Both target `.mindforge/memory/graph-edges.jsonl` (`:51` / `:242`) and both verify it — each reports the other's edges as corrupt. Meanwhile `bin/migrations/v9-unified-memory.js:70-71` reads `edge.source_id || edge.from` while both writers emit `sourceId` ⇒ NULL into a NOT NULL column, throw swallowed as `skippedLines`, migration reports success. Live `graph_edges` = 0 rows.

**15. The only gate on tarball contents is fail-open *and* silent.** `tests/packaging-allowlist.test.js` correctly drives the real `npm pack --dry-run --json` (`:38`) and asserts 9 tarball properties — but `:155-163`, on any `npm pack` failure, prints a warning and `return`s ⇒ exit 0 ⇒ `run-all.js:129-132` records **✓ PASS**, and the runner discards stdout on success so the warning is never seen. Its own comment says *"No silent caps: announce the skip loudly. This test gates releases."*

**16. Dead / duplicated code worth knowing about.**

| Item | Path:line | Status |
|---|---|---|
| `verifyInstall` | `bin/installer-core.js:385-414` | **never called**; `install()` prints `Install verified` unconditionally at `:781`. Two tests assert only that the literal string appears in a file |
| `--update` | `installer-core.js:942` sets `isUpdate:true`; `install()` `:418-424` never reads it | upgrades leave skills/personas/hooks/`.mindforge/`/engines stale forever; `self-update.js:142-145` re-execs without `--update` or `--force` |
| `bin/migrations/10.7.0-to-11.0.0.js` | no `require.main` block | the documented v10.7→v11 upgrade command (`docs/upgrade.md:88-91`) is a silent no-op |
| `bin/migrations/0.1.0-to-0.5.0.js:4-18` vs `:20-36` | **two `module.exports =`** | second wins; verified `require()` prints `0.5.0 -> 0.6.0`. The 0.5.0 migration runs twice, the 0.1.0 one never |
| `bin/engine/skill-loader.js` | 4-line stub returning `null` | **zero callers repo-wide**, tests included, against a 200-line spec |
| `bin/engine/temporal-cli.js:25-31` | prints `✅ Cleanup complete.` | never calls `TemporalHub.gc`; real GC runs only from `auto-runner.complete()`, which has no caller ⇒ unbounded `.planning/history/` |
| `remediation-engine.js:79` | destructures `{ContextEntropyGuard}` from a module exporting an **instance** | verified: every `drift_score ∈ (0.75,0.8]` returns `Cannot read properties of undefined (reading 'compress')` |
| `bin/gov-audit.js:33` | calls `async evaluate()` without `await` | every table row prints `| undefined | undefined |` |
| `.mindforge/audit/manifests/` | 1057 files, all `entryCount: 2` | produced by **`tests/ztai-enterprise.test.js:50-62`** on every `npm test` (hardcoded relative `manifestDir` at `ztai-archiver.js:14`) — an assertion-free test polluting the working tree |
| `plugins/mindforge/scripts/` | 9 files | **byte-identical** duplicate of `.agent/hooks/*.js`, no sync gate |
| `plugins/mindforge/agents/` | 164 files | byte-identical duplicate of `subagents/categories/**` (verified all 164 pairs) |
| `mcp-server/src/vendor/` | `events.ts` (45 diff lines), `client.ts` (5) | **stale**; `types.ts`/`memory.ts` clean. `scripts/vendor-sdk-into-mcp.js` is human-invoked — absent from every npm script and workflow, with no drift test. `grep -c WebSocketLike plugins/mindforge/mcp/dist/index.js` = 0 |
| `bin/utils/append-queue.js`, `bin/parse-workflow-args.js`, `bin/models/{model-broker,finops-hub,cloud-broker}.js`, `bin/autonomous/task-dispatcher.js`, `bin/engine/otel-exporter.js`, `bin/installer/install-{manifests,state}.js`, `skills-lock.json`, `tools.json`, `swarm-templates.json` | — | no production callers/readers |

**17. Doc/code divergence at scale.** `CODEBASE-MAP.md` is wrong by 2–11× on nearly every count (71 vs 221 commands; 20 vs 232 engine skills; 117 vs 216 personas; 43 vs 97 tests; `auto-runner.js` 449 vs 842 lines) and describes three `config.json` sections that do not exist (`rate_limiting`, `session`, `wave_execution`). `docs/commands-reference.md` — linked as the "Full command list" — covers **93 of 221** and advertises 5 names with no command file. `docs/workflow-atlas.md` phase columns disagree with the registry for ≥16 of 35 workflows (*counts conflict: 23/35 relayed vs 16/35 measured — unresolved*). `.claude/CLAUDE.md:1` self-labels **v5.10.0-NEXUS**. `docs/reference/commands.md` and `docs/References/commands.md` are **both git-tracked** with different blobs — the case-collision `.planning/STATE.md:26` claims was fixed in v11.3.1. `.mindforge/audit/AUDIT-SCHEMA.md:27-32,462-471` still instructs the log rotation that `audit-writer.js:8-15` says was removed *because it broke the verifier*. `MINDFORGE.md:77-92`'s `[FORBIDDEN]`/`[INSTRUCTIONS]` blocks ship with foreign Fastify/date-fns example content.

---

## 10. NAVIGATION MAP

| If you want to… | Go to | Watch out for |
|---|---|---|
| Add / change a slash command | `.claude/commands/mindforge/<n>.md` **and** `.agent/mindforge/<n>.md` | `.agent/` is canonical (`installer-core.js:534`) and **overwrites** the `.claude` copy at install; 146/221 already differ |
| Add a routed CLI command | `bin/mindforge-cli.js:25-141` `COMMANDS` | `defaultArgs` **prepend** as of `37392d5` (`[...defaultArgs, ...COMMAND_ARGS]`) `[corrected 2026-08-16]`. The hazard is now the opposite one: prepending makes a command's default mode *live*, so do **not** add `defaultArgs` to any command whose handler writes state without validating its input. `install-skill`, `register-skill`, `audit-skill` and `record-learning` deliberately carry **none** and refuse with exit 1 — re-enable them only after the validation fix and the `cwd` fix. `cwd: ROOT` at `:185` is still unfixed (deferred to v12), so a spawned child resolves relative paths inside the package dir |
| Change what gets installed / add a harness | `bin/installer-core.js` `RUNTIMES :18-97`, `install() :417-782`, `SENSITIVE_EXCLUDE :292`, `MINDFORGE_DEV_EXCLUDE :318`; then `bin/installer/harness-adapter-compliance.js` `ADAPTER_RECORDS` + `npm run harness:compliance -- --check` | wizard only offers Claude/Antigravity (`setup-wizard.js:91-95`); `WALKTHROUGH.md` is overwritten unconditionally (`:719-725`); uninstall is asymmetric |
| Change orchestration behaviour | `.mindforge/engine/autonomous/auto-executor.md` + `wave-executor.md` (**this is the real engine**) | `bin/autonomous/auto-runner.js` is a test-only harness; editing it changes nothing at runtime |
| Add an audit event | `bin/autonomous/audit-writer.js:89` `appendAuditEntrySync` only — never write JSONL directly | hash material comes from `bin/governance/audit-hash.js:9`; any field you add changes the entry's hash |
| Add / change an engine skill | `.mindforge/skills/<kebab>/SKILL.md`; ≥10 inline comma-separated `triggers`, `name` ≡ dirname | gated by `validate-assets.js:91-100` **and** `tests/skills-platform.test.js:105-128` |
| Add a persona | `.mindforge/personas/<file>.md` — **filename is the identity** (`spawn-agent.js:110`) | zero frontmatter validation; 197/216 declared `name`s already mismatch; plugin installs get **no** personas |
| Add a subagent | `subagents/categories/NN-*/x.md`, then `node scripts/build-subagent-index.js` (+ `build-subagent-plugins.js`, `build-mindforge-plugin.js`, `build-plugin-marketplace.js`) | nothing verifies index freshness; name must match `/^[A-Za-z0-9-_]+$/` |
| Add a dynamic workflow | script + `index.json` + **both** `wf-<n>.md` mirrors | 4 uncoordinated hand-edits; only `meta.name`≡filename is gated; `workflow run` **prints**, it does not execute |
| Add / change an MCP tool | `mcp-server/src/index.ts` via the `registerTool` funnel (`:81-96`), then `node scripts/vendor-sdk-into-mcp.js` → `npm --prefix mcp-server run build` → `node scripts/build-mindforge-plugin.js` | vendoring is manual with no drift test; bump `server.json:5` and the hardcoded `:59` version too |
| Change memory / knowledge-graph behaviour | `bin/memory/knowledge-store.js` + `knowledge-graph.js` (canonical); mirror in `sdk/src/memory.ts` | checksum formats are **already incompatible**; `getPaths()` (`knowledge-store.js:118-130`) is the single path source |
| Change routing / pricing | `bin/models/model-router.js` (`PERSONA_MAP :25-36`) + `pricing-registry.js` `priceCall` | `MINDFORGE.md` is unparseable by `:48` ⇒ `DEFAULTS :11-22` win; never hardcode prices in a provider |
| Change `.planning/` document lifecycle | `.agent/bin/lib/{state,phase,roadmap,verify,template}.cjs` | only `STATE.md` is locked; `ROADMAP.md`/`REQUIREMENTS.md` are unlocked; zero test coverage |
| Change hook wiring | `.claude/settings.json`, `.agent/settings.json`, **and** `plugins/mindforge/hooks/hooks.json` | three registration sites, two impl copies; plugin hooks are currently all dead (§9-#1) |
| Bump the version | `package.json`, `sdk/package.json`, `.mindforge/config.json:2`, `MINDFORGE.md:6`, `sdk/README.md` (gated) **plus** `mcp-server/package.json`, `mcp-server/server.json:5,17`, `mcp-server/src/index.ts:59`, `plugin.json`, `Formula/mindforge.rb:4-5,18`, `Dockerfile:12` (ungated), and the ~14 narrative docs | `tests/version-consistency.test.js` covers only the first five |
| Add a test | `tests/**/<name>.test.js` — subdirectories are fine, must end `.test.js` | Discovery is a **recursive** walk as of `5177225` + `a9bdb0f` `[corrected 2026-08-16]`; `SKIP_DIRS` prunes `tmp-*`/dotted **directories only**. `test/` (singular) no longer exists. Per-file exit code is still the only signal, so `finally { process.exit(0) }` still masks failure in 4 suites. First-line `// @skip: reason` and `// @timeout: <ms>` directives are honoured (`run-all.js:56-75`); `node --test` has no equivalent — see the plan's TEST-01 |
| Change what ships to npm | `package.json` `files[]` (47 entries) — and check `.npmignore` for conflicts | `tests/packaging-allowlist.test.js` is fail-open + silent; `.mindforge/docs/` is already a dead entry |

---

## 11. CONFIDENCE & UNKNOWNS

### Solid — verified by execution or byte-level measurement

Module-system census (`bin/` 100 % CJS); `package.json` `files[]` contents and the real tarball; the `defaultArgs` bug and the `health → install()` mis-route; `security-scan` exiting 0 with 0 parsed settings plus the 0-vs-41 syntax mismatch and the ∅ schema-key intersection; the un-awaited `rollbackTo` partial commit with exact resulting file contents; the SessionStart hook's full output; zero production `AutoRunner` constructors; 221/48/44 command-to-`bin/` counts; the plugin-hook double failure (both defects executed); all `celestial.db` DDL and row counts including the `workflow_runs` orphan and empty `_migrations`; the complete JSONL inventory with sizes, line counts and field censuses; `.planning/AUDIT.jsonl` chain validity re-derived independently for all 1907 entries; the RISK-AUDIT forensic profile (312 breaks, 8 dates, 303-before/9-after the fix); all 1057 manifests at `entryCount: 2` and their test-file origin; every schema/config parse; the absence of `auto-state.json`, `knowledge-base.jsonl`, `graph-edges.jsonl`, `token-ledger.jsonl`, `instinct-store.jsonl`, `SIGNATURES.json`; `readAll()`/`readAllEdges()` = 0; `MANIFEST.md` `|---|` = 0; the `must_haves` indentation mismatch and `state json` frontmatter bug (reproduced); the `--no-verify` bypass (both directions executed); `/api/revops` 404; SDK↔bin checksum divergence; vendor drift in 2 of 4 files with the bundle grep confirming; 146/221 mirror divergence with 0 orphans; `soul-engine`/`SwarmController`/`HNSW` at zero occurrences; the `.mindforge/engine/nexus-tracer.js` cross-tree shim; `test/sovereign-status.test.js` failing (that file was **deleted** in `5177225`; the citation is historical) `[corrected 2026-08-16]`; the single-PERMIT policy set; 54 dangling `.agent/skills` references; the 4-way version drift; skill-script LOC and external-host counts.

### Uncertain / conflicting evidence, explicitly unresolved

1. **Whether `routing`/`governance-gate` are *required* status checks** on `main`/`develop`. This is the only surviving question behind the "asset gate on PRs" issue and lives in GitHub branch-protection settings, not the repo.
2. **`docs/workflow-atlas.md` phase-drift magnitude**: 23/35 (relayed) vs 16/35 (measured by substring presence). Direction is certain, magnitude is not.
3. **Whether the 7th `defaultArgs` break (`record-learning`) behaves like the other 6**: one source counted 5, listed 6, and the maps said 7. All three agree `install-skill`, `register-skill`, `audit-skill`, `spawn`, `identity`, `hindsight` break.
4. **Which of `.claude/commands/` vs `.agent/mindforge/` is the *newer* fork** for the diverged files. `.agent` is canonical by installer code, but its `council.md` documents a `--template` enum the `.claude` version lacks — it may be newer, not stale.
5. **Whether `.agent/bin/`'s omission from `files[]` is deliberate.** No changelog entry or comment states intent either way.
6. **Whether the 2026-05-30T20:25–20:30Z concurrent RISK-AUDIT writers were a test run, `bin/gov-audit.js`, or two operator sessions.** The interleaving is proven; the processes are not named.
7. **npm's `files` vs `.npmignore` precedence under a future major.** Observed behaviour only — and it is load-bearing for the "no `.db` ships" privacy assertion.
8. **Whether `mindforge-sdk` was ever manually published.** No CI step does it; no network access to check.
9. **Whether `_migrations` being empty means "ran before tracking existed" or "never ran".** The presence of `knowledge` (12 rows) with `graph_edges` at 0 favours "never ran", but is not conclusive.

### Not covered, and why

| Area | LOC | Why |
|---|---|---|
`bin/worktree/engine.js` | 497 | unclaimed by all 17 readers. Contains `git merge-tree` conflict parsing, cross-worktree `node_modules`/`.venv` **symlinking**, and hunk-level `git apply` — the largest unreviewed executable file in `bin/`, and a destructive git/FS surface |
Skill executable payloads | ~8,480 | 21 + 25 script files (Python/shell/cjs) under both skill roots; shipped, unvalidated, untested, 19 outbound hosts |
`bin/hooks/` | 273 | `instinct-capture-hook.js` (sole writer of the instinct store) + `lib/detect-project.js` (the project-scoping contract). Two readers depended on it; neither read it |
`tests/` beyond ~10 files | ~13,000 of 15,568 | characterised by grep aggregates. The 3 tautological files (~1,100 LOC) were found *by reading*, so the unread remainder likely holds more |
`scripts/fix-command-frontmatter.js`, `migrate-changelog.js` | 211 | the first is the leading candidate cause of the 86 frontmatter-quoting-only mirror divergences |
`.mindforge/plugins/` (4 specs), `.mindforge/{ci,monorepo,production,pr-review}/` bodies | — | markdown protocol layers with no code counterpart; partially covered by grep only |
`.agent/hooks/mindforge-block-no-verify.js` | 552 | wired at all profiles in both harnesses; only its bypass was verified, not its detection strength |
`hermes-agent/`, `awesome-claude-code-subagents/`, `node_modules/`, `plugins/mindforge/mcp/dist/index.js` | — | explicitly out of scope (nested repos / build artifacts) |
Runtime behaviour of the host `Workflow` tool | — | `agent`, `parallel`, `pipeline`, `phase`, `log`, `budget` are defined nowhere in this repo. `parallel()`'s null-on-failure contract (which 3 scripts depend on) and `agent()`'s schema-violation behaviour are unknowable from source |
Whether Claude Code resolves skills by **directory** or **frontmatter `name`** | — | decides whether the mandated `_extended` protocol (`.claude/CLAUDE.md:49-54`) is addressable at all, given `mindforge-parallel-mesh_extended` declares `name: dispatching-parallel-agents`. Scoped: 0/232 engine skills mismatch; all 15 mismatches are in the lenient `.agent/skills` tier |
Actual line coverage; full-suite green/red | — | the 95-file suite was never run end-to-end (multi-minute, sequential, 60 s/file). Fast gates were run: `validate-assets.js` → exit 0; `release:ready` → 14/14 exit 0; `harness:compliance --check` → in sync, exit 0; `npm pack --dry-run` → 1968 files |

### Coverage estimate

**≈ 72 % of tracked non-doc code by line count; ≈ 85 % weighted by behavioural risk surface.** Denominator (excluding the 22,152-line generated MCP bundle): 390 JS-family files / 67,002 LOC + 21 Python / 7,349 LOC = **74,351**. Deeply covered ≈ 46,000; `tests/` credited at ~7,000 of 15,568; uncovered ≈ 11,400. The risk-weighted figure is higher because ~4.2k of the uncovered LOC is skill-tier duplication and 1,524 is byte-identical to already-read `.agent/hooks` files — but it is also where the single worst finding lives: **the one genuinely unclaimed subsystem (plugin hook distribution) contains a verified total failure of every security control and of the protocol bootstrap for an entire distribution channel.**