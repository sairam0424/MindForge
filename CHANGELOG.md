# Changelog

## [Unreleased] — Concurrency: fail-closed append lock

### Fixed
- **Audit hash chain could fork under concurrent writers.** `bin/autonomous/audit-writer.js`
  read the chain head and appended with no mutual exclusion, and cached the head in-process
  indefinitely — so once a second process appended, the first kept chaining from a superseded
  hash. Added `bin/utils/file-lock.js` (a fail-closed advisory lock promoted from
  `bin/learning/instinct-cli.js`, deliberately NOT from `.agent/bin/lib/state.cjs`, which
  writes anyway when the lock cannot be taken) held across read-head-through-fsync, and made
  the cached head carry the file size that witnesses it is still the tail. 8 concurrent
  appenders went from 199 broken links + 4 forks per 200 entries to 0. A lock alone was
  measured insufficient — it still left 2 breaks and 1 fork, because the stale cache is a
  second, independent defect.
- **Knowledge-graph edge updates were lost under concurrency.** `deprecateEdge`,
  `reinforceEdge` and `applyDecay` in `bin/memory/knowledge-graph.js` each did
  `readAllEdges()` -> mutate -> append with no lock, and `addEdge` appended unserialised
  against them. Measured at HEAD over 4 runs of 8 processes x 20 `reinforceEdge` calls:
  93-129 of 160 increments lost, final `traversal_count` 31-67 instead of 160. All four
  write paths now hold the `graph-edges.jsonl` lock across read-through-append; the same
  probe then loses 0 of 160 in every run, with no lock-acquisition failures.
- `bin/governance/policy-engine.js`: `logAudit`'s un-awaited audit write now has a
  `.catch()` — a lock-contention failure is reported at the decision site instead of
  escaping as an unhandled rejection.
- `bin/hooks/instinct-capture-hook.js` appended to the instinct store without the lock that
  `instinct-cli`'s prune/import rewrite holds, so a hook append landing in that window was
  clobbered by the rename. It now takes the same lock.
- `tests/v7-sovereign-security.test.js`: `new PolicyEngine()` no longer defaults
  `planningDir` to `process.cwd()`, which appended test verdicts to the operator's real
  `.planning/RISK-AUDIT.jsonl`.
- Packaging: `package.json` files[] now excludes `**/*.lock` so a lockfile orphaned by a
  hard kill cannot leak into the npm tarball (verified: without the negation, a
  `.mindforge/memory/graph-edges.jsonl.lock` does ship).

## [11.9.2] — 2026-08-16 — Correctness: audit-chain integrity, dashboard crash policy, secret scanning

Patch release. No new features. Twelve commits closing defects found by a
multi-agent audit of v11.9.1, plus the five regression suites that keep them closed.

### Fixed

- **Audit-chain forgery via un-awaited rollback.** `HindsightInjector.inject` called
  the async `TemporalHub.rollbackTo` without `await`, so its rejection escaped the
  surrounding `try/catch` while execution continued: a failed rollback still fsync'd a
  hash-chained `hindsight_injected` entry and flipped `auto-state.json` to
  `awaiting_regeneration` for something that never happened. The log gained a
  cryptographically valid record of a non-event, and `verify-audit` reported the chain
  valid — valid and wrong.
- **CLI `defaultArgs` were replaced by user arguments, not prepended.** `mindforge
  health <anything>` lost `--check` and fell through to `installer-core`'s real
  `install()` with `force: true`. Now prepended.
- **`_verifyMetadata` compared UTF-16 code units, not bytes**, so a 64-unit / 65-byte
  `integrity` still threw `RangeError` — and the caller degraded that throw into
  "proceeding without integrity check" and restored the snapshot anyway. Read and
  verify are now separate stages; only a genuinely absent `SNAPSHOT-META.json` reaches
  the tolerant path.
- **Dashboard `RevOpsAPI` was required but never mounted**, so `/api/revops/overview`
  404'd while the AgRevOps panels and docs described it as live. Even mounted it threw:
  `getAuditEntries()` returns `{entries,total,limit,offset}` and three engines call
  `.filter()` on it.
- **Dashboard leaked error internals to clients.** `err.message` reached response
  bodies from 14 sites (`api-router.js` ×10, `temporal-api.js` ×3, `revops-api.js` ×1);
  for fs-sourced errors that string carries absolute paths, disclosing the operator's
  username and home directory. All sites now log server-side and return a generic
  message plus a `correlation_id`, behind a 4-arg terminal handler that stops express
  rendering `err.stack` when `NODE_ENV !== 'production'`.
- **Test runner discovery was a flat `readdirSync`**, so any suite in a subdirectory was
  invisible. Now a recursive walk that prunes `tmp-*` / `node_modules` / dot
  directories — directories only, never files.
- Three orphan files removed: one truncated `.planning/AUDIT.jsonl` to zero, one
  overwrote `.planning/STATE.md`, one called a function absent from `bin/`. Recursion
  made the `STATE.md` clobberer reachable by a single in-place rename; the other two
  were unreachable by the runner at any depth. **The claim in `5177225`'s message that
  all three were newly armed by recursion is correct for one of the three and
  over-attributed for the other two.**
- Three relocated demos kept one-level-up requires after moving a directory deeper, so
  all three exited 1; corrected to `../../bin/`.

### Changed

- **`mindforge audit-skill`, `register-skill`, `install-skill` and `record-learning` no
  longer carry `defaultArgs`.** Prepending turned them from inert into live state
  writers: `audit-skill <name> <ver> <tier>` appended a hash-chained
  `{event:'skill_installed', validation_passed:true}` entry for a skill that does not
  exist, and `register-skill` wrote a malformed row above the table header of
  `.mindforge/org/skills/MANIFEST.md`, which ships in the tarball. Bare invocations now
  print usage and exit 0 without reaching those writers, as at v11.9.1.
- **`subagent` is a first-class command.** Prepending `spawn` shadowed `spawn-agent`'s
  `subagent` mode, whose documented route was `mindforge spawn subagent <name>`.
- **The dashboard now exits on an unhandled rejection instead of logging and
  continuing.** An escaped rejection is the only reliable signal that an async call was
  left un-awaited, and express 4.22.1 does not route async handler rejections to error
  middleware — log-and-continue held the client socket open until the client gave up
  (2.5s, 4s and 8s clients all timed out) versus a ~15ms reset on exit. Symmetric with
  `uncaughtException`, whose log-and-continue form had made `shutdown()` swallow a
  throwing token unlink and keep serving the token-authenticated mutation API **after
  SIGTERM**, with the bearer token still on disk and valid in memory.
- **Dashboard error responses changed shape.** `detail` is removed from 5 endpoints,
  raw errno strings from 10 more, `correlation_id` is added to 15, and a malformed
  request body now returns `application/json` rather than express's `text/html` error
  page. Anything parsing `detail` must correlate on the logged id instead.

### Added

- **Secret scanning enforced at three layers**: `.gitleaks.toml`, a `.husky/pre-commit`
  gate that fails loudly when gitleaks is absent rather than skipping, and
  `.github/workflows/secret-scan.yml` scanning full history. `scripts/ci/verify-secret-scan.sh`
  self-tests the scanner — it distinguishes "scanned clean" from "scanned and found"
  from "did not scan", because gitleaks exits 1 for both a finding and a failed config
  load, and writes no report in the latter case.

### Tests

- Five regression suites, 102 files total (100 pass, 2 environment-dependent skips):
  `temporal-integrity`, `dashboard-error-leak`, `dashboard-crash-guards`,
  `dashboard-wiring`, `cli-router`. `dashboard-wiring` derives the expected router set
  from `server.js`'s own requires, so adding a router without mounting it fails.
  `cli-router` runs against a mirror-root sandbox under `os.tmpdir()` — required, not
  tidiness: the case that proves audit forgery is prevented would otherwise forge an
  entry into the real chain on every run. `revops-roi.test.js` had 0 assertions and
  could not fail; it now has 6.

### Not fixed — deferred to v12

- **No hook is registered in any consumer install.** The installer copies 9 hook
  scripts into `<runtime>/hooks/`, but nothing writes `.claude/settings.json` and it is
  absent from `package.json` `files[]`. Verified by installing the tarball into a
  scratch project. Every gate this release hardens is inert until that lands.
- **`requireAuth` exempts GET and OPTIONS**, so every read route — including
  `/api/audit`, which serves the hash-chained audit log — is credential-free to any
  local process. Mutations are protected. This is a threat-model decision, not a patch.
- **`audit-skill audit <name> <ver> <tier>`** — the explicit form — still reaches a
  writer that performs no existence check and hardcodes `validation_passed: true`. Only
  the bare invocation is closed.
- **Snapshot integrity is not an authenticity control.** `HMAC_KEY` is a literal in
  shipped source, the HMAC covers only the metadata object so file **contents** are
  unsigned (editing a file inside a signed snapshot leaves the signature valid), and
  deleting `SNAPSHOT-META.json` bypasses verification entirely.
- `cwd: ROOT` in the CLI, which resolves consumer state inside `node_modules`.
- `security-scan` cannot fail: its parser expects `KEY=value` while `MINDFORGE.md` uses
  `[KEY] = value`, so it always reports 0 settings and exits 0.
- Version drift in six publishable manifests (`Formula/mindforge.rb`, `Dockerfile`,
  `mcp-server/server.json`, `mcp-server/src/index.ts`, the plugin manifest and the
  marketplace entry) is untouched here — none is gated, and the Formula pins a tarball
  sha256 that cannot exist before publish.

## [11.9.1] — 2026-07-29 — Packaging Fix: Restore Missing Workflow Commands

### Fixed
- A blanket `.claude/` rule in `.gitignore` (pre-existing, unrelated to the v11.9.0 work) was silently excluding 34 command files under `.claude/commands/mindforge/` from git — mostly the `wf-*` dynamic-workflow slash commands, plus `skill-tdd.md`, `skills-index.md`, and `systematic-debug.md`. Since `package.json`'s `files` array includes `.claude/commands/`, this meant **v11.9.0's published npm tarball was missing every `wf-*` slash command** even though the mirrored `.agent/mindforge/` copies shipped correctly. Removed the redundant gitignore rule (the repo's existing `*.local` pattern already covers the actual intended exclusion, `.claude/settings.local.json`) and committed all 34 files.
- Added a regression guard to `tests/packaging-allowlist.test.js` asserting `.claude/commands/mindforge/` and `.agent/mindforge/` ship the same file count — the prior `>=150` floor check passed throughout this gap's entire lifetime since both counts already exceeded 150 independently.

## [11.9.0] — 2026-07-27 — Bedrock Provider + Full Dry-Run Audit

### Added
- `bin/models/bedrock-provider.js`: AWS Bedrock provider with Anthropic/Bedrock config switch and base64 credential decoding

### Fixes (from a full exhaustive dry-run of all 224 commands, 216 personas, and 355 skills)
- Resolved phantom-tool references ported unmodified from a different agent harness across 40 personas and ~40 skills (`Context7`/`search_web`/`read_url_content` → `WebFetch`/`WebSearch`; `CommandStatus`/`ReadTerminal`/`terminal`/`read_file`/`write_file`/`search_files`/`patch` → real Claude Code tool names; `delegate_task` → `Agent`; `kanban_create` → `TaskCreate`)
- Repointed 21 broken `@.agent/references/` and `@.agent/templates/` path references to their real `docs/References/` and `docs/Templates/*/` locations
- Copied in missing companion `scripts/`/`references/`/`templates/` assets for 17 skills that referenced files never carried over during porting
- Fixed hardcoded broken paths (`~/.hermes/skills`, `/home/teknium/...`, `HERMES_HOME`)
- Fixed a markdown fence-nesting bug in `code-tour` and 4 truncated heredoc strings in `github-code-review`
- Removed banned single-word triggers (`test`, `tests`) from `testing-standards`
- CI: build SDK before test suite; run Verification before Health Check in execution-plane
- Security: patched hono and picomatch HIGH-severity vulnerabilities

## [11.8.3] — 2026-07-01 — Autopsy Fixes Stable Release

### Fixes (all confirmed by IQ200 deep audit)
- `bin/mindforge-cli.js`: Added `--version` / `-V` flag — now prints version and exits 0
- `bin/spawn-agent.js`: Marked spawn/identity as `[NOT IMPLEMENTED in v1.0]` in help text; added `assertSafeName()` path-containment guard to spawn branch
- `.mindforge/config.json`: `mesh.node_id` confirmed `"auto"` (not "beta-node")
- `bin/governance/rbac.js`: Created re-export shim → `rbac-manager.js`
- `bin/engine/skill-loader.js`: Created stub module with `loadSkill`, `matchTriggers`, `VERSION` exports
- `bin/memory/eis-client.js`: Added `module.exports.EISClient = EISClient` — named import now works
- `sdk/`: Added `@types/node` dev dependency; 24 TypeScript typecheck errors resolved
- `bin/autonomous/auto-runner.js`: `null` phase now throws `TypeError` instead of silently coercing to `"0"`
- `.mindforge/skills/`: Resolved 12 duplicate trigger strings — skill routing is now deterministic

### Health Score
- IQ200 audit: 248/258 → 258/258 checks passing (100%)
- Test suite: 95/97 → 95/97 (2 env-skipped, 0 failures)
- 0 CVEs across all 3 packages

---

## [11.8.2] — 2026-07-01 — Clean Stable Release

### Fixes
- `bin/installer-core.js`: Added main-guard — `health` command now produces full diagnostic output
- `bin/mindforge-cli.js:185`: Fixed null-status bug — signal-killed child processes now exit with code 1 instead of 0
- `bin/change-classifier.js`: Tier 2 branch now pushes descriptive reasons to reasons[] array
- `sdk/tests/sdk.test.js:30`: Replaced hardcoded version "11.8.0" with dynamic package.json read
- `tests/sdk-exports.test.js`: Fixed MODULE_NOT_FOUND path resolution
- `README.md:7`: Updated "Latest: v11.8.0" header to "Latest: v11.8.1"

### Improvements
- `bin/spawn-agent.js --help`: Added v1.0 stub disclosure note to usage text
- `bin/governance/ztai-manager.js`: Lazy-instantiate SecureEnclaveProvider — eliminates spurious Tier-3 warning on commands that do not use Tier-3 trust
- `bin/review/cross-review-engine.js`: Added CLI entry point with --help, --diff, --phase, --context args
- `tests/worktree-engine.test.js`: Added 90-second timeout override to prevent false parallel-runner timeout
- ESLint: Resolved auto-fixable errors, lint stage now clean
- Test coverage: Added tests/errors.test.js and tests/file-io.test.js to improve coverage toward 80% target

---

## [11.8.1] — 2026-07-01 — First Stable Release

### Security
- **mcp-server:** Patched hono to >=4.12.25 — fixes CORS credential reflection, path traversal (Windows), body-limit bypass, Set-Cookie merging, Lambda@Edge header drop
- **sdk:** Patched picomatch — fixes ReDoS via extglob quantifiers and Method Injection via POSIX character classes
- **ztai:** Added SECURITY_TIER_3_SIMULATED disclosure constant and startup warning for in-process key simulation

### Fixes
- `bin/sre/sli-verifier.js`: `simulateShadowWave()` now throws in non-simulate mode — gate with `MINDFORGE_SRE_SIMULATE=true`
- `bin/spawn-agent.js`: spawn stub now exits 1 with actionable error instead of silently succeeding
- `bin/memory/eis-client.js`: `resolveRemoteNode()` now throws explicitly instead of returning null
- `bin/browser/session-manager.js`: added `capabilities.importFromBrowser=false` export
- `.mindforge/config.json`: `mesh.node_id` changed from "beta-node" placeholder to "auto"

### Docs
- README: fixed stale version refs (11.5.1→11.8.1), corrected workflow count to 32, added Node.js >=18 prerequisite and Hello World section
- SECURITY.md: documented Tier-3 simulation scope, audit-hash replay boundary, spawn dispatch status
- docs/troubleshooting.md: added spawn stub, importFromBrowser, and test cwd entries
- docs/sdk-reference.md: updated version to 11.8.1, marked unimplemented methods
- docs/enterprise-setup.md: documented mesh.node_id configuration requirement

### Tests
- install.test.js + production.test.js: added cwd guard, scoped secrets scan to MindForge root only

---

## [11.8.0] - 2026-06-24 — Workflow Forge II

Expands the Dynamic Workflow Library from 12 to 33 workflows across 5 tiers, adding a new **Beast tier** for compound multi-phase multi-agent workflows with adversarial verification. 21 new workflows added. 92/92 tests pass.

### Added

- **Beast tier** (3 compound workflows, 5 phases, 8+ agents): `security-hardening` (5-angle OWASP parallel scout + 3-vote adversarial verify + STRIDE threat model + remediation roadmap), `accessibility-audit` (WCAG 2.2 6-principle parallel audit + 3-vote verify + remediation spec), `security-threat-model` (asset inventory + 6-parallel STRIDE + mitigations + CVSS scoring)
- **Dev tier additions** (7): `test-coverage-gap`, `api-contract-test`, `mutation-testing`, `debug-detective`, `writer-reviewer`, `code-explainer`, `design-system-audit`
- **Ops tier additions** (4): `database-migration`, `dependency-health`, `multi-repo-sync`, `cost-analysis`
- **Intelligence tier additions** (3): `architecture-modernization`, `documentation-gen`, `api-migration`, `data-pipeline-validate` (4 total)
- **Research tier additions** (3): `ai-model-eval`, `ux-heuristic-audit`, `competitive-teardown`
- 21 new `/mindforge:wf-*` slash command pairs
- Updated `wf-catalog` listing all 33 workflows across 5 tiers
- `tests/workflow-registry.test.js` — `beast` added to valid tier allowlist

---

## [11.7.1] - 2026-06-23 — Workflow Forge (patch)

Patch release: adds `bin/parse-workflow-args.js` (slash command argument splitter, produced by the tdd-sprint E2E run) and resolves 2 high-severity npm vulnerabilities in the tmp/inquirer dependency chain. No feature changes; all 94 tests pass.

---

## [11.7.0] - 2026-06-23 — Workflow Forge

First Dynamic Workflow Library for MindForge. Adds 12 pre-built multi-agent workflow scripts that users trigger via `/mindforge:wf-*` commands. Each workflow uses Claude Code's `Workflow` tool primitives (`parallel()`, `pipeline()`, `phase()`, `agent()`) for true fan-out concurrent agent execution with structured synthesis. Architecture follows adversarially-verified best practices: three-tier progressive disclosure, one-workflow-per-domain, predefined (not open-ended) patterns.

### Added

- **Dynamic Workflow Library (`.mindforge/dynamic-workflows/`)** — 12 self-contained multi-agent workflow scripts:
  - *Research tier:* `deep-research` (5× parallel searches → 3-vote adversarial verify → cited synthesis), `competitive-analysis` (5× parallel angles → SWOT → positioning), `tech-evaluation` (5× dimension agents → scored matrix → recommendation)
  - *Dev tier:* `code-audit` (3× parallel auditors → adversarial verify → risk report), `feature-planner` (brief → PRD → architecture → user stories pipeline), `pr-review` (4× parallel reviewers → consensus verdict), `tdd-sprint` (Spec → Red → Green → Refactor loop), `refactor-plan` (debt scan → risk-sort → safe sequence → plan)
  - *Ops tier:* `incident-response` (4× parallel investigation → mitigation → RCA → postmortem), `release-prep` (tests → changelog → version bump → PR → announcement)
  - *Intelligence tier:* `onboard-codebase` (map → domain → architecture → guided tour), `perf-optimize` (profile → 4× parallel bottleneck hunt → fix plan → benchmarks)
- **13 new slash commands** — `/mindforge:wf-catalog` (browseable index) + 12 `/mindforge:wf-<name>` workflow commands
- **CLI workflow subcommand** — `node bin/mindforge-cli.js workflow list|info|run <name>` for discovery and metadata access
- **Workflow registry** — `index.json` (machine-readable) + `REGISTRY.md` (human-readable catalog) with tier, description, phases, and command for each workflow
- **`tests/workflow-registry.test.js`** — validates registry consistency, script meta exports, command mirror parity, and frontmatter schema for all workflow commands

### Summary

| Tier | Workflows | Commands |
|------|-----------|----------|
| Research | 3 | `wf-deep-research`, `wf-competitive-analysis`, `wf-tech-evaluation` |
| Dev | 4 | `wf-code-audit`, `wf-feature-planner`, `wf-pr-review`, `wf-tdd-sprint`, `wf-refactor-plan` |
| Ops | 2 | `wf-incident-response`, `wf-release-prep` |
| Intelligence | 2 | `wf-onboard-codebase`, `wf-perf-optimize` |
| **Total** | **12** | **13 (including wf-catalog)** |

---

## [11.6.0] - 2026-06-17 — Skill Forge

Largest single skill expansion in MindForge's history. Adds 80 community-sourced skills across 8 engineering domains with zero external attribution in any committed file. 30 skills are promoted to the engine tier for automatic trigger-matching; 50 live in the extended tier for explicit activation. Three new slash commands complete the discovery surface.

### Added

- **Engine-tier skills (auto-trigger, `.mindforge/skills/`)** — 30 new skills activated automatically when task description matches trigger phrases:
  - *Software development:* `systematic-debugging` (4-phase root-cause methodology), `test-driven-development` (RED-GREEN-REFACTOR), `plan` (implementation planning), `simplify-code`, `requesting-code-review`, `spike`, `subagent-driven-development`, `code-wiki`
  - *DevOps & orchestration:* `kanban-orchestrator`, `kanban-worker` (multi-agent task routing)
  - *GitHub workflows:* `github-code-review`, `github-pr-workflow`, `github-issues`, `codebase-inspection`
  - *Research & intelligence:* `research-paper-writing`, `arxiv`, `osint-investigation`, `domain-intel`, `duckduckgo-search`, `scrapling`, `blogwatcher`
  - *Creative:* `concept-diagrams` (SVG educational visuals), `creative-ideation`, `pixel-art`, `meme-generation`
  - *Security:* `web-pentest` (authorized penetration testing), `oss-forensics`, `sherlock`
  - *Data-science & note-taking:* `jupyter-live-kernel`, `obsidian`

- **Extended-tier skills (explicit activation, `.agent/skills/`)** — 20 additional skills beyond the promoted 30:
  - *Software development:* `node-inspect-debugger`, `python-debugpy`, `skill-authoring`, `rest-graphql-debug`
  - *GitHub:* `github-auth`, `github-repo-management`
  - *DevOps:* `docker-management`, `devops-cli`, `devops-watchers`, `pinggy-tunnel`, `s6-container-supervision`
  - *Research:* `llm-wiki`, `polymarket`, `parallel-cli`
  - *Security:* `godmode`, `1password-skill`
  - *Creative:* `hyperframes`, `article-illustrator`, `comic-creator`, `video-orchestrator`

- **3 new slash commands:**
  - `/mindforge:systematic-debug` — 4-phase root-cause debugging (no fixes without RCA)
  - `/mindforge:skill-tdd` — strict RED-GREEN-REFACTOR TDD enforcement
  - `/mindforge:skills-index` — browseable catalog of all 153 skills grouped by category

### Changed

- `tests/install.test.js` — added `hermes-agent` to secret-scanner skip list (gitignored donor directory)
- `CLAUDE.md` — new **Extended Skill Library** section documents both skill tiers, trigger mechanics, and bulk import pattern

### Skill counts

| Tier | Before | After |
|---|---|---|
| Engine tier (`.mindforge/skills/`) | 202 | 232 |
| Extended tier (`.agent/skills/`) | 73 | 123 |
| Slash commands | 174 | 177 |

---

## [11.5.1] - 2026-06-11 — Robustness + governance-gate patch (Wave 8)

A fast-follow patch from a fresh adversarial audit of the shipped v11.5.0 tree.
Hardens crash-prone JSON parsing in the autonomous/memory pipelines, closes a
CI governance-gate gap, and tightens two security surfaces. No new features.

### Fixed

- **Crash-proof AUDIT.jsonl parsing** (`bin/memory/pillar-health-tracker.js`) —
  `summarizePhase()` parsed every audit line with an unguarded `JSON.parse`, so a
  single malformed/torn line crashed the knowledge-capture pipeline. Now parses
  per-line in try/catch and skips bad lines.
- **Crash-proof compaction capture** (`bin/memory/knowledge-capture.js`) — a
  malformed `handoff.json` no longer throws out of `captureFromCompaction()`; it
  logs and returns `[]`, mirroring the missing-file path.
- **Resilient federated-sync stats** (`bin/memory/federated-sync.js`) — the two
  unguarded `JSON.parse` calls on `sync-stats.json` (`handleSyncFailure`,
  `resetFailures`) now fall back to `{failures:0}` on corruption, matching the
  sibling `getLastSyncTimestamp` pattern.

### Security

- **CI Tier-3 governance gate now validates content** (`.github/workflows/control-plane.yml`)
  — the gate counted approval files but never checked them; it now requires at
  least one approval with `identity_verification.verified === true` and a
  signature, and rejects any unverified/empty file. Completes the Wave-6
  fail-closed `approve.js` work (a hand-committed empty approval no longer passes).
- **Dashboard approval attribution** (`bin/dashboard/api-router.js`) —
  `POST /api/approve/:id` no longer records the client-supplied `approver`
  (forgeable audit identity); it attributes the action to a fixed authenticated
  actor. The dashboard remains localhost-bound + token-gated.
- **Destructive-command detector blocks Unix `truncate`** (`bin/security/trust-boundaries.js`)
  — the SQL-only `truncate table` pattern missed `truncate -s 0 <path>` (in-place
  file zeroing). Added a size-flag pattern so it is gated; benign uses stay allowed.
- **CI Tier-3 gate accepts an explicitly-acknowledged unverified approval**
  (`.github/workflows/control-plane.yml`, `bin/governance/approve.js`) — since this
  repo has no GPG signing infra, the gate accepts an approval that is either
  GPG-verified OR an opted-in `unverified_ack` record (`approve.js` under
  `MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1`), while still rejecting bare/stale
  `verified:false` files. Replaced the stale v11.4.0 approval with a fresh one.
- **`uuid` dependency removed from `ads-engine`** (`bin/review/ads-engine.js`) — it
  required the uninstalled `uuid` package, making `ads-engine` and (transitively)
  `federated-sync` un-loadable in a clean install. Swapped to the built-in
  `crypto.randomUUID()` (zero-native-deps); both modules now load.

## Older releases

See [changelogs/](./changelogs/) for the complete archive (all 98 versions back to v0.1.0), or [changelogs/README.md](./changelogs/README.md) for an indexed table of contents.
