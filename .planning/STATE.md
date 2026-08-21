# MindForge — Project State

## Status
🟢 Active — `develop` at `1b5302b5`, GREEN (local suite + CI). npm `latest` = 11.9.2. `package.json` = 11.9.2.
Next release candidate: **11.9.3** (release path clear except two hand-authored changelog files).

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.

The repo's own `.planning/` is **not** published — verified `npm pack --dry-run` reports 0
`.planning/` entries. Consumers receive `examples/starter-project/.planning/` instead. So dev state
here is safe, and that separation must not be collapsed.

## Current version
v11.9.2 published (npm `latest` = 11.9.2). `develop` carries 12 merged PRs of fixes on top of it and
is the 11.9.3 candidate. `stable` is currently **11.8.3** (four behind `latest`), which is
why the release workflow now moves it automatically — forward only, verified on npm's uncached
dist-tags endpoint. The next release self-heals it; no hand step remains.

## Current phase
Post-merge, pre-release. Twelve PRs (#200–#211) landed this session, closing an audit backlog whose
findings all shared one defect class: **an instrument that reports success while doing nothing.**
Gates that could not fail, tests asserting on source text (a comment satisfied them), docs describing
capabilities with no code reader, commands printing success while performing no action.

## Verification state (measured, not assumed)
On `develop` @ `983c0a06`, in a clean detached worktree with `HOME` outside the tree and `TMPDIR` at
the system default:

- `node tests/run-all.js` → **131 passed / 0 failed / 2 skipped / 133 total**
- `harness:audit`, `harness:gate`, `harness:gate:install`, `harness:compliance -- --check`,
  `release:ready`, `version:check`, `validate:assets` → all exit **0**
- `node scripts/sync-version.js --check` → exit **0**
- `eslint .` → **0 errors**, 190 warnings (warnings are tolerated by the project's own contract)
- The 2 skips are env-dependent and expected: `browser.test.js` (Chromium + display),
  `sre-integration.test.js` (worktree support + clean tree)
- Remote CI agrees: 15/16 checks SUCCESS, including MindForge Health Check on **18.x, 20.x and 22.x**.
  The one failure is `security/snyk`, a third-party app in ERROR (integration could not run), and it
  is **not** one of the 6 required checks.

**Two environment traps that produce false failures — do not misread them as defects:**
1. Setting `HOME` to the worktree under test makes children write into that tree (`.npm/`, `mf-cfg-*/`)
   and trips every clean-tree assertion. 8 phantom failures came from this.
2. Pointing `TMPDIR` *inside* `$HOME` breaks 6 install/harness tests. A `/tmp`-based `TMPDIR` and an
   empty `HOME` both pass. The variable is TMPDIR-inside-HOME, **not** HOME.

## Last completed task
Merged all 12 queued PRs into `develop`, sequentially, verifying each **two independent ways** because
a MERGED badge is not evidence — #198 was once marked MERGED while its content never reached develop:
- `git merge-base --is-ancestor <pr-head> origin/develop` (returns FALSE for #198, TRUE for #199)
- a per-PR content anchor grepped against `origin/develop`

All 12 passed both. PR queue is now empty.

## Next action
One PR against `develop` fixing the 8 remaining audit findings — documented CLI invocations that do
not run — **plus the gate that would have caught all of them**: extend
`tests/doc-count-claims.test.js` to scan shipped `.md`/`.js` for `mindforge <verb>`,
`bin/mindforge-cli.js <verb>` and `npx mindforge-cc <bare-word>`, asserting each resolves to a real
`COMMANDS` key or flag. This was deliberately held back until the queue merged, because it spans
files that were owned by #201, #202, #205 and #209.

The findings: the CLI does **not** route `dashboard` (root `CLAUDE.md` documents it; it exits 1);
`CLAUDE.md` names a nonexistent `bin/hooks/mindforge-context-monitor.js` (should be `.agent/hooks/…`);
`workflow` is the most-documented verb (126 references) and works, but is missing from `--help` and
the available-commands list; `docs/troubleshooting.md` tells users to run
`npx mindforge-cc@latest install`, which #202 correctly made exit 1; a shipped engine doc uses
`npx mindforge auto` (should be `headless`); `AGENTS.md:45` says "bump all five each release",
contradicting "never bump by hand"; and `bin/install.js:82` cites a line number three PRs invalidated.

## Release runbook for 11.9.3
1. Bump `package.json`, then `node scripts/sync-version.js` — writes 15 files, **defers** the Homebrew
   formula (correct: its digest is the hash of a tarball that does not exist yet).
2. `npm --prefix mcp-server install && npm --prefix mcp-server run build && node scripts/build-mindforge-plugin.js`
   — all three, in order. `sync-version` now prints this chain under `🔨 REQUIRE A BUILD` and exits
   non-zero until it is done. It is required because `build-mindforge-plugin.js` refuses without
   `mcp-server/dist/index.js`, which is gitignored and absent on a fresh clone.
3. Author `CHANGELOG.md`'s 11.9.3 section and `changelogs/v11.9.3.md`. **These are the only two
   artifacts a human must write.** Skipping them drops `release:ready` 14/14 → 12/14 and fails
   `npm test`.
4. Merge `develop` → `release` → `main`. **Never PR straight to main.**
5. After publish: `node scripts/sync-version.js --fetch-sha` for the formula, then commit it.
6. Nothing by hand. The release workflow points `stable` at the published version as its last
   step — after the GitHub Release, skipping prereleases, and refusing to move backward.

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

## Active blockers
- **11.9.3 needs two hand-authored files:** `CHANGELOG.md`'s 11.9.3 section and
  `changelogs/v11.9.3.md`. Gated by `bin/utils/readiness-gate.js:115` (a bare `.includes(pkgVersion)`)
  and `tests/production.test.js:629`/`:638` (the second is existence-only, so an empty file satisfies it).
- ~~Publishing is ungated.~~ **CLOSED (#216).** A `preflight` job now gates the publishing event: it
  asserts the tagged commit is an ancestor of `origin/main` and runs the six gates a tag push never saw,
  with the publish job behind `needs: preflight`. The release workflow also moves the `stable` dist-tag
  itself, forward-only and verified on npm's uncached dist-tags endpoint.
  Residual, documented in the workflow: a tag push resolves the workflow from the TAGGED ref, so a tag
  placed on a commit predating #216 runs that commit's workflow and is ungated. Restricting who may
  create a `v*` ref is a repo-settings change (a tag ruleset) and is the only remaining mitigation —
  required status checks cannot attach to a tag.

## Context for next session
Read `scratch-pad/daily-logs/2026-08-21.md` first — it records not just what changed but every
self-inflicted measurement error and the control experiment that caught it. The recurring lesson,
earned about sixteen times: **verify the instrument before the subject, and change one variable at a
time.** Every correct diagnosis this session came from a control that isolated a single variable;
every wrong one came from changing two and blaming one.

Two mechanical traps worth knowing before touching CI or the queue again:
- **Retargeting a PR's base does not trigger its workflows.** `control-plane.yml` and
  `mindforge-ci.yml` declare `on: pull_request: branches: [main, develop]` with no `types:`, so they
  default to `[opened, synchronize, reopened]`; a base change is `edited`. Use
  `gh pr close && gh pr reopen` — it fires `reopened`, touches neither branch nor diff, and took
  #207's check count from 6 to 17. The tell was that **5 of 6** required checks were missing, not all
  6: `gitleaks` has no branch filter, so it alone had run.
- `gh pr view --json mergeable` returns `UNKNOWN` while GitHub computes it. Poll for a definite
  `MERGEABLE`/`CONFLICTING` instead of treating one snapshot as a conflict.

## Last updated
2026-08-21T06:20:00Z
