# MindForge — Project State

## Status
🟢 Active — v11.3.1 (Packaging hotfix) — PUBLISHED to npm (latest = 11.3.1)

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.


## Current version
v11.3.1 — Packaging hotfix on top of v11.3.0 "Legion". Restores the full published
payload (174 commands, 73 skills, 154 subagents, complete `.mindforge/` framework)
that v11.3.0's too-narrow npm `files` allowlist silently dropped. Adds a tarball
regression test. No API changes. Published to npm (latest = 11.3.1); v11.3.0 deprecated.

## Current phase
v11.3.1 published to npm and verified end-to-end (clean install from the live registry
artifact lands the full payload). Docs/version sweep in progress on branch
`chore/docs-sync-v11.3.1`.

## Last completed task
v11.3.1 packaging hotfix: widened the npm `files` allowlist to ship commands, skills,
the entry CLAUDE.md, and the full `.mindforge/` framework (runtime state negated);
fixed the `.planning/` install source (clean examples copy, no dev-state leak) and the
docs/References + docs/Templates case-sensitivity bug; added
`tests/packaging-allowlist.test.js`. Bumped 11.3.0 → 11.3.1 across all 6 version sources.

## Next action
Finish + commit the docs/version sweep (`chore/docs-sync-v11.3.1`). Optional: re-enable
GitHub Actions so future releases publish via signed CI (`--provenance`) instead of
manual `npm publish` (Actions is currently disabled — the v11.3.1 tag push triggered no
CI run).

## Decisions made
- v11.3.1 = patch (packaging fix only, no features/breaking changes per SemVer)
- Published manually via `npm publish` (CI Actions disabled); v11.3.0 `npm deprecate`d → 11.3.1
- `.planning/` templates ship from `examples/starter-project/.planning` (never the repo's
  own live `.planning/`, which holds dev state) to eliminate any leak risk
- npm `files[]` overrides `.npmignore`: runtime state must be NEGATED inside `files[]`

## Active blockers
None. (GitHub Actions disabled is a known limitation, not a blocker — manual publish works.)

## Context for next session
MindForge v11.3.1 is live and complete. The packaging-allowlist regression test now guards
the tarball in the suite. ~45 of 70 audit findings remain DEFERRED-by-design (no security
risk) — full backlog in agent memory (mindforge-remaining-backlog). Next feature work:
v11.3.0 "Legion" follow-ups or the deferred routing/coverage items.

## Last updated
2026-06-04T20:01:24Z
