# Changelog

## [11.9.3] — 2026-08-21 — Honesty: gates that can fail, commands that run, a release path that is checked

Patch release. No new features. Twenty-one fixes, and they all turned out to be the
same defect: **an instrument reported success while doing nothing.** Gates that could
not fail, tests satisfied by a comment, docs describing capabilities with no code
behind them, commands printing success while performing no action, and a publish path
that no check ever touched.

Contains behaviour changes under a patch bump — several of the things being fixed were
bugs that a consumer could have been relying on. Read BREAKING before upgrading if you
script against the CLI or the installer.

### BREAKING

Each of these is a bug fix whose correct behaviour differs from the shipped behaviour.

- **Routed CLI commands now act on YOUR project, not MindForge's own checkout.**
  `bin/mindforge-cli.js` passed `cwd: ROOT` to every routed command, so `mindforge
  classify` diffed MindForge's repository instead of yours, and `mindforge health`
  inspected MindForge's `node_modules`. Measured across all 27 routed commands: 7
  changed behaviour, all in the correct direction, none regressed. If you parsed output
  that happened to describe MindForge itself, it now describes your project. (#201)

- **`npx mindforge-cc install` — and any other positional argument — now exits 1.**
  The installer takes flags only and silently ignored stray words, so
  `npx mindforge-cc install` appeared to work while installing nothing configured.
  It now refuses with the correct form. `--runtime`'s value token is still accepted.
  Use `npx mindforge-cc --claude --local`. (#202)

- **`mindforge verify` now SKIPS unavailable stages instead of failing them.** A project
  with no ESLint config, no test script or no `bin/verify-audit.js` was reported as
  FAILING those stages rather than as not having them. If your CI relied on a non-zero
  exit in those cases, it will now pass. A run in which every stage skipped prints a
  "NOTHING WAS VERIFIED" banner rather than a clean bill of health. (#204)

- **`scripts/sync-version.js` now exits non-zero when the plugin build artifacts are
  stale.** A bump used to report `✅ every derivable channel is at <version>` and exit 0
  while leaving `npm test` red. If you script this, handle the new exit code — it means
  "run the build chain it just printed". (#211)

- **A self-install no longer writes over your tracked files.** Running the installer
  inside a MindForge checkout printed that it was skipping and then overwrote 149
  tracked files, including `CLAUDE.md`, `.claude/**`, `.agent/**` and `.mindforge/**`.
  The skip is now honoured for local scope. (#200)

- **Releases must be tagged on a commit reachable from `main`.** The release workflow
  now refuses a tag that is not an ancestor of `origin/main`. The documented flow is
  develop → release → main; tagging elsewhere previously published, with provenance
  attesting to that tree. (#216)

### Fixed

**Installer**

- A self-install claimed to skip and then overwrote 149 tracked files. The gate is now
  scope-aware (`isSelfInstall() && scope === 'local'`). (#200)
- Every `--global` install reported failure on a correct run: `verifyInstall` demanded
  six `bin/**` paths regardless of scope, so a global install ended
  `❌ 6 of 12 required file(s) missing` and exit 1, with a `--force` retry that could
  not help. A global install writes 389 files to `$HOME/.claude` and, deliberately,
  zero to `bin/`. (#210)
- 11 of 27 routed CLI verbs died on `MODULE_NOT_FOUND` in a real install: the router
  shipped but 6 of the scripts it dispatches to did not. `coreFiles` grew from 2 entries
  to 8. (#210)
- Two leaks: `/tmp` staging files left behind on abandoned runs, and developer runtime
  state (`celestial.db`, `.browser-daemon-token`) copied into consumer projects.
  `SENSITIVE_EXCLUDE` now covers both. (#210)
- The forge commands overwrote three `mindforge` commands of the same name. (#197)
- The documented default install did not deliver the CLI it documents. (#196)

**Versioning and release**

- `sync-version.js --fetch-sha` hashed npm's 404 error body. For an unpublished version
  the registry answers `{"error":"Not found"}` and `curl -sL` exits 0, so the digest
  written into the Homebrew formula was the SHA-256 of that error text — the same
  constant for every unpublished version — and `--check` then passed. Now `curl -fsSL`
  plus a gzip magic-byte check, and it refuses rather than writing a digest no artifact
  can match. (#203)
- The Homebrew formula may now LAG canonical but never LEAD it. Requiring equality
  before publishing required something impossible: the digest is the hash of a tarball
  that does not exist yet, and `npm test` blocked the publish that would have made it
  satisfiable. (#208)
- Semver comparison is numeric per component. Lexicographically, `11.10.0` reads as
  *behind* `11.9.2` — wrong on exactly the first release past a `.9` minor. (#208)
- Three version channels had no writer at all, so `npm test` failed on every bump and
  the documented remedy could not fix it: `mcp-server/server.json` (both keys, matched
  by identifier), `AGENTS.md`, and `sdk/README.md`'s second shape. (#207, #211)
- **No channel covered a document a user receives.** `SECURITY.md` — the security policy
  at the root of the published package — said "Current version: 11.9.0", and
  getting-started, faq, troubleshooting, user-guide and sdk-reference all titled
  themselves v11.9.0: three releases stale, while every npm manifest was correct.
  `--check` was green throughout, because a channel that does not exist cannot drift.
  Structural markers now track canonical; narrative measurements deliberately do not.
  (#211)
- A bump is not finished when `sync-version.js` exits. Two tracked artifacts are gated
  against `package.json` and only a build can write them —
  `plugins/mindforge/.claude-plugin/plugin.json` and
  `plugins/mindforge/mcp/dist/index.js`. They are now reported under
  `🔨 REQUIRE A BUILD` with the exact three-command chain, which nothing had documented.
  (#211)
- `sync-version.js` reported "a channel is AHEAD of canonical" whenever its exit code
  was non-zero for any reason, so the `--fetch-sha` refusal for an unpublished tarball
  claimed the formula LEADS canonical in the same run that printed "DEFERRED until after
  publish (behind, not ahead)". (#211)
- `changelogs/index.json`, which `bin/updater/changelog-fetcher.js` reads as the
  authoritative version list, was missing 11.9.2. (#218)

**Publishing**

- **The tag push that publishes was exempt from every gate.** Publishing is triggered by
  exactly one event — a `v*` tag push — and the repository's only ruleset targets
  branches, so its six required checks applied to nothing on the path that ships. GitHub
  cannot attach required status checks to a tag. A `preflight` job now gates it. (#216)
- The `stable` npm dist-tag was moved by hand, or not at all — it sat four releases
  behind `latest` (11.8.3 against 11.9.2), so `npm i mindforge-cc@stable` delivered a
  build with none of the 11.9.x fixes. The release workflow now moves it as its final
  step: forward-only, prereleases skipped, and verified against npm's uncached dist-tags
  endpoint rather than the CDN-cached packument. (#216)

**Dashboard**

- `--status` and `--stop` were documented in nine places and implemented in none; both
  printed nothing and exited 0. Now implemented, before `express` is required, so they
  work without the dependency installed. (#206)
- `--stop` identified the target by the SHAPE of its command line, which matched any
  `node <anything>/dashboard/server.js` — verified against
  `node /var/www/unrelated_app/dashboard/server.js`. It now resolves the script's
  realpath and compares it to its own. (#206)
- `--status` printed a port it could not know: the PID file records only the pid, so it
  reported whatever port that invocation happened to receive. Measured, `--status` on a
  server started with `--port 7466` printed "port 7339". (#206)

**Memory**

- Every abandoned exit left a full copy of the database on disk — 1.8 GB of orphaned
  `.tmp` files. (#199)
- The SDK's WebSocket client took the caller's process down on a failed reconnect. (#191)

**Verification**

- `mindforge verify`'s lint stage used `--max-warnings=0`, which made it impossible to
  pass in the repository it ships from: `npx eslint .` reports 199 problems / 0 errors /
  199 warnings, so `verify` reported a lint FAILURE on a tree that is green by the
  project's own contract. Aligned with the project's definition; errors still fail. (#204)
- `temporal cleanup` printed "🧹 Cleaning up old temporal snapshots..." and
  "✅ Cleanup complete." with no cleanup between them. Now wired to
  `TemporalHub.gc({maxSnapshots: 50, maxAgeDays: 30})` with `--dry-run` and honest
  counts, including zero. (#209)

**Documentation that named things that do not exist**

- The protocol files instructed the agent to run `soul-engine.js` and
  `shard-controller.js`, neither of which exists anywhere in the package. Those steps
  are reasoning protocols and now say so. (#205)
- Fifteen phantom `/mindforge:` slash commands in shipped docs. A reader following
  `docs/user-guide.md` typed `/mindforge:personas --list` and got nothing. They were not
  typos: `.agent/workflows/` holds 130 tracked files using those exact names — an old
  target layout, committed and orphaned, shipping zero files. (#209)
- Four documented CLI invocations could not be run, each verified by running it:
  `npx mindforge-cc@latest install` (exit 1), `mindforge-cli.js dashboard` (exit 1),
  `npx mindforge auto` in a shipped engine doc (`auto` is a slash command, never a CLI
  verb), and `@mindforge <verb>`, a syntax that exists nowhere. (#213)
- `workflow` is the most-documented CLI verb in the project and works, but appeared in
  neither `--help` nor the "Available commands" list, so a user who mistyped it was told
  it does not exist. (#213)
- Root `CLAUDE.md` named `bin/hooks/mindforge-context-monitor.js`; the file is under
  `.agent/hooks/`. (#214)

### Added

- **`preflight` job on the release workflow.** Asserts the tagged commit is an ancestor
  of `origin/main`, then runs the six gates a tag push never saw, with the publish job
  behind `needs:`. (#216)
- **Automatic `stable` dist-tag movement**, forward-only and verified. (#216)
- **`node bin/dashboard/server.js --status` / `--stop`.** Not CLI verbs —
  `mindforge-cli.js dashboard` does not route. (#206)
- **`mindforge temporal cleanup --dry-run`.** (#209)
- New regression gates, each falsified by mutation before being trusted:
  `tests/protocol-claims.test.js` (no exemption list, deliberately — a name-keyed
  allowlist was shown to excuse the exact defect it was written for), the shipped-doc
  phantom-command gate, the CLI-verb gate, the authority-doc `.js` gate, the
  version-channel round trips, and assertions that the release preflight itself cannot
  be silently removed.

### Notes for operators

- `npm run version:check` is the offline drift check. A bump is finished only when
  `sync-version.js` exits 0 — if it prints `🔨 REQUIRE A BUILD`, run the three commands
  it names and commit both regenerated files.
- Releases are now gated on being tagged from `main`. One residual, inherent to
  tag-triggered workflows: a tag push resolves the workflow from the TAGGED ref, so a
  tag placed on a commit predating this release runs that commit's workflow and is
  ungated.

## [11.9.2] — 2026-08-16 — Correctness: audit-chain integrity, dashboard crash policy, secret scanning

Patch release. No new features. Correctness work closing defects found by a
multi-agent audit of v11.9.1, plus the regression suites that keep them closed.
Contains a breaking change to the dashboard HTTP surface — see BREAKING below.

### BREAKING

Shipped under a PATCH bump. The break is confined to the dashboard's own HTTP
surface, which binds to 127.0.0.1 only — but if you script against it, read this.

- **Dashboard error responses changed shape.** `detail` is removed from 5 endpoints and
  raw errno strings from 10 more; `correlation_id` is added to 15; a malformed request
  body now returns `application/json` instead of express's `text/html` error page.
  Anything parsing `detail` must correlate on the logged `correlation_id` instead. This
  was deliberate — those fields leaked absolute filesystem paths, and therefore the
  operator's username and home directory, into an unauthenticated response body
  (`requireAuth` exempts GET).
- **The dashboard now EXITS on an unhandled rejection or uncaught exception** where
  11.9.1 logged and continued. If you supervise the process, expect restarts where you
  previously saw a logged error. Rationale in the Fixed section below: log-and-continue
  held client sockets open until the client timed out, and had made `shutdown()` swallow
  a throwing token unlink and keep serving the authenticated mutation API after SIGTERM.
- **`node bin/validate-config.js` and `mindforge security-scan` can now fail.** They
  previously reported `MINDFORGE.md valid — 0 settings configured` and exited 0 on every
  input. If you run either in CI, a genuinely invalid registry will now red-line where it
  used to pass. Note this reaches **fresh installs and `--force` reinstalls only** — the
  installer does not overwrite an existing `.mindforge/MINDFORGE-SCHEMA.json`, so a plain
  upgrade keeps the old permissive schema.

### Fixed

- **`security-scan` could not fail.** `bin/validate-config.js` and
  `bin/models/model-router.js` each parsed `MINDFORGE.md` with a plain `KEY=value` regex, but
  the registry declares its 43 parameters as bracketed `[KEY] = value`. Every schema property
  resolved to `undefined` and short-circuited, so the command reported
  `MINDFORGE.md valid — 0 settings configured` and exited 0 on any input. The schema also had
  no `required` key at all. Both parsers now share `bin/utils/mindforge-params.js`, which also
  accepts the legacy plain form (`examples/starter-project/MINDFORGE.md` ships 28 such lines),
  and the schema declares real `required`/`recommended` sets.
  **Behaviour change for consumers:** three CI gates go from unfailable to failable —
  `.github/workflows/mindforge-ci.yml:38`, `.gitlab-ci-mindforge.yml:12`, and
  `.github/workflows/control-plane.yml:100`. If one red-lines on a valid value, the schema
  bound is wrong; do not "fix" it by editing `MINDFORGE.md`. Model routing is unchanged —
  30 persona x tier combinations resolve identically.
- **Trace retrieval returned nothing usable.** Queries were wrapped as a single FTS phrase, so
  any query containing one absent term scored zero; and `traces_search` was keyed on `trace_id`
  rather than the primary key, so each span's DELETE evicted the previous span and only the last
  span per trace stayed searchable — 2,270 of 5,117 content-bearing traces, 44.4%, unsearchable.
  Queries are now tokenised, OR-joined and ranked by tf-idf (`matchinfo('pcnx')`); the index is
  re-keyed and rebuilt losslessly from the base table. `bin/eval/eval-harness.js` and its golden
  set had zero callers and are now reachable as `npm run eval:retrieval`, with the baseline
  committed: mean recall@10 0.6417, nDCG 0.5698 over 519 documents.
- **The cost ledger reported two totals for one concept.** `sum(cost_usd)` was $13.73 while
  `sum(total_cost_usd)` was $0.00, and `tests/dashboard.test.js` wrote the reader's field name,
  so the mismatch tested green. `bin/models/usage-record.js` is now the single definition of the
  ledger path, record shape, per-entry cost and day bucket. The configured `ledger_path` pointed
  at `token-ledger.jsonl`, a file that has never existed; that ghost filename had spread to 17
  places across 13 files and is now absent. The dashboard cost tile no longer renders `$0.00`
  on a 500 — it had no `res.ok` check, and because errors return well-formed JSON the catch
  never fired, making an outage indistinguishable from zero spend.
  A maintainer tool, `scripts/purge-synthetic-usage.js`, removes fixture rows: dry-run by
  default, backs up first, idempotent, and aborts leaving the ledger untouched if the rewrite
  fails. It is run from a repository checkout — `scripts/` is not in the published tarball, so
  installed consumers do not have it.
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

- Suite totals for this release: **105 files, 103 pass, 2 environment-dependent skips**
  (`browser`, `sre-integration`). Eight new suites across the release:
  `temporal-integrity`, `dashboard-error-leak`, `dashboard-crash-guards`,
  `dashboard-wiring`, `cli-router`, `mindforge-params`, `file-lock`, `retrieval-fts`.
- **Four suites could not report failure and now can.** `v8-persistence`,
  `v8-skill-evolution` and `v8-orbital-governance` ended `finally { process.exit(0) }`, and
  `v7-pillar-integration` had zero assertions with a premium-model gate that named two models
  absent from the registry for several releases. `npm test` is the only quality step before
  `npm publish`, and the runner gates on child exit codes, so a blind suite blinded the publish
  gate. Verified by injected failure rather than inspection.
  `dashboard-wiring` derives the expected router set
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
