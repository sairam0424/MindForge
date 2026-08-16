# MindForge v11.9.1 → v12 → v13 Phased Upgrade Plan

## Context

MindForge sells itself as an **enforced** agentic operating protocol. Two research
workflows (57 agents, 644 files read, 160 web searches) plus direct verification on this
checkout established that the enforcement does not exist on any install:

- `package.json` `files[]` has **47 entries, none containing "settings"** — neither
  `.claude/settings.json` nor `.agent/settings.json` ships.
- **No code writes or merges one.** All 9 `settings.json` mentions in `bin/` are reads or
  metadata strings. `bin/harness-audit.js:335` audits a wiring nothing creates.
- The plugin channel — `README.md:14-19` calls it the *"Fastest path"* — crashes on every
  hook fire: `plugins/mindforge/scripts/run-with-flags.js:24` requires `./lib/hook-flags`
  and `plugins/mindforge/scripts/lib/` **does not exist**.

So the ratio is not "500 LOC enforced vs 291k lines advisory". It is **0 vs 291k**. Both
advertised install paths ship the instruction corpus with none of the gates.

Against that, one asset is genuinely best-in-field and must not be disturbed:
`node bin/verify-audit.js` → `✅ audit chain valid: 1934 entries`, from a 12-line hasher
(`bin/governance/audit-hash.js`) shared by writer and verifier, independently reproduced
byte-exactly. Plus real SLSA provenance on npm since 11.9.0.

**Intended outcome:** three releases that make the enforced boundary real on the three
harnesses that can block, tell the truth about the other three, and delete the machinery
the harness now owns. v12 gets *smaller*, not bigger.

### Decisions locked with the maintainer

| Decision | Choice |
|---|---|
| Product identity | **Enforcement is the product.** Corpus shrinks to what is provably enforced |
| Release shape | **Three releases** — v11.9.2 patch · v12.0 enforcement+honesty · v13.0 engines+structure+data |
| Harness scope | **3 enforced** (Claude Code, Cursor, Copilot CLI) **+ 3 explicitly advisory** (Gemini/Antigravity, OpenCode, terminal-only) |
| Phantom capabilities | **Delete or repoint** — `SwarmController`, `PersonaFactory`, `soul-engine.js`, `shard-controller.js` |

### Constraints

- **No data loss.** `celestial.db` and every `.jsonl` in existing user installs must survive
  every migration. Back up before touching, and record migrations (`_migrations` is currently 0 rows).
- **Three packages are published.** `mindforge-cc` (with provenance), `mindforge-mcp-server`
  (7 versions), `mindforge-sdk` (6 versions, exports `MindForgeMemory`). None can be freely
  restructured; a release that loses provenance is now **actively rejected** by pnpm consumers.
- **`bin/` stays CommonJS.** 157 of 174 files use `require`, and the hook fast path at
  `.agent/hooks/run-with-flags.js:142-151` depends on synchronous `require()`. ESM would make
  every hook async and reopen the timeout hole.
- **Do not touch `.mindforge/dynamic-workflows/scripts/`.** Only `.js` loads from a workflows
  directory; `.mjs`/`.cjs`/`.ts` are counted and skipped. A port silently unregisters all 35.
- Assume some consumer depends on current buggy behaviour (`cwd: ROOT`, `--no-verify`, deep
  `require` of `bin/…`). Stage the breaks.

---

## The precondition nobody has noticed: hook scripts are scattered across two trees

This is new work discovered while planning, and it gates REG-01.

`.agent/hooks/` — the directory the installer copies (`bin/installer-core.js:445,588`) —
contains 8 hook scripts, `lib/`, and `run-with-flags.js`. But `.claude/settings.json`
references **two scripts that live outside it**:

- `bin/security/trust-gate-hook.js` ← the primary security gate
- `bin/hooks/instinct-capture-hook.js`

`getHookRoot()` (`.agent/hooks/run-with-flags.js:100-106`) resolves
`path.resolve(__dirname, '..', '..')`. Installed, the dispatcher lands at
`<project>/.claude/hooks/run-with-flags.js`, so the root resolves to the **project root**.
Every current command path then misses:

| Command path in settings.json | Resolves to | Exists? |
|---|---|---|
| `.agent/hooks/mindforge-prompt-guard.js` | `<project>/.agent/hooks/…` | No — copied to `.claude/hooks/` |
| `bin/security/trust-gate-hook.js` | `<project>/bin/security/…` | No — `bin/` lives in `node_modules` |

On a miss, `run-with-flags.js:135-137` writes to stderr, **echoes stdin and exits 0 = ALLOW**.
So a naive "just ship settings.json" fix would register hooks that all fail open silently.
This is the npx-channel twin of the plugin-channel bug — same root cause, both channels.

**Therefore REG-01 must (a) assemble a complete hook bundle and (b) generate paths, not copy them.**

---

## Release 1 — v11.9.2 (patch, no consumer contract change)

Goal: stop active harm and tell the truth. Roughly two focused weeks, mostly small items.

**Land DOC-01 first** — the honest disclosure is what buys time for everything else.

### 1.1 Immediately, in order

| # | ID | Change | Files |
|---|---|---|---|
| 1 | DOC-01 | Per-channel capability matrix in README with an honest `Hooks enforced: NO` for **both** channels; de-recommend the plugin channel; new `harness-audit.js` check: *"is any MindForge hook actually registered for this harness?"* | `README.md`, `bin/harness-audit.js` |
| 2 | SEC-00 | Revoke the live `npm_…` token at `.npmrc:13` (gitignored + untracked, so it is machine-local); audit publish history for all three packages; delete the file; adopt trusted publishing; add a pre-publish grep for `_authToken=` / `npm_[A-Za-z0-9]{36}` that hard-fails | `.npmrc`, `.github/workflows/mindforge-release.yml` |

### 1.2 Then, fully parallel

| ID | Change | Files |
|---|---|---|
| CFG-01 | One shared bracket-aware parser `bin/utils/mindforge-params.js` with `/^\s*\[([A-Z0-9_]+)\]\s*=\s*(.+?)\s*$/`. Add a real `required` array + `additionalProperties:false` to the schema (it currently has **no `required` key at all**, so `security-scan` can never fail). Needs a key-alias table (`PLANNER`→`PLANNER_MODEL`). A correct parser already exists to copy at `sdk/src/client.ts:141-158` | `bin/validate-config.js:36`, `bin/models/model-router.js:48`, `.mindforge/MINDFORGE-SCHEMA.json` |
| CLI-01 | `[...defaultArgs, ...COMMAND_ARGS]` and `cwd: process.cwd()`. Today `cwd: ROOT` means `mindforge health` in a consumer project targets **MindForge's own `node_modules`**, and `health` carries `['--check']` so it can enter a real install | `bin/mindforge-cli.js:180,185` |
| ASYNC-01 | `await` the rollback; register `unhandledRejection` in the dashboard; mount `RevOpsAPI` (required at `server.js:39`, never `app.use`'d); length-guard before `crypto.timingSafeEqual`; add a "every required router is mounted" test | `bin/hindsight-injector.js:22`, `bin/dashboard/server.js:39`, `bin/engine/temporal-hub.js:40` |
| LOCK-01 | Promote the **fail-closed** `withStoreLock` from `bin/learning/instinct-cli.js:78-100` into `bin/utils/file-lock.js`. **Do not** promote `.agent/bin/lib/state.cjs:790-795` — it writes anyway on lock failure. Take the lock around seed-and-append; `--repair-links` writes a sidecar, never in place | `bin/autonomous/audit-writer.js:66-73`, `bin/governance/policy-engine.js:17` |
| FTS-01 | Remove the whole-query phrase wrap (tokenise + OR-join, keep a `{phrase:true}` path); add `limit`; key the FTS delete on the span PK not `trace_id`. Recovers measured **recall@10 = 0.00** and the 51% unsearchable trace text — rebuildable from the base table, **no engine change needed** | `bin/memory/vector-hub.js:401-405,442-443,516-517` |
| COST-01 | Purge the 1,069 synthetic ledger rows; one shared record shape. `sum(cost_usd)`=$13.36 vs `sum(total_cost_usd)`=0 — and `tests/dashboard.test.js:209-210` writes the wrong field, which is **why the mismatch is green**. Fix the test in the same commit. Find or delete the `session-quality.jsonl` writer (there is none in `bin/`) | `bin/models/cost-tracker.js:32`, `bin/dashboard/metrics-aggregator.js:307` |
| MEM-03 | Make migrations backed-up, idempotent and **recorded** — `bin/migrations/migrate.js:17-22` backs up 4 files and **not** `celestial.db`; `_migrations` is 0 rows | `bin/migrations/migrate.js` |
| MEM-06 | 2-line latent fix: `edge.source_id ?? edge.sourceId ?? edge.from`; non-zero exit when `skippedLines > 0`; invariant test asserting `graph_edges > 0` after a write | `bin/migrations/v9-unified-memory.js:71` |
| DOC-02 | Generate `CODEBASE-MAP.md` between sentinel markers with a `--check` mode (currently wrong by up to 11.6×). **Leave `plugin.json`'s 182/164/74 alone — they are exact** | `CODEBASE-MAP.md`, `scripts/` |
| DEL-04 | Delete `.mindforge/engine/nexus-tracer.js` (0 callers), `.npmignore` (proven fully overridden by `files[]`), and the dead `.mindforge/docs/` `files[]` entry. Add `type: "commonjs"`. **Do not add `exports`** | `package.json`, `.npmignore` |

### 1.3 Then, serially (each depends on the previous)

1. **COST-02** — wire `COST_HARD_LIMIT_USD`/`COST_WARN_USD`; fail closed on an unparseable
   limit; real estimate from `pricing-registry.priceCall()`. *Must follow COST-01* or the
   synthetic rows trip a false ceiling. (`bin/models/cost-tracker.js:50-52`)
2. **VER-01** — one version source generating all 7 locations (`plugin.json`, marketplace
   entry, `server.json` ×2, `mcp-server/src/index.ts:59`, `sdk/src/index.ts:29`,
   `Formula/mindforge.rb`, `Dockerfile:12`). Add `claude plugin validate . --strict` +
   `claude plugin tag` to CI. Make `tests/version-consistency.test.js` assertions unconditional.
3. **CI-01** — one required `ci` check; restore `validate-assets`; wire the three validators
   that run in **zero** workflows (`harness:audit`, `harness:compliance`, `release:ready`)
   despite `CLAUDE.md:96` claiming otherwise; fix `tsc | while read` (exit status is the
   loop's); make the packaging skip `exit 1`; add `mcp-server` typecheck + stdio smoke.
4. **TEST-01** — move to `node --test tests/` (14 files already use `node:test`). Add
   `tests/meta-runner.test.js` banning `finally { process.exit(0) }` (4 suites currently
   **cannot report failure**) and asserting ≥1 assertion per file (10 have zero). Golden
   tarball manifest of 1,968 paths.

### Verification — v11.9.2

```bash
# CFG-01: must now parse the 41 bracketed lines and be able to fail
node bin/validate-config.js                     # expect non-zero on a missing required key
node -e "console.log(require('./bin/models/model-router').resolve('PLANNER'))"  # not a DEFAULT

# CLI-01: must NOT enter an install, and must keep both arg sets
cd /tmp/mf-probe && node <path>/bin/mindforge-cli.js health --force   # no "Would install:"
node <path>/bin/mindforge-cli.js hindsight AUD-abc "fix"              # 'inject' token retained

# FTS-01: the shipped golden set must stop scoring zero
node bin/eval/eval-harness.js --set golden-set-retrieval.json         # recall@10 > 0
sqlite3-equivalent count check: traces vs traces_search parity

# LOCK-01: concurrent append must not break the chain
seq 1 50 | xargs -P8 -I{} node -e "require('./bin/autonomous/audit-writer').appendAuditEntrySync({event:'probe{}'})"
node bin/verify-audit.js                        # expect: audit chain valid: N entries

# Gates
npm test && npm run harness:audit && npm run harness:compliance -- --check && npm run release:ready
npm pack --dry-run --json                       # 1,968 paths, no .db, no .npmrc
```

---

## Release 2 — v12.0 "Enforcement + Honesty"

Nothing else in v12 is worth shipping before Phase A.
Phase B runs **fully parallel** — it needs no platform changes.

### Phase A — make enforcement real (critical path)

**A0. Hook bundle (the precondition above).** Assemble every hook script into one
installable directory before anything references it. Extend the copy at
`bin/installer-core.js:445,588` to also gather `bin/security/trust-gate-hook.js` and
`bin/hooks/instinct-capture-hook.js`, and add `.agent/hooks/lib/` **recursively**. Add an
assertion that the emitted hooks dir contains every script named in the emitted config.

**A1. REG-01 — installer writes hook registration per harness.** *Generate*, never copy:

| Harness | File written | Notes |
|---|---|---|
| Claude Code | `.claude/settings.json` | merge, never clobber, an existing user file |
| Cursor | `.cursor/hooks.json` | `failClosed: true` |
| Copilot CLI | `.github/hooks/mindforge.json` | exit 2 denies |

All command paths rebased to the **installed** layout (`<localDir>/hooks/…`, not
`.agent/hooks/…` or `bin/…`). Add a `--no-hooks` opt-out. Reuse the existing
`MATRIX_BLOCK_START/END` marker convention from
`bin/installer/harness-adapter-compliance.js:22-23` for the managed region.

**A2. REG-02 — post-install behavioural negative test.** The highest value-per-line in the
whole plan. Install to a tmpdir per harness; assert every `node <path>` in the emitted config
resolves; pipe a real `git commit --no-verify` PreToolUse payload to each registered command
and **assert deny**. A membership check is not sufficient — `./plugins/mindforge --strict`
passes today with every hook broken.

**A3. Then in parallel:**
- **PLUG-01** — recursive `scripts/lib/` copy; include `trust-gate-hook.js`; make the path
  rewrite **global** (it is non-global and anchored on `node `, so only the dispatcher is
  rebased and the second positional arg is left broken); assert no residual `.agent/`/`bin/`;
  exec-form `hooks.json`; pin `express`/`sql.js` via `npm-shrinkwrap.json`; replace the
  fail-open prefix test at `tests/plugin-packaging.test.js:114` with execution assertions.
- **GATE-01** — a `HARD_GATES` set that `MINDFORGE_DISABLED_HOOKS` cannot disable; audit every
  refused disable; **strip the bypass text from deny reasons** (`mindforge-config-protection.js:105`
  currently prints the bypass to the model); delete `--no-verify` including
  `.agent/workflows/mindforge-execute-phase.md:237`; ship a `managed-settings.json` template.
- **HOOK-01** — convert timeouts to seconds **only after measuring** `duration_ms` (see
  do-not-do); stop echoing stdin on the 8 fail-open paths; thread a real `hook_event_name`;
  cap `additionalContext`.

**A4. Then:** **TG-01** (modern `hookSpecificOutput.permissionDecision` **plus** stderr;
accept `PowerShell`; `realpathSync` write targets before deciding, which defeats the published
symlink-RCE chain; add `Bash` to config-protection's matcher) → **POL-01** (rename the policy
file to `.json`, strip `<!-- slide -->` markers, assert ≥1 DENY at load, ship 5 DENY rules,
gate behind `MINDFORGE_POLICY_ENFORCE=1`) → **APPR-01** (bind the token to diff hash + nonce +
`expires_at` ≤72h; untrack `.planning/approvals/*`; fix the dead `status:"pending"` gate and
the `APPROVAL-<uuid>` filename mismatch that makes the dashboard flow unreachable).

### Phase B — honesty and measurement (parallel with A)

| ID | Change |
|---|---|
| EVAL-01 | Make the shipped golden set executable — `bin/eval/eval-harness.js` and `golden-set-retrieval.json` have **zero callers**. Commit the 0.00 baseline. Add 3 structural invariants: FTS rowcount parity, ranked-order, edge write-read |
| EVAL-02 | Deterministic, free trigger-routing eval: TF-IDF over skill descriptions, ~60 committed prompts + ≥5 negative controls; distinguishes catalog drift (error) from churn (warning) |
| HON-01 | Claims registry `.mindforge/claims-registry.jsonl` + `scripts/ci/verify-claims.js` with `enforcement: hook\|cli\|advisory` **per harness**. Asserts entrypoints exist, `require.main===module` present when `cli`, proof commands pass, and sweeps backticked `*.js` tokens in the protocol docs for unresolvable files. **This is the mechanism that prevents recurrence** |
| HON-02 | "Merkle" → **"hash-chained append-only audit log (SHA-256 back-links)"** across the live surface (39 files; exclude `changelogs/**` and dated `RELEASENOTES` entries). Rename `merkleRoot`→`cumulativeHash`. Delete the word "attestation" until something signs |
| Phantoms | Repoint per the locked decision: `soul-engine.js` → `node bin/review/ads-engine.js --diff <ref>` (the real scorer is `bin/review/ads-synthesizer.js:25`); `shard-controller.js` → "advisory; `bin/shard-helper.js --analyse` scores shards" (and implement its `--verify`, ~10 LOC, currently throws `ERR_INVALID_ARG_TYPE`); `SwarmController`/`PersonaFactory` → "follow the protocol in `.mindforge/engine/*.md` — these are prompts, not modules" |
| CMD-01 | `enforcement: executable\|advisory\|deprecated` frontmatter on all 221 commands; delete those naming nonexistent code; add hops where verifiable (start with `audit.md` → `bin/verify-audit.js`); publish the 44/221 ratio |
| SKILL-01 | Generate `description` for the **202 of 232** `.mindforge/skills` lacking one; publish-blocking length check |
| DEL-01 | Delete `bin/engine/skill-evolver.js` + its only caller; purge the 1,359 `Synthesized Skill%` rows (**59.3 MB of 60.8 MB**), keep the 679 real ones |
| DEL-02 | Delete `AutoRunner.executeWave` (`auto-runner.js:369-370` writes `task_started` then `task_completed` with no dispatch); route `headless.js` through the real `wave-executor.js`. Keep the tested pure helpers `isTimedOut`/`decideRollback` |
| DEL-03 | Delete the ztai three-provider stack, DID vocabulary, and the shipped HMAC literal `'mindforge-temporal-v3'`. Replace with one optional Ed25519 path (`node:crypto`). **`bin/skill-validator.js:47,55` depends on this — sequence after SC-02** |
| POS-01 | Reposition on the audit chain: drop "for Claude Code", "true parallelism", "zero-trust" from `README.md:3`. New `SECURITY-MODEL.md` mapping **OWASP ASI01–ASI10** to ENFORCED (`file:line`) / DETECTED / NOT ADDRESSED **per harness**. State plainly that installing MindForge expands the repo's trust boundary by ~291k lines of agent instructions |

### Phase C — harness truth (v12.0, after A1)

- **HARNESS-01 (Copilot)** — write `.github/skills/<name>/SKILL.md`. It declares **no**
  `skillsSubdir`, so a Copilot install currently gets **zero skills**. Delete the
  `.github/copilot-instructions/mindforge/` emit. Correct the two false claims at
  `bin/installer/harness-adapter-compliance.js:127,132`.
- **HARNESS-02 (Cursor)** — drop `.cursorrules` (superseded); write
  `.cursor/rules/mindforge-core.mdc` with real frontmatter; **stop writing plain `.md` into
  `.cursor/rules`** (ignored); set `supportsSlash: true`. `.cursor/skills/` already works — leave it.
- **HARNESS-03 (AGENTS.md)** — emit one `.agents/skills/` tree and a root `AGENTS.md` with
  marker-delimited managed blocks; add `AGENTS.md` to `files[]`; replace the destructive
  backup-and-merge at `installer-core.js:358-374`; add `mindforge context --disable`.
- **HARNESS-04** — derive `ADAPTER_RECORDS` from `RUNTIMES` with a cross-check test (the
  generator and `--check` drift gate already exist and pass). Delete the `CLAUDE.md`→`GEMINI.md`
  string rewrite at `installer-core.js:120-127`. Fix the dead `coreEngines` array at
  `:728-735` — `bin/sre/*` is currently installed by nothing.

### Verification — v12.0

```bash
# A2 is the gate that matters: real deny, per harness, from a real install
for h in claude cursor copilot; do
  node bin/install.js --$h --local --target /tmp/mf-$h
  # every command path in the emitted config must resolve
  # a --no-verify PreToolUse payload must be DENIED (exit 2), not echoed
done

# GATE-01: the hard gates must survive an attempted disable
MINDFORGE_DISABLED_HOOKS=trust-gate <replay a destructive Bash payload>   # expect deny + audit entry

# Plugin channel must now execute, not crash
CLAUDE_PLUGIN_ROOT=/tmp/mf-plugin node /tmp/mf-plugin/scripts/run-with-flags.js \
  trust-gate <hooks-dir>/trust-gate-hook.js standard  # expect {"decision":"block"}, exit 2

claude plugin validate . --strict && claude plugin validate ./plugins/mindforge --strict
node scripts/ci/verify-claims.js          # HON-01: every claim resolves or fails CI
node bin/verify-audit.js                  # must still report the chain valid
```

---

## Release 3 — v13.0 "Engines + Structure + Data"

Deferred here deliberately so each major has one theme and one blast radius.

**C1. NODE-01** — `engines` → `>=22.14.0` in both packages (Node 18 EOL 2025-04-30, Node 20
EOL 2026-04-30; the release workflow currently pins Node 20, **below** the 22.14.0 floor npm
trusted publishing needs). CI matrix `[22,24,26]` + non-blocking 27-alpha. Move 8 workflows
off Node 20. Update the check at `bin/install.js:32`. Keep an **11.x maintenance line**.

**C2. Structure** — `ADDR-01` (runtime addressing layer; codemod **198 hops across 114 files**;
gate behaviourally by spawning each hop in a scratch install, not by membership) →
`MERGE-01` (`.agent/bin`, 11,192 LOC, **0 files shipped and 0 JS requires it**, becomes
`bin/planning/` under a `plan` namespace with a deprecation shim) · `PLUGGEN-01`
(`git rm -r plugins/` — 433 tracked files including a 768KB bundle that differs from
`mcp-server/dist/` — and generate in CI with `git diff --exit-code`).

**C3. Data layer** — gated on NODE-01 **and** on EVAL-01's baseline existing, so the change is
falsifiable: `MEM-01` (`bin/memory/sqlite-driver.js`: node:sqlite → better-sqlite3 optional →
sql.js read-only; real WAL + `BEGIN IMMEDIATE` + `busy_timeout`; delete the whole-file
`export()`/`renameSync` path — 9 requiring modules, async→sync call-shape flip) → `MEM-02`
(FTS5 external-content + triggers + `ORDER BY bm25()`) → `MEM-05` (unified `bin/memory/search.js`
fusing FTS5-bm25 through the already-correct `bin/memory/retrieval-fusion.js` (RRF K=60, one
caller today); **drop the graph leg**). `MEM-04` independently (one `record-checksum.js` in the
12-line shape of `audit-hash.js`; accept 16-hex legacy read-only. **Do not delete
`sdk/src/memory.ts`** — `mindforge-sdk` is published and exports `MindForgeMemory`).

**C4. Platform + supply chain** — `HOOK-02` (register `PreCompact`, `PostToolBatch`,
`TaskCompleted`/`Stop`, `SessionEnd`, `SubagentStart`/`Stop`; `if:` filters with `**/` prefixes;
`async:true` on telemetry) → `VERIFY-01` → `WF-01` (install the 35 scripts to
`.claude/workflows/` + `"workflows"` in `plugin.json`; **keep** the 36 `.agent/mindforge/wf-*.md`
for the harnesses with no Workflow tool; fix the joined-string `args` at
`bin/workflows/workflow-runner.js:98-102`) → `WF-02` → `AUDIT-01`.
`SBOX-01` → `SC-01` (8 ToxicSkills categories; **one** shared injection-signature module —
there are 5 divergent lists — reclassified as *telemetry*; one shared unicode module, since
the CI scan covers the U+E0000 Tag block and the runtime hook does not; scan `CLAUDE.md`/
`MINDFORGE.md`/`SOUL.md`, currently excluded; add `Read` + `mcp__.*` matchers) → `SC-02`
(per-file SHA-256 with a fail-closed reader; `skills-lock.json` is 5 of 232 skills, one
directory hash, **zero code readers**) → `SC-03`. `MCP-01`/`MCP-02` + `SKILL-02`/`04`/`03`.

**Deferred to v13.x:** `EVAL-03` (XL — verify the schema-inheritance assumption first),
static embeddings, `MindForgeMemory` deprecation (needs its own major), package split,
MCP SDK v2 + 2026-07-28 dual-era serving.

---

## Guardrails — do not do these

Each was proposed and rejected on evidence.

| Tempting | Why not |
|---|---|
| Convert `bin/` to ESM | The hook fast path needs synchronous `require()`; ESM makes every hook async and **reopens the timeout hole**. No consumer imports `bin/` |
| Port workflow scripts to `.mjs`/TS | Only `.js` loads; others are counted and **skipped**. Silently unregisters all 35 with no failing test |
| DRY the workflow `meta` blocks | `meta` must be a pure literal — a helper or spread breaks every script at launch |
| Shorten hook timeouts before measuring | Two probes on build 2.1.233 disagree on whether a PreToolUse timeout fails open or closed. If closed, 5000→5 turns an invisible non-issue into **visible unexplained tool-call denials**. Instrument `duration_ms`, set p99+50% |
| Build an RFC 6962 Merkle tree / transparency log | **Nothing consumes an inclusion proof** — logs are per-project, gitignored, no second party. Rename the field |
| Adopt `permissionDecision: "defer"` | Print-mode-only by design; ignored in interactive |
| Build the swarm on Agent Teams | Experimental, off by default, absent in `-p`/SDK; enabling it silently converts named subagents into teammates that report only an idle notification |
| Ship a `sandbox` block from project scope | `strictAllowlist` has **no effect** there — yields a config that looks hardened and is not |
| Replace SQLite with LanceDB/Orama/Turso/DuckDB | Orama **reproduces the exact whole-file-rewrite defect being fixed**; the rest break "npx and it works" |
| DiskANN / `sqlite-vec` caret range | ANN is alpha-only. At 2,038 + 5,640 + 12 rows brute-force cosine is correct with perfect recall |
| Add `exports` to `package.json` | The whole tarball is deep-requirable today with no way to know who relies on it. Defer to v13.x |
| Register 355 skills natively without `paths:` | 355 descriptions enter every turn; bare names (`tdd`, `brainstorming`) collide with installed plugins. A project skill overrides a bundled skill but **never its aliases** |
| Single Executable Applications | SEA's injected `require()` resolves built-ins only — **174 dynamically-required modules break at once** |
| Fix `graph_edges` with a tree-sitter code graph | It is empty because a migration never ran over a file that has **never been written**, not because of the casing bug. Fix the 2 lines |
| Delete `.mindforge/skills/` from `files[]` | Three modules read it and `harness-audit.js:264-293` gates on it. **Reduce what installs, not what ships** |

---

## Reuse, don't rebuild

| Need | Already exists |
|---|---|
| Hash chaining | `bin/governance/audit-hash.js` (12 lines, writer+verifier share it, 1,934 entries reproduced) |
| Fail-closed file lock | `bin/learning/instinct-cli.js:78-100` — promote this, **not** `state.cjs:790` |
| Rank fusion | `bin/memory/retrieval-fusion.js` (RRF K=60, correct, one caller) |
| Bracket-aware config parsing | `sdk/src/client.ts:141-158` |
| Managed-block markers | `bin/installer/harness-adapter-compliance.js:22-23` |
| Adapter drift gate | `harness:compliance -- --check` (exists and passes; just unwired from CI) |
| Real SOUL scorer | `bin/review/ads-synthesizer.js:25` via `bin/review/ads-engine.js` |
| Single path source | `bin/memory/knowledge-store.js:118-130` `getPaths()` |

---

## Open risks carried into implementation

1. **PreToolUse timeout semantics are unresolved** — measure `duration_ms` on the target build
   before changing any timeout value.
2. **Whether `SubagentStart` fires for workflow-spawned agents** is undocumented — AUDIT-01
   must verify empirically before depending on it.
3. **No user telemetry was available**, so nothing here is grounded in what consumers actually
   use. Assume someone depends on `cwd: ROOT`, `--no-verify`, and deep `require` of `bin/…`.
4. **Not researched and uncovered by any item:** the 10 subagent marketplace plugins with
   hand-versioned entries (same drift class as VER-01), `bin/browser`, the 218 personas, and
   the 7,349 LOC of shipped Python that has no declared runtime, linter or test.
