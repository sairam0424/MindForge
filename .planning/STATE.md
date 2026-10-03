# MindForge — Project State

## Status
🟢 Active — `main` at `d5ff25b9` (PR #326 merged). npm `latest` = 12.0.0, `stable` = 12.0.0 (both
current, no drift). CI green on every PR merged this cycle. Nothing of mine is open except this
refresh; the open PR list is otherwise Dependabot and Snyk (see "Next action").

## IMPORTANT
HANDOFF.json is committed to git. Never write secrets or credentials into it.
Write "see .env" or "stored in secrets manager" if a note needs to reference credentials.

The repo's own `.planning/` is **not** published — verified `npm pack --dry-run` reports 0
`.planning/` entries. Consumers receive `examples/starter-project/.planning/` instead. So dev state
here is safe, and that separation must not be collapsed.

## Current version
v12.0.0 published and matches `package.json`. No release is in flight right now.

**Known drift, tracked separately, not fixed:** the `release/v12.0.1` worktree
(`.claude/worktrees/release-v12.0.1`) is 56 commits behind `main` and 2 ahead (it was 19 behind on
2026-09-27). The `develop` branch is 89 commits behind `main` and 10 ahead (it was 52 behind). Whether
to re-sync, abandon or cut a fresh release is an open decision, not resolved here.

## Current phase
Two pieces of work finished in a row; nothing is mid-flight.

**1. The `/verify` punch list (#304–#317) is closed.** Every finding was fixed, reviewed and merged.
`gh pr list --state merged --limit 30` and the PR bodies hold each fix's full arc, including what the
reviews caught; this file no longer re-narrates them.

**2. Making the Claude Code plugin submittable to Anthropic's plugin directory (2026-10-03, UTC).**
- **The submission itself:** the 2026-09-24 Console submission is **Rejected** — its path field was `.`
  instead of `plugins/mindforge`. The Console form has since been retired ("Plugin submissions have moved
  to claude.ai"). Resubmitting means the claude.ai developer portal (`claude.ai/directory/manage`), which
  requires a **paid claude.ai plan** (Pro, Max, Team or Enterprise; free accounts cannot submit). The
  owner said they cannot take Pro. Alternatives checked: the "Claude for Open Source" program (MindForge
  is below every stated threshold, so only its "apply anyway" clause fits), a collaborator with a paid
  plan and push access, or skip the directory — the repo's own marketplace already works
  (`/plugin marketplace add sairam0424/MindForge`).
- **#321** added a generated `plugins/mindforge/README.md` (the directory blocks a plugin without one
  and shows it as the listing). It comes from `scripts/plugin-readme.template.md` through
  `scripts/build-mindforge-plugin.js`, with 6 tests. A multi-agent review found the first draft
  overclaimed; it was rewritten and the claims it makes are enforced by tests (including a scan that
  fails if a shipped hook script gains an undisclosed network call or subprocess).
- **#322** cleared the required `Security Scan` check (new advisories in `mcp-server`'s dependencies:
  `fast-uri` high, `hono` and `ip-address` moderate) and rebuilt the bundled MCP server.
- **#325** stopped tracking 73 colon-named files under `.agent/workflows/` (Antigravity install output
  committed in March and orphaned) that Windows cannot check out and that the directory's file-name
  check could stop on. `tests/tracked-paths-portable.test.js` now checks every tracked path.
- **#326** fixed the hook dispatcher failing closed on every call when the plugin root is reached
  through a symlink, and closed a related hole (an in-root symlink to an outside file executing with
  the gate's authority). A review found a race in the first version; the script is now resolved strictly.
  **Behavior change:** a hook script that is itself a symlink leaving the install root now fails closed.

## Verification state (measured, not assumed)
- `tests/` has **145 files** on `main`. Clean full runs by the pre-commit hook: **142 passed / 0 failed
  / 3 skipped / 145 total** on #325's commit; 141/0/3/144 on #326's final commit (that branch predated
  #325). The combined `main` was run once at machine load ~20: 140 passed, 2 failed, 3 skipped —
  `harness-audit` and `install-module-load` hit the runner's 60 s per-test limit; both pass alone
  (25/25 and 16/16). There is no clean full run of the exact combined tree yet; expect 142 passed.
- `npm run lint` → 0 errors (380 warnings tolerated). `node scripts/ci/validate-assets.js` → exit 0.
- The 3 skips are env-dependent and expected: `browser.test.js` and `browser-daemon-auth-live.test.js`
  (Chromium + display), `sre-integration.test.js` (worktree support + clean tree).
- **The suite is load-sensitive.** The runner caps each test at 60 s unless its first line says
  `// @timeout: <ms>`, and the Husky pre-commit hook runs the whole suite. At machine load above about
  10 (other Claude sessions, trelix jobs) installer and harness tests time out and a commit is
  rejected although nothing is wrong. Check `uptime` and wait for load below about 5 rather than
  bypass the hook. `installer-symlink-safety` now has a 120 s limit.
- `main` is protected by rulesets requiring six checks (Code Quality Gates, Health Check 20.x, Security
  Scan, Change Classification, Governance Enforcement, gitleaks). An admin break-glass bypass exists;
  it has not been used. `Security Scan` runs `npm audit --omit=dev --audit-level=high` in the root,
  `sdk/` and `mcp-server/`, so a newly published advisory turns every open PR red with no code change.

## Last completed task
Merged #325 and #326 (after #321 and #322 earlier the same day). Both were verified head-to-merge
(the merge commit's second parent equals the tested head), their branches deleted locally and on
origin, and the two were checked against each other with `git merge-tree` before merging.

## Next action
Open, in rough priority. None is started.

1. **Plugin resubmission** — blocked on a paid claude.ai plan (above), not on code. When unblocked:
   open `claude.ai/directory/manage`, Submit new → Plugin bundle, paste
   `https://github.com/sairam0424/MindForge/tree/main/plugins/mindforge`, click **Validate**, fix any
   Blocking finding, then submit. Expect reviewer *holds* (not rejections): 542 files (limit 512), the
   bundled `mcp/dist/index.js` at about 773 KiB (limit 256 KiB), and hook scripts that chain into others.
2. **Follow-ups found by the #321 and #326 reviews, not fixed:**
   - `mindforge-config-protection` matches protected names by basename without resolving symlinks, so a
     symlink alias to `tsconfig.json` or an ESLint config is not protected.
   - A project whose `.claude` directory is a symlink to a differently named directory derives the wrong
     hook root and fails closed (unchanged from before #326).
   - `hooks.json` timeouts are written in milliseconds; Claude Code reads seconds.
   - In a plugin-only install `mindforge-context-monitor` and the update check are inert (they depend on
     a statusline the plugin does not register), and `instinct-capture` may not fire on real payloads.
   - About 16 skills are written for another product's runtime (Hermes), and five GitHub skills scrape
     `~/.git-credentials` and `.env`; both can draw a human-reviewer hold.
   - `.agent/bin/lib/security.cjs` `validatePath` mixes canonical and lexical paths (latent, no caller
     is exploitable).
3. **`bin/autonomous/AutoRunner`** is still never constructed outside tests (its only `new AutoRunner(`
   mention in `headless.js` is a comment saying so); `/mindforge:auto` is an LLM-interpreted markdown
   spec. Architectural work, and the wording of any public claim about it is an open decision.
4. **Housekeeping:** 19 open Dependabot PRs and a Snyk PR (#99), none reviewed in this cycle;
   204 remote branches other than `main` and `develop`; the orphaned `.agent/workflows/` folder (57
   dash-named files that nothing reads).

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
- `plugins/mindforge/` is **generated** by `scripts/build-mindforge-plugin.js` and a CI step fails on any
  drift. Its README comes from `scripts/plugin-readme.template.md`: edit the template, never the
  generated file. The version is deliberately left out of the README so a bump needs no extra rebuild.
- Tracked paths must be valid on Windows and macOS (no colon, trailing dot or space, device names, or
  case-only collisions), enforced by `tests/tracked-paths-portable.test.js`; `.gitignore` excludes
  `.agent/workflows/*:*` so an Antigravity install into this checkout cannot be committed.
- Multi-agent PR review: parallel dimension reviewers plus two skeptics per finding (one tries to
  reproduce it, one tries to refute it), before asking the owner for a merge go-ahead. Expect every
  change to get at least one review-driven follow-up, and expect reviewers to catch overclaims in the
  author's own text — the #321 README and the #326 first fix both did. Redesign or revert when a review
  finds a fundamental flaw rather than patching around it. "Disputed" usually means "true but
  pre-existing", so read the skeptics' reasons before discarding one.
- A new or strengthened test is not trusted until it has been shown to fail against the defect it
  claims to catch (scratch copy, or revert the fix). Two of this cycle's first-draft tests passed on the
  unfixed code and would have proved nothing.
- Merging: the owner approves each merge explicitly. Refresh a PR that is behind `main` with
  `gh pr update-branch <n>`, wait for the required checks on the new head, confirm the head SHA, merge
  with `gh pr merge <n> --merge`, then verify the merge commit's second parent is that head.
- STATE.md/HANDOFF.json staleness: refresh them when a cycle closes, not only when they are old. The
  60-day test threshold catches severe rot; it does not catch a file that is hours behind.

## Active blockers
None release-blocking right now — no release is in flight. The plugin resubmission is blocked on a
paid claude.ai plan, which is an account decision, not a code blocker.

## Context for next session
If this looks out of date, check `git log -5 --oneline` and `package.json`'s version against what is
written here before trusting any of it; `tests/version-consistency.test.js` has 3 regression tests for
this class of drift, but they only fire past a 60-day threshold.

The reasoning behind each fix lives in the PR bodies: `gh pr list --state merged --limit 30`. For the
plugin-directory work, #321's body has the full review (42 findings) and #326's the symlink-dispatcher
review (15 findings), including the ones deliberately left open above.

## Last updated
2026-10-03T19:36:51Z
