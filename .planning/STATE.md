# MindForge — Project State

## Status
🟢 Active — `main` at `1d45230a` (PR #309 merged), GREEN (local suite + CI). npm `latest` = 12.0.0,
`stable` = 12.0.0 (both current, no drift).

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.

The repo's own `.planning/` is **not** published — verified `npm pack --dry-run` reports 0
`.planning/` entries. Consumers receive `examples/starter-project/.planning/` instead. So dev state
here is safe, and that separation must not be collapsed.

## Current version
v12.0.0 published and matches `package.json`. No release is in flight right now.

**Known drift, tracked separately, not fixed by this update:** a `release/v12.0.1` worktree
(`.claude/worktrees/release-v12.0.1`) exists but is now 19 commits behind `main` and only 2 ahead —
it predates PRs #304–#309 entirely. Whether to re-sync it or abandon it in favor of a fresh release
cut is an open decision, not resolved here.

## Current phase
Working a punch list of findings from a full `/verify` sweep (run against v12.0.0), fixing one at a
time with commit → PR → multi-agent review → CI → explicit user go-ahead → merge for each. Shipped
so far: #304 (CLAUDE.md backup heuristic dropped user content), #305 (command-count display
ambiguity), #306 (registry.json unbounded growth — redesigned after review caught a false-positive
existence-check class), #307 (stale secret residue in temporal snapshots — a broader "add
content-level redaction" attempt was reverted after review found it risked corrupting legitimate
data; kept to the narrow, correct fix), #308 (`headless.js` silently reported success for autonomous
work that never ran — now fails loudly per this repo's own DEL-02 decision; a second commit
contained the fix's CI blast radius after review caught it broke the on-every-push pipeline check),
#309 (22 fabricated `agency-*` skill references across the skill registry, replaced with real
skills; a follow-up commit fixed two thematic-fit misses the review caught in the replacements
themselves).

Remaining, not yet started: two unsynced memory tiers (JSONL vs SQLite, migration never ran), dead
code in `bin/models/model-broker.js` violating the single-pricing-source rule, and a `SECURITY.md`
internal version contradiction.

## Verification state (measured, not assumed)
On `main` @ `1d45230a`:

- `node tests/run-all.js` → **140 passed / 0 failed / 3 skipped / 143 total**
- `npm run lint` → **0 errors**, 380 warnings (tolerated by the project's own contract)
- `node scripts/ci/validate-assets.js` → exit **0**
- The 3 skips are env-dependent and expected: `browser.test.js` and
  `browser-daemon-auth-live.test.js` (Chromium + display), `sre-integration.test.js` (worktree
  support + clean tree)
- Remote CI agrees: every PR in the #304–#309 run landed with all real checks green (Trelix, a
  third-party review app, posts inconsistently — sometimes late, occasionally not at all for a given
  commit; absence is not treated as failure, but its claims are independently verified before acting
  on them, since it has produced confirmed false `[failure]`-level claims multiple times this cycle).

**One observation worth a deliberate decision, not acted on here:** every PR this cycle (#304–#309)
merged directly to `main`. The `develop` branch still exists but has drifted to 52 commits behind
`main` / only 10 ahead. Whether the three-branch `develop → release → main` flow described in this
file's older revisions is still the intended policy, or whether direct-to-`main` is now the real
practice, is not confirmed either way — flagging so the next session doesn't assume the old flow is
still followed just because this file used to describe it.

## Last completed task
Merged PR #309 (fabricated skill-registry fix). Standard cleanup done: branch deleted locally and
remotely, `main` fast-forwarded.

## Next action
Continue the `/verify` punch list: two unsynced memory tiers next, per user instruction to proceed
end-to-end through the remaining findings.

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
- Multi-agent PR review (this cycle's pattern): 3-dimension parallel review (correctness/security/
  consistency) + adversarial verify pass per finding, before asking the user for a merge go-ahead.
  When a review finds a fundamental flaw in a fix (not just a nit), redesign properly or revert to
  the narrower correct scope — do not patch around it under time pressure. Happened twice this cycle
  (#306's existence-check redesign, #307's reverted redaction attempt).

## Active blockers
None release-blocking right now — no release is in flight. The `release/v12.0.1` worktree drift
(above) is the closest thing to a blocker, but only for cutting that specific release, not for any
work on `main`.

## Context for next session
This file and `HANDOFF.json` were 37 days stale (last real update 2026-08-21) before this pass —
`main` had moved ~85 PRs and a major version bump (11.9.2 → 12.0.0) past what they described. If you
are reading this and it looks similarly out of date again, check `git log -5 --oneline` and
`package.json`'s version against what is written above before trusting any of it.

The full `/verify` findings list and the reasoning behind each fix (including the two reverted/
redesigned attempts) live only in this session's conversation history and the individual PR
descriptions for #304–#309 — there is no single persisted findings doc. If continuing this punch
list in a fresh session, `gh pr list --state merged --limit 10` and reading those PR bodies is the
fastest way to reconstruct context.

## Last updated
2026-09-27T17:40:20Z
