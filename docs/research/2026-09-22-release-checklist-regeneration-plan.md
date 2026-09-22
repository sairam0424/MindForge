# RELEASE-CHECKLIST.md Regeneration — Concrete Handoff Plan

**Status:** Plan only. Not implemented. Written for handoff to whoever regenerates
`.planning/RELEASE-CHECKLIST.md`.
**Investigated:** 2026-09-22, against the live MindForge repo at
`/Users/sairamugge/Desktop/Not-Humans-World/MindForge` (primary source — every claim below is a
file path + line number I read directly, or a command I ran directly, in this session; nothing
here is taken from a prior report or summary).
**Scope:** No external sources were needed — every claim in scope is internal to this repo, so
there are no URLs to cite.

---

## 0. tl;dr for the reader in a hurry

1. `.planning/RELEASE-CHECKLIST.md` is a dead stub: v1.0.0, only sections A–F, only through F05,
   every result cell empty. It does not match the checklist it claims to track.
2. `.mindforge/production/production-checklist.md`'s real current shape is v2.0.0, sections A–G,
   65 items (A–F at 10 each = 60, G at 5 = 65).
3. **Confirmed:** Sections A–E's body text in `production-checklist.md` (lines 15–28) is
   genuinely placeholder — literally `... (existing items A01–A10)` etc., not real tables. Only
   F and G have the real `# | Check | Verification step | ✅/❌ | Verified by | Date` table
   shape. The one thing A–E *do* have is a one-line description per item in the "Checkbox
   summary" section (lines 58–107) — but no verification step.
4. Section 3 below proposes a concrete, runnable verification step for every one of the 50 A–E
   items, each traced to a real command, test file, or grep already in this repo.
5. **Six items cannot be honestly given a real verification command today** (C04, C08, E02, E06,
   D07, E09/E10 partially) — see Section 4. Proposing a fake command for these would violate the
   "measured, not asserted" bar this project holds itself to, so I did not.

---

## 1. Current state, verified directly

### 1.1 `.planning/RELEASE-CHECKLIST.md` (read in full)

```
# MindForge v1.0.0 — Release Checklist
...
## Verification log
| Item | Result | Verified by | Date | Notes |
|---|---|---|---|---|
| A01 |  |  |  |  |
...
| F05 |  |  |  |  |
```

- Title says **v1.0.0**; `package.json` (read this session) says the package is at **11.9.8**,
  and `production-checklist.md`'s own title says **v2.0.0**. Three different version strings
  across two checklist files plus the package — none agree.
- 55 rows total (A01–A10, B01–B10, C01–C10, D01–D10, E01–E10, F01–F05). Stops at **F05** — F06–F10
  and all of section G are entirely absent, not just unfilled.
- Every `Result`/`Verified by`/`Date`/`Notes` cell is empty across all 55 rows — this file has
  never actually been used to record a real release verification.

### 1.2 `.mindforge/production/production-checklist.md` (read in full)

- Title: **"MindForge v2.0.0 — Production Readiness Checklist"**, line 3: **"ALL 65 items must be
  ✅"**.
- Real structure: Section A (10) + B (10) + C (10) + D (10) + E (10) + F (10) + G (5) = **65**,
  confirmed by direct count.
- Section F (lines 30–43) and Section G (lines 45–53) have the **real** per-item table shape:

  ```
  | # | Check | Verification step | ✅/❌ | Verified by | Date |
  ```

  e.g. line 34: `| F01 | ... scaffolds commands in both .claude and .agent | Run command, check
  both dirs | | | |` — a real description AND a real (if terse) verification step, per item.

- Sections A–E (lines 15–28) are **verbatim placeholder text**, confirmed by direct read — this is
  the entire body of each of those five sections:

  ```
  ## SECTION A — Installation & Upgrade (10 points)
  ... (existing items A01-A10)

  ## SECTION B — Command Coverage (10 points)
  ... (existing items B01-B10)

  ## SECTION C — Governance Gates (10 points)
  ... (existing items C01-C10)

  ## SECTION D — Documentation (10 points)
  ... (existing items D01-D10)

  ## SECTION E — Test Coverage (10 points)
  ... (existing items E01-E10)
  ```

  This confirms the prior report's flag: A–E have **no per-item verification-step column at all**
  in the section bodies — not "thin," literally the string `... (existing items ...)`.

- The one thing A–E *do* have: a "Checkbox summary" block (lines 57–123) with one terse
  description per item, e.g. line 68: `- [ ] B01 — All 36 commands present in
  .claude/commands/mindforge/`. This is a description, not a verification step — there is no
  command, test, or grep attached to it anywhere in the file.

### 1.3 Answering the flagged question directly

> Do Sections A–E have real per-item verification steps, or are they still placeholder text?

**Placeholder text, confirmed by direct read.** The section bodies (1.2 above) are literally
`... (existing items ...)`. The checkbox summary gives a one-line *description* per item but zero
verification steps. F and G are the only sections with the real `Check | Verification step` table
shape. This is exactly the asymmetry the prior report named, verified firsthand rather than
trusted.

---

## 2. Proposed 65-row table structure for the regenerated `RELEASE-CHECKLIST.md`

Two real precedents exist in this repo and should be reconciled rather than picked between:

- `RELEASE-CHECKLIST.md`'s own log table: `| Item | Result | Verified by | Date | Notes |`
- `production-checklist.md`'s F/G tables: `| # | Check | Verification step | ✅/❌ | Verified by | Date |`

**Proposal: merge them into one table**, so a release manager never has to flip between two files
mid-verification. One column set, applied uniformly across all 65 rows (not just F/G):

```markdown
# MindForge v2.0.0 — Release Checklist

Use this file to record verification results for the 65-point production readiness checklist in
`.mindforge/production/production-checklist.md`. `Check` and `Verification step` are copied here
from that file so this log is self-contained; if the two ever disagree, `production-checklist.md`
is the source of truth for what the check IS, this file is the source of truth for whether it has
been RUN.

## Metadata
- Target version: v2.0.0
- Release date: [date]
- Release manager: [name]

## Verification log

| Item | Check | Verification step | Result | Verified by | Date | Notes |
|---|---|---|---|---|---|---|
| A01 | bin/install.js has shebang and runs without error | `head -1 bin/install.js` shows `#!/usr/bin/env node`; `node bin/install.js --version` exits 0 | | | | |
| A02 | bin/installer-core.js exports run() function | `node -e "console.log(typeof require('./bin/installer-core.js').run)"` prints `function` | | | | |
| ... | ... | ... | | | | |
| G05 | npm publish --dry-run is clean | Run dry-run, verify file list | | | | |
```

Structural requirements for the regenerated file, derived from the two real precedents above:

1. **65 rows**, in the same A→G order and numbering as `production-checklist.md` (A01–A10,
   B01–B10, C01–C10, D01–D10, E01–E10, F01–F10, G01–G05). The current 55-row/F05-cutoff file must
   be fully replaced, not patched.
2. **`Check` and `Verification step` columns populated for every row** — for F and G, copy
   verbatim from `production-checklist.md` lines 34–53 (already real). For A–E, use the 50
   proposals in Section 3 below.
3. Keep the `Result | Verified by | Date | Notes` columns exactly as the current file already
   uses them (`Result` should record `✅`/`❌`, matching `production-checklist.md`'s existing
   F/G convention, not the currently-blank convention the A–F05 stub never actually used).
4. **Metadata block**: bump `Target version` from `v1.0.0` to `v2.0.0` to match
   `production-checklist.md`'s real title (currently a straight contradiction between the two
   files' H1s).
5. For any item flagged in Section 4 below as having no real automated check today, the
   `Verification step` cell should say so honestly (e.g. "No automated check exists; manual
   review — see Section 4 of the regeneration plan") rather than inventing one. This keeps the
   regenerated file itself inside this project's own "measured, not asserted" bar, rather than
   just moving the overclaim from one file to another.

---

## 3. Proposed verification step for each of the 50 A–E items

Every row below is traced to something I read or ran directly in this session. Where a command
is already documented in root `CLAUDE.md` or `CONTRIBUTING.md`, I used that exact command rather
than inventing an equivalent. Where the closest real artifact is narrower than the checklist
item's wording, I say so in the Note column — that gap is itself a finding, not something to
paper over.

### Section A — Installation & Upgrade

| # | Item (as currently worded) | Proposed verification step | Citation | Note |
|---|---|---|---|---|
| A01 | bin/install.js has shebang and runs without error | `head -1 bin/install.js` → `#!/usr/bin/env node`; `node bin/install.js --version` exits 0 | `bin/install.js:1`, `:53` (verified: shebang present, `--version` flag handler real) | |
| A02 | bin/installer-core.js exports run() function | `node -e "console.log(typeof require('./bin/installer-core.js').run)"` → `function` | `bin/installer-core.js:1383` `module.exports = { run, install, uninstall, verifyInstall, ... }` (verified) | |
| A03 | Installer handles --version flag | `node bin/install.js --version` (documented in root `CLAUDE.md`'s command table as `npx mindforge-cc@latest --version`) | `bin/install.js:53` `if (ARGS.includes('--version') || ARGS.includes('-v'))` (verified) | |
| A04 | Node.js version gate (>= 18) | `node tests/install.test.js` (installer smoke tests); gate itself reads `process.versions.node.split('.')[0]` | `bin/install.js:42` (verified); `package.json:117-119` `"engines": {"node": ">=18.0.0"}` (verified) | No test file name is specific to the version gate alone — `install.test.js` is the closest real, run-able artifact |
| A05 | CI mode detection works | `node tests/ci-mode.test.js` | Real file, header confirms "MindForge Day 6 — CI Mode Tests" (verified) | |
| A06 | Existing CLAUDE.md backed up before overwrite | `node tests/install.test.js`; backup logic itself: `bin/installer-core.js:495-498` writes `${dst}.backup-${Date.now()}` | Verified directly (grep) | |
| A07 | Self-install detection prevents double-install | `node tests/install.test.js`; guard itself: `isSelfInstall()` at `bin/installer-core.js:378`, applied at `:612-625` | Verified directly (grep); corresponds to ADR-018 in `docs/architecture/decision-records-index.md` | |
| A08 | Sensitive files excluded (*.env, *.key, *.pem) | `node -e "console.log(require('./bin/installer-core.js').SENSITIVE_EXCLUDE)"` and confirm `.env`/`.key`/`.pem`-style patterns present | `bin/installer-core.js:393` (array def, verified), `:1383` (exported, verified) | |
| A09 | Post-install verification passes | `node tests/install.test.js` (exercises `verifyInstall()`) | `bin/installer-core.js:535` `function verifyInstall(baseDir, cmdsDir, runtime, scope)` (verified), exported at `:1383` | |
| A10 | Upgrade from previous version preserves config | No dedicated automated test found today. Real code exists: `bin/updater/self-update.js`, `bin/updater/version-comparator.js` (ADR-019 in the ADR index). Manual procedure until a test exists: install at version N, bump `package.json`, re-run installer with `--force`, diff the preserved project config. | Verified: `bin/updater/` directory listing; no `updater`/`self-update`-named file exists under `tests/` (checked against the full 140-file test listing) | **Flag:** no runnable single command exists for this item today |

### Section B — Command Coverage

| # | Item (as currently worded) | Proposed verification step | Citation | Note |
|---|---|---|---|---|
| B01 | All **36** commands present in `.claude/commands/mindforge/` | `find .claude/commands/mindforge -name "*.md" \| wc -l` | Ran directly: **221**, not 36 (verified) | **The "36" in the item's own wording is stale.** Root `CONTRIBUTING.md` line 96-97 states "221 slash commands" as of now, and `tests/doc-count-claims.test.js` already pins this exact number elsewhere (lines 15, 212, 377: "~130 workflows actual 221" / "2 of 221 command files"). Recommend the regenerated item say "command count matches `tests/doc-count-claims.test.js`'s pinned figure" instead of a hardcoded number, following this repo's own established anti-drift pattern rather than reintroducing a new one |
| B02 | All 36 commands mirrored to `.agent/mindforge/` | `diff <(cd .claude/commands/mindforge && ls *.md \| sort) <(cd .agent/mindforge && ls *.md \| sort)` | Ran directly: **empty diff** — fully mirrored today, 221 = 221 (verified) | Same stale-count caveat as B01 applies to the description, not the check itself |
| B03 | No command file is empty (> 100 chars) | `find .claude/commands/mindforge -name "*.md" -size -100c` | Ran directly: **empty result** (verified, currently passes) | |
| B04 | Command files include usage or step markers | `grep -L "<process>\|<execution_context>\|^## \|^[0-9]\+\. " .claude/commands/mindforge/*.md` should return nothing | Ran directly: **empty** (verified, currently passes across all 221 files) | The real convention is XML-style tags (`<objective>`, `<execution_context>`, `<process>`) with numbered steps, per `add-backlog.md` (read in full) — **not** markdown `##` headings, which a naive `grep "^## "` check would wrongly fail on ~200+ files (confirmed by running that narrower grep first and getting many false hits before finding the real convention) |
| B05 | help command lists all available commands | Read `.claude/commands/mindforge/help.md` and confirm it dynamically scans the directory rather than hardcoding a list | `help.md:11`: "Scan every .md file in `.claude/commands/mindforge/`" (verified) | Dynamic, so this item is structurally self-correcting as commands are added/removed — good design, worth preserving as the model for B01/B02's fix |
| B06 | init-project creates required scaffolding | `grep -n "PROJECT.md\|REQUIREMENTS.md\|STATE.md" .claude/commands/mindforge/init-project.md` | `init-project.md:38` "## Step 2 — Create context files" (verified) creates `.planning/PROJECT.md`, `.planning/REQUIREMENTS.md` per its own body | |
| B07 | plan-phase references CONTEXT.md | `grep -n "CONTEXT.md" .claude/commands/mindforge/plan-phase.md` | `plan-phase.md:19-29` (verified, real, multiple references) | |
| B08 | execute-phase has verify gate | `grep -n "<verify>" .claude/commands/mindforge/execute-phase.md` | `execute-phase.md:83` "Run the **5-Level Escalating Validation Ladder**... as the `<verify>` body" (verified) | |
| B09 | ship command runs full checklist | `grep -n "Checklist" .claude/commands/mindforge/ship.md` | `ship.md:85` "### Checklist" (verified) | |
| B10 | debug command has hypothesis-driven workflow | `grep -n -i "hypothesis" .claude/commands/mindforge/debug.md` | `debug.md:47-48` "Form hypothesis" / "Test hypothesis (write a failing test)" (verified) | |

### Section C — Governance Gates

| # | Item (as currently worded) | Proposed verification step | Citation | Note |
|---|---|---|---|---|
| C01 | SOUL score enforcement active | `node tests/mindforge-params.test.js && node tests/cli-router.test.js` | `mindforge-params.test.js:34` asserts `MIN_SOUL_SCORE === '7.0'`; `cli-router.test.js:288-322` asserts a config declaring `[MIN_SOUL_SCORE] = 99` fails with "exceeds maximum 10" (both verified) | |
| C02 | Cost hard limit blocks overspend | `node tests/cost-limit.test.js` | Header (verified): "MindForge v11.9.3 — daily cost cap enforcement (COST-02)... drives the REAL wiring" | |
| C03 | Security gate blocks unsafe changes | `node bin/mindforge-cli.js security-scan` (documented in root `CLAUDE.md`'s command table) + `node tests/security-audit.test.js` | Both real (verified: CLAUDE.md command list; test file exists and its header names ZTS/ZTAI) | |
| C04 | Audit log rotation at 10000 lines | **No real command exists.** | `bin/autonomous/audit-writer.js:8-15` (read in full, verbatim): *"Retired in UC-04b: the old buffered async writer (`createAuditWriter`) and its AuditRotator-based **5000-line** rotation. Rotation BROKE the hash chain... As a result AUDIT.jsonl now grows **UNBOUNDED**. That is an accepted short-term tradeoff... chain-aware compaction... is a DEFERRED future feature, intentionally NOT in scope here."* | **This item describes a feature that was deliberately removed.** The historical threshold was 5000 lines, not 10000, and rotation is not merely unimplemented — it was implemented, found to corrupt the audit hash-chain, and explicitly retired. `.planning/AUDIT.jsonl` is 6053 lines right now (checked directly) and growing without any rotation. Recommend rewording the item to something checkable, e.g. "AUDIT.jsonl growth is unbounded by design (UC-04b) — no rotation exists to verify" |
| C05 | ZTAI identity verification active | `node tests/ztai-enterprise.test.js && node tests/security-audit.test.js` | Both real, headers confirm ZTAI Enterprise Mode / ZTS+ZTAI audit suite (verified) | |
| C06 | Policy engine evaluates all intents | `node tests/policy-engine-bypass.test.js` | Real file (UC-22 regression), requires `bin/governance/policy-engine.js` (verified) | Only a **bypass regression** for one specific Tier-3 authorization case exists — no test asserts the broader "evaluates all intents" claim. Recommend narrowing the item's wording to match what's actually tested |
| C07 | Blast radius scoring functional | `node tests/change-classifier.test.js && node tests/policy-engine-bypass.test.js` | `bin/governance/impact-analyzer.js` implements "CADIA... Calculates the 'Blast Radius' score" (verified, header read); the two test files are the closest real coverage feeding into it | |
| C08 | ADR requirement enforced for architecture changes | **No real command exists.** | Searched `bin/governance/`, `bin/security/`, `.mindforge/config.json`, `.mindforge/governance/` for any "ADR" reference — **zero hits** (verified via grep) | This is not a technical gate anywhere in the codebase today. The nearest real thing is a **process convention**, not an automated check: `.agent/CLAUDE.md`'s "never skip planning for changes touching >3 files." Recommend rewording the item to reflect that this is a manual/process review step, not something with a pass/fail command |
| C09 | hash-chained audit trail integrity (SHA-256 back-links) | `node bin/verify-audit.js` (documented in root `CLAUDE.md`: "fail-closed, exit 1 on break") + `node tests/audit-integrity.test.js` | Both real (verified) | |
| C10 | Plugin permission model enforced | `node tests/production.test.js` | `tests/production.test.js:387-391` "plugin schema defines permission model" (checks for `permissions`/`write_state`/`network_access` keys); `:399-403` **"plugin loader documents advisory permission model"** (verified, exact test name) | **The item's own word "enforced" appears to overclaim.** The second test's name says the permission model is documented as *advisory*, not technically enforced — i.e., a plugin schema can declare permissions, but nothing in the code stops a plugin from exceeding them. Recommend rewording to "Plugin permission model is schema-defined and documented as advisory" unless/until real enforcement code exists |

### Section D — Documentation

| # | Item (as currently worded) | Proposed verification step | Citation | Note |
|---|---|---|---|---|
| D01 | docs/reference/commands.md exists | `test -f docs/reference/commands.md && wc -l docs/reference/commands.md` | Verified directly: 76 lines, real content ("MindForge ships 221 slash commands in total") | |
| D02 | docs/security/SECURITY.md has disclosure policy | `grep -n -i "disclosure\|report.*vulnerabilit" docs/security/SECURITY.md` | File confirmed to exist at `docs/security/SECURITY.md` (directory listing, verified) | |
| D03 | docs/security/threat-model.md covers 7 threat actors | `grep -c "^## Threat Actor" docs/security/threat-model.md` → expect `7` | Verified directly: exactly 7 headings, "Threat Actor 1" through "Threat Actor 7" at lines 25/40/54/72/85/101/116 | This item is **accurate as worded** — a rare full match |
| D04 | docs/architecture/decision-records-index.md lists 20 ADRs | `node tests/production.test.js` (contains `'ADR index lists all 20 ADRs'` at line 464 and `'all 20 ADR files present...'` at line 659, the latter asserting `>= 20`) | Verified directly by reading the index file in full | **The index itself now lists more than 20.** Its own intro line says *"All 24 real, substantive ADRs"*, and a direct count of its table rows gives 27 (ADR-001–020 = 20, plus 039–041 = 3, plus 024–026 = 3, plus 042 = 1). The index's own stated total (24) doesn't even match its own row count (27) — a second, independent drift inside that file. The test's `>= 20` phrasing tolerates growth, but the checklist item's "lists 20 ADRs" wording is now an undercount. Recommend rewording to "ADR index row count matches `tests/production.test.js`'s `>= 20` floor" and separately flagging the index file's own 24-vs-27 mismatch as a documentation bug outside this handoff's scope |
| D05 | docs/contributing/CONTRIBUTING.md exists | `test -f docs/contributing/CONTRIBUTING.md` | Verified directly — exists, but is a **deliberate pointer stub** to root `CONTRIBUTING.md` ("This file used to duplicate the repo's contributing guide and had drifted out of sync with it... Read that file, not this one"), not a duplicate | Passes as worded; note it's intentionally thin, not stale |
| D06 | README.md has quickstart section | `grep -n "^## Quick start" README.md` | Verified directly: "## Quick start (new project)" (line 220) and "## Quick start (existing codebase)" (line 230) | |
| D07 | API documentation generated | `test -f docs/References/sdk-api.md && test -f docs/References/skills-api.md` | Files confirmed to exist (verified) | **"Generated" is not accurate.** Searched `package.json`, `sdk/package.json`, `mcp-server/package.json` for `typedoc`/`jsdoc` — zero hits. These are hand-maintained reference docs, not build output. Recommend rewording to "API reference docs exist and are current" |
| D08 | Migration guide for major version | `grep -n "^## Updates and migrations" README.md && test -f docs/architecture/adr-040-additive-schema-migration.md` | Verified: README.md line 382 has this exact heading; the ADR file exists | No standalone `MIGRATION.md` exists — the closest real artifacts are the README section and the ADR, plus the real `/mindforge:migrate` command. If a dedicated guide is expected, that's a real gap, not just a checklist-wording issue |
| D09 | Troubleshooting guide exists | `test -f docs/troubleshooting.md` | Confirmed shipped: listed in `package.json`'s `files` array (line 46), and present on disk (verified) | |
| D10 | Architecture diagrams current | No automated check exists. Manual proxy: `git log -1 --format=%ci -- docs/architecture/mindforge-architecture.excalidraw.clipboard.json` compared against `git log -1 --format=%ci -- bin/engine/` (or whichever subsystem changed most recently) | `docs/architecture/mindforge-architecture.excalidraw.clipboard.json` confirmed to exist, last modified 22 Aug per filesystem metadata (verified via `ls -la`) | **Flag:** "current" has no automated definition here; this is a judgment call at release time, not a pass/fail command |

### Section E — Test Coverage

| # | Item (as currently worded) | Proposed verification step | Citation | Note |
|---|---|---|---|---|
| E01 | Unit tests pass (node tests/run-all.js) | `npm test` (runs `validate-assets.js` then `tests/run-all.js`) or `node tests/run-all.js` directly | Root `CLAUDE.md`/`CONTRIBUTING.md`, exact command (verified, matches `package.json:64`) | Already worded correctly — no change needed |
| E02 | Coverage >= 80% | `npx c8 --check-coverage --lines 30 --exclude 'plugins/**' --exclude 'mcp-server/dist/**' node tests/run-all.js` (the real CI command) | `.github/workflows/mindforge-ci.yml:208` (verified, exact line); also stated in root `CLAUDE.md`: "CI gates lines at 30%" | **"80%" does not match the enforced gate.** The real CI coverage gate is **30% lines**, not 80% — confirmed both in the workflow file and in this repo's own `CLAUDE.md`. Running the real command will report a number against a 30% floor, not 80%. Recommend rewording the item to the real 30% floor, or explicitly marking 80% as an *aspirational* target distinct from the *enforced* gate — do not leave the item implying an 80% gate exists when it doesn't |
| E03 | No skipped tests without documented reason | `grep -rn "^// @skip:\s*$" tests/*.test.js` should return nothing (a bare marker with no reason after the colon) | Convention documented in root `CLAUDE.md`/`CONTRIBUTING.md` ("first line `// @skip: reason`"). Ran directly: **empty** — currently passes. Exactly 3 skip markers exist today, all with reasons: `tests/browser.test.js:1`, `tests/browser-daemon-auth-live.test.js:1`, `tests/sre-integration.test.js:1` (verified) | |
| E04 | Security tests pass | `node tests/run-all.js --filter=security` | Root `CONTRIBUTING.md`'s documented `--filter=` usage. Ran directly: discovers and passes `security-audit.test.js` + `v7-sovereign-security.test.js` (2/2 passed) | |
| E05 | Integration tests pass | `node tests/run-all.js --filter=integration` | Same documented `--filter=` mechanism. Ran directly: discovers `integrations.test.js`, `v7-pillar-integration.test.js`, `v9-integration-chain.test.js` (3 passed) plus `sre-integration.test.js` (correctly auto-skipped per its own documented `@skip` reason) | |
| E06 | Performance benchmarks pass | **No real command exists.** | Searched `package.json`, `bin/`, and all `tests/*.test.js` for "benchmark" — hits only in `bin/harness-audit.js` (compliance scoring) and `bin/revops/market-evaluator.js` (revenue benchmarking), neither of which is a runtime/perf benchmark | No performance-benchmark test suite exists in this repo today. Recommend rewording the item or explicitly marking it unimplemented rather than implying a runnable check exists |
| E07 | Regression tests for all fixed bugs | `node tests/regression-writer.test.js` (best available, with caveat) | Header (verified, UC-22): "Guards against green-washing: the generated regression test MUST assert against the actual bug payload... not merely that `<body>` is visible" | This test guards the **regression-test *generator*** itself, not a blanket claim that every fixed bug has a regression test. Treat as the closest real artifact, not a literal match to the item's wording |
| E08 | CI pipeline green | `gh run list --workflow=mindforge-ci.yml --limit 1` (the `gh` CLI is available in this environment) | README.md line 4 carries a live CI badge pointing at exactly this workflow (verified); workflow file confirmed to exist at `.github/workflows/mindforge-ci.yml` | |
| E09 | Test isolation verified (no state leaks) | No single dedicated test exists. Proxy: `git status --short` before and after `npm test`, confirm no diff in tracked files | Multiple individual test files use `os.tmpdir()`-based fixtures (e.g. `tests/install.test.js`, `tests/cost-limit.test.js`, `tests/audit-integrity.test.js` — grepped and confirmed the pattern), but no suite-level "isolation" assertion exists | Treat the proxy command as a stand-in, not an equivalent |
| E10 | Edge case tests for boundary conditions | No single command exists; this is a property of individual test files, not the suite as a whole | — | Recommend this remain a manual spot-check at release-review time rather than a checklist line implying automation |

---

## 4. Items with no real, runnable verification command today (do not paper over)

These five are the most important output of this investigation, because giving any of them a
fabricated command would be exactly the kind of overclaim this project holds itself to a
"measured, not asserted" bar against:

1. **C04 — Audit log rotation at 10000 lines.** The feature was implemented, found to corrupt
   the audit hash-chain, and explicitly retired (`bin/autonomous/audit-writer.js:8-15`).
   `AUDIT.jsonl` now grows unbounded by design. There is nothing to run.
2. **C08 — ADR requirement enforced for architecture changes.** Zero references to "ADR" exist
   anywhere in `bin/governance/`, `bin/security/`, `.mindforge/config.json`, or
   `.mindforge/governance/`. This is a process convention in `.agent/CLAUDE.md`, not a technical
   gate.
3. **E02 — Coverage >= 80%.** The real, enforced CI gate is 30% lines
   (`.github/workflows/mindforge-ci.yml:208`), not 80%. A command exists, but it checks a
   different number than the item claims.
4. **E06 — Performance benchmarks pass.** No performance-benchmark suite exists in this repo.
5. **D07 — API documentation generated.** No `typedoc`/`jsdoc` (or any generator) is wired into
   `package.json`, `sdk/package.json`, or `mcp-server/package.json`. The relevant docs exist but
   are hand-maintained, not generated.

Two more are partial gaps, not full holes, and are noted inline in Section 3 rather than repeated
here: **A10** (upgrade-preserves-config — real code, no dedicated test) and **E09/E10**
(isolation/edge-cases — real patterns exist per-file, no suite-level check).

---

## 5. Recommended companion fix (optional, separate from the regeneration itself)

`tests/doc-count-claims.test.js` already exists specifically to prevent hand-maintained prose
counts from drifting from reality (its own header names four other drifts it caught: AGENTS.md's
version string, test-file count, hook count, and workflow count). **B01/B02's "36 commands"
figure is a fifth instance of exactly the pattern that file exists to catch** — it should either
be pinned there, or reworded to reference the dynamic count (`tests/doc-count-claims.test.js`
already independently confirms 221 elsewhere in its own assertions, at lines 212 and 377). This is
a one-line addition to an existing, already-passing test file, not new infrastructure — flagged
here as a natural follow-up, not something this plan asks its implementer to also do.

---

## 6. Handoff checklist for whoever implements this

- [ ] Replace `.planning/RELEASE-CHECKLIST.md`'s title/metadata: v1.0.0 → v2.0.0.
- [ ] Replace its 55-row/F05-cutoff table with the 65-row structure in Section 2, using the
      merged `Item | Check | Verification step | Result | Verified by | Date | Notes` schema.
- [ ] Populate `Check`/`Verification step` for F01–G05 by copying verbatim from
      `production-checklist.md` lines 34–53 (already real).
- [ ] Populate `Check`/`Verification step` for A01–E10 using Section 3 of this plan.
- [ ] For the five items in Section 4 (C04, C08, E02, E06, D07), do **not** invent a pass/fail
      command — either reword the item to match reality, or explicitly mark it "no automated
      check exists" per the guidance in Section 2, point 5.
- [ ] Separately (optional, not blocking): consider the Section 5 follow-up for
      `tests/doc-count-claims.test.js`.
- [ ] Do not backfill `production-checklist.md`'s A–E section *bodies* (lines 15-28) as part of
      this task unless asked — this plan's scope was the regenerated `RELEASE-CHECKLIST.md`
      log file, not a rewrite of the source checklist, though the two files would benefit from
      the same underlying per-item verification steps if that rewrite is later commissioned.
