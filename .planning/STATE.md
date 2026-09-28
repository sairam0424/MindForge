# MindForge — Project State

## Status
🟢 Active — `main` at `ce0a58d1` (PR #317 merged), GREEN (local suite + CI). npm `latest` = 12.0.0,
`stable` = 12.0.0 (both current, no drift).

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.

The repo's own `.planning/` is **not** published — verified `npm pack --dry-run` reports 0
`.planning/` entries. Consumers receive `examples/starter-project/.planning/` instead. So dev state
here is safe, and that separation must not be collapsed.

## Current version
v12.0.0 published and matches `package.json`. No release is in flight right now.

**Known drift, tracked separately, not fixed by this update:** the `release/v12.0.1` worktree
(`.claude/worktrees/release-v12.0.1`) has drifted further to 44 commits behind `main` (up from 19
at the last check) and still only 2 ahead. Whether to re-sync it or abandon it in favor of a fresh
release cut remains an open decision.

## Current phase
The full `/verify` punch list (run against v12.0.0) is **complete** — all findings fixed, each via
commit → PR → multi-agent review → CI → explicit user go-ahead → merge. Shipped this cycle, in
order: #304 (CLAUDE.md backup heuristic dropped user content), #305 (command-count display
ambiguity), #306 (registry.json unbounded growth — redesigned after review caught a false-positive
existence-check class), #307 (stale secret residue in temporal snapshots — a broader redaction
attempt was reverted after review found it risked corrupting legitimate data; kept to the narrow,
correct fix), #308 (`headless.js` silently reported success for autonomous work that never ran — now
fails loudly per this repo's own DEL-02 decision), #309 (22 fabricated `agency-*` skill references
replaced with real skills), **#310** (this file and HANDOFF.json regenerated after going 37
days/~85 PRs stale, plus 3 new staleness-regression tests), **#311** (`migrate.js` had no CLI
entrypoint at all — `node bin/migrations/migrate.js` defined functions and exited 0 doing nothing;
also fixed `v9-unified-memory.js`'s global-knowledge-base path, which could never match the real
`os.homedir()`-based path and so silently skipped every global entry, forever), **#312** (recovered
follow-up fixes from #310 that were committed locally but never pushed before that PR's merge — a
doc-accuracy correction, a test lower-bound hardening, and a real code fix making
`state-manager.js`'s `writeHandoff()` set both `last_updated` and `updated_at`), **#313**
(`bin/models/model-broker.js` carried its own second, independent hardcoded pricing table in
violation of this repo's single-pricing-source rule — removed, now delegates to `pricing-registry.js`),
**#314** (`SECURITY.md`'s header said "Current version: 12.0.0" while its own Supported Versions
table two lines below still marked 11.x as Current — corrected, added a regression test), **#315**
(`bin/migrations/0.1.0-to-0.5.0.js` had a second `module.exports` block silently shadowing the real
one via CommonJS semantics, so a 0.1.0 install upgrading through `migrate.js` got a duplicate
migration and never the real one), **#316** (Bedrock model pricing under-billing: `complete()`
priced calls by the *resolved* Bedrock id instead of the original short id, and `BEDROCK_MODEL_MAP`
collapses distinct models like `claude-opus-4-7`/`claude-opus-4-8` to the same Bedrock id — fixed at
the call site, since downstream normalization can't recover information already lost by that
many-to-one collapse), **#317** (`allMigrations()` omitted two real migration files entirely,
`1.0.0-to-2.0.0.js` and `10.7.0-to-11.0.0.js`, so any upgrade crossing those versions silently
no-op'd; wired both in, one via an inline adapter since it exports a different shape — this PR hit a
real merge conflict against #315's overlapping test additions, resolved by keeping both sides'
tests since they cover different, non-overlapping migrations).

**Remaining from the original `/verify` sweep: none.** Every finding (#304–#317) is fixed, reviewed,
and merged. This is the first time since the sweep started that this section can say that.

Two things flagged along the way remain **open decisions, not code fixes** — see "Decisions needed"
below: the `release/v12.0.1` worktree drift, and whether the `develop → release → main` branch flow
is still intended policy now that every PR this cycle merged directly to `main`.

## Verification state (measured, not assumed)
On `main` @ `ce0a58d1`:

- `node tests/run-all.js` → **141 passed / 0 failed / 3 skipped / 144 total**
- `npm run lint` → **0 errors**, 380 warnings (tolerated by the project's own contract)
- `node scripts/ci/validate-assets.js` → exit **0**
- The 3 skips are env-dependent and expected: `browser.test.js` and
  `browser-daemon-auth-live.test.js` (Chromium + display), `sre-integration.test.js` (worktree
  support + clean tree)
- Remote CI agrees: every PR in the #304–#317 run landed with all real checks green (Trelix, a
  third-party review app, posts inconsistently — sometimes late, occasionally not at all for a given
  commit; absence is not treated as failure, but its claims are independently verified before acting
  on them, since it has produced confirmed false `[failure]`-level claims multiple times this cycle).

**One observation worth a deliberate decision, still not acted on:** every PR across the whole
punch list (#304–#317) merged directly to `main`. The `develop` branch still exists but has drifted
further, to 77 commits behind `main` / 10 ahead (up from 52 behind at the last check). Whether the
three-branch `develop → release → main` flow described in this file's older revisions is still the
intended policy, or whether direct-to-`main` is now the real practice, is still not confirmed either
way.

## Last completed task
Merged PR #317 (`allMigrations()` wiring gap). This one hit a real merge conflict against #315's
overlapping test additions in `tests/migration.test.js` — resolved by keeping both PRs' tests (they
cover different, non-overlapping migrations), re-verified the full suite green, then merged. Standard
cleanup done for #315/#316/#317: all three branches deleted locally and remotely, `main`
fast-forwarded.

## Next action
No `/verify` punch-list items remain. Two real candidates for the next piece of work, both flagged
in earlier full-index sweeps and neither started:
- **`bin/autonomous/AutoRunner`** is never constructed outside tests — `/mindforge:auto` is
  currently just an LLM-interpreted markdown spec, not real automation. Architectural work, not a
  punch-list-style bug fix.
- Resolve the two open decisions above (the `release/v12.0.1` worktree and the `develop` branch
  policy question) — human calls, not something to resolve unilaterally.

## Decisions made
- Version bumps: `package.json` is canonical; **16 channels over 15 files** are derived. Never bump by
  hand. Two deliberate exclusions, both asserted rather than merely omitted: `[REQUIRED_CORE_VERSION]`
  is a minimum floor (may lag, must never lead), and the 10 subagent-category entries in
  `marketplace.json` version on their own `1.x` line and must never be swept.
- Shipped-doc versions: **structural markers track canonical** (titles, "Current version:", documented
  `--version` output). **Narrative measurements do not** — rewriting "measured in v11.9.0" would assert
  a measurement nobody took. A stale true statement beats a fresh false one.
- Homebrew formula: may **lag** canonical, must never **lead** it.
- `.planning/` templates ship from `examples/starter-project/.planning`, never the repo's own live
  `.planning/`. Guarded by `tests/packaging-allowlist.test.js`.
- npm `files[]` overrides `.npmignore`: runtime state must be NEGATED inside `files[]`.
- Multi-agent PR review (this cycle's pattern): parallel dimension review (correctness/security/
  consistency, or a two-axis Standards/Spec `/code-review` pass) + adversarial verify pass per
  finding, before asking the user for a merge go-ahead. Every finding this cycle got at least one
  review-driven follow-up commit — none shipped clean on the first attempt. When a review finds a
  fundamental flaw (not just a nit), redesign properly or revert to the narrower correct scope rather
  than patching around it under time pressure. That full-redesign-or-revert bar was hit twice
  (#306's existence-check redesign, #307's reverted redaction attempt); every other finding's
  follow-up was an ordinary fix, not a redesign.
- STATE.md/HANDOFF.json staleness: refresh them at the end of a punch-list cycle, not just at the
  start — this file went stale again within 8 PRs/~13 hours of the #310 regeneration, just not past
  the 60-day test threshold. The threshold catches severe rot; it does not substitute for refreshing
  promptly when a cycle actually closes.

## Active blockers
None release-blocking right now — no release is in flight. The `release/v12.0.1` worktree drift
(above) is the closest thing to a blocker, but only for cutting that specific release, not for any
work on `main`.

## Context for next session
This file and `HANDOFF.json` were regenerated once already (PR #310, after 37 days/~85 PRs of
staleness) and are being refreshed again here, 8 PRs later, specifically because the `/verify`
punch list that #310 described as "in progress" is now fully closed. If you are reading this and it
looks similarly out of date again, check `git log -5 --oneline` and `package.json`'s version against
what is written above before trusting any of it — `tests/version-consistency.test.js` has 3
regression tests for exactly this class of drift, but they only fire past a 60-day threshold, so
they will not catch a fresher gap like the one this refresh just closed.

The full `/verify` findings list and the reasoning behind each fix (including the two reverted/
redesigned attempts and the one real merge conflict) live only in this session's conversation
history and the individual PR descriptions for #304–#317 — there is no single persisted findings
doc. `gh pr list --state merged --limit 15` and reading those PR bodies is the fastest way to
reconstruct context.

## Last updated
2026-09-28T17:30:38Z
