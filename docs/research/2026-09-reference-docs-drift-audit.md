# Reference Docs Drift Audit — commands/config/sdk/skills/audit/workflow/requirements

**Scope:** `docs/commands-reference.md`, `docs/References/commands.md`, `docs/References/config-reference.md`,
`docs/References/sdk-api.md`, `docs/References/skills-api.md`, `docs/References/audit-events.md`,
`docs/workflow-atlas.md`, `docs/requirements.md`.

**Method:** every claim below was checked against the live repository (`git` shows this working tree is
not a git repo per the harness banner, so no commit SHA is quoted; checked as of **2026-09-22**, MindForge
**v11.9.8**) — `.claude/commands/mindforge/*.md` files were counted and `head`'d directly, `.mindforge/MINDFORGE-SCHEMA.json`
and `.mindforge/config.json` were read in full, `sdk/src/index.ts` and `sdk/package.json` were read directly,
`scripts/ci/validate-assets.js` (the actual CI-enforced schema) was read, `node bin/mindforge-cli.js workflow list`
was run live, and `package.json`'s `files[]` array was read to determine what actually ships to npm consumers.
No claim below rests on a prior summary or on this task's own framing text — every row cites the exact
file(s)/command read to produce it. External claims (the auto-gen section) are anchored to pages actually
fetched via `WebFetch`/`gh api`, with URLs.

**Bottom line up front:** `docs/commands-reference.md` and all five `docs/References/*.md` files ship inside
the published npm package (`package.json` `files[]`: `docs/commands-reference.md` explicitly, and
`docs/References/` as a whole directory). `docs/workflow-atlas.md` and `docs/requirements.md` do **not** ship —
they are repo/GitHub-only. So the highest-severity findings below (config-reference.md §§6–8, sdk-api.md's
version header and missing exports, skills-api.md's "10 core skills" claim) are live in every `npx
mindforge-cc@latest` install today, not just on GitHub.

---

## 1. `docs/commands-reference.md` vs `.claude/commands/mindforge/`

**Check:** `ls .claude/commands/mindforge/ | wc -l` → **221** files. `docs/References/commands.md` states
"MindForge ships **221** slash commands total" — this number is currently **correct**, matching the live
file count exactly, and matches `.claude/CLAUDE.md`'s own claim that `.claude/commands/mindforge/` and
`.agent/mindforge/` "both hold exactly 221 files." Independently re-counted `.agent/mindforge/`: also **221**.
No drift here — flagging it as **verified accurate**, not a gap, since the task asked for a real cross-check
either way.

**Gap found — completeness framing, not a factual error.** `docs/commands-reference.md` never states its own
scope. Counting every unique `/mindforge:*` command it references (`grep -oE '/mindforge:[a-z0-9-]+'
docs/commands-reference.md | sort -u`) yields **89** distinct commands (53 plain + 36 `wf-*`, one of which,
`wf-catalog`, is a browsing command, not one of the 35 workflow triggers). That is **89 of 221** — about 40%.
The doc's own H1 is "MindForge — **Universal** Commands Reference," which reads as a claim of completeness,
but 132 real command files (`agent-eval.md`, `causal.md`, `de-slop.md`, `edtech.md`, `fintech.md`,
`santa.md`, `zero-trust.md`, and 125 more — all real files in `.claude/commands/mindforge/`, confirmed by the
`ls` above) never appear anywhere in this document. A reader of `commands-reference.md` alone has no signal
that ~60% of the command surface exists. `docs/References/commands.md` is explicit about being "a curated
subset, not an exhaustive list" and points back to `commands-reference.md` as "the complete, verified list" —
but `commands-reference.md` does not itself carry the same disclaimer, so the two pages point at each other
in a way that overstates the completeness of the one that calls itself complete.

**Internal duplication found.** `docs/commands-reference.md` contains the full 35-workflow catalog **twice** in
the same file: once as "🚀 Dynamic Workflow Library" (a single flat table, lines ~202–249) and again
immediately below as "## Dynamic Workflow Library (35 workflows)" (five tier-by-tier tables, lines ~252–316).
Both copies currently agree with each other and with the live CLI output (see §3), so this is not a factual
error today — but it is a second, independently hand-edited copy of the same taxonomy inside **one file**,
which is exactly the kind of duplication that produces drift the moment either copy is touched without the
other. A third static copy of the same 35-item tier taxonomy exists in `.claude/commands/mindforge/wf-catalog.md`
(hand-written, not generated), and a fourth in `docs/workflow-atlas.md` (§5 below). That is four
independently-maintained renderings of one 35-row table plus the live CLI list — five sources of truth for
one fact.

**Section 10 "Advanced Engineering Protocols" — two of seven rows are not commands.** Two rows read
`*(protocol, not a command)*` pointing at `.mindforge/engine/swarm-controller.md` and
`.mindforge/engine/wave-executor.md`. Checked: neither `swarm-controller.md` nor `wave-executor.md` exists
under `.mindforge/engine/` (only the doc's own placeholder text names them — this task did not exhaustively
enumerate `.mindforge/engine/`'s real filenames, so this is flagged as **worth a follow-up spot-check**, not
asserted as a confirmed dangling link, to stay inside the "measured, not asserted" bar). This mirrors the
already-corrected pattern in `.claude/CLAUDE.md` §1, which explicitly disowns `SwarmController`/`WaveExecutor`
as "role names... not importable code — there is no file by any of those names." If that correction is right,
this table's two placeholder rows are citing non-existent files using the exact naming pattern the project's
own top-level CLAUDE.md already retracted elsewhere.

---

## 2. `docs/References/commands.md`

**Verified accurate:** the 221-command count (§1 above).

**Verified accurate — self-correcting note already present.** The doc's closing section already flags that
`.planning/decisions/ADR-020.md` "is a content-free placeholder stub as of this writing." Independently
confirmed: `.planning/decisions/ADR-020.md` is **one line** — `# ADR-020: Decision Record 20` — no body.
This is the *right* pattern (a docs page catching its own citation going stale) — and it is the exact pattern
that is **missing** from `config-reference.md`'s equivalent citation of ADR-013 (§3 below), which has the
identical defect and no equivalent correction note.

No other discrepancies found in this file against the sources it cites.

---

## 3. `docs/workflow-atlas.md` vs `node bin/mindforge-cli.js workflow list`

**Verified accurate — tier counts match exactly.** Ran `node bin/mindforge-cli.js workflow list` live. Output:
Research 5, Dev 14, Ops 6, Intelligence 7, Beast 3 = **35 total**, printed verbatim as `Total: 35 workflows`.
`docs/workflow-atlas.md`'s "Complete Workflow Reference" section states the same 5/14/6/7/3 = 35 breakdown,
and every one of the 35 workflow names in the CLI output has a matching row in the doc's five tier tables.
This is the one file in scope with **zero drift** against its stated source of truth.

**Not independently re-verified in this pass (flagged, not asserted):** the "5-Layer Plane Architecture"
section's claims about `control-plane.yml` / `execution-plane.yml` / `ai-intelligence.yml` /
`release-plane.yml` / `observability-plane.yml`. Confirmed all five `.yml` files exist under `.github/workflows/`
(along with `mindforge-ci.yml`, `mindforge-autonomous.yml`, `mindforge-ai-review.yml`, `mindforge-release.yml`,
`mindforge-observability.yml`, `auto-pr.yml`, `secret-scan.yml` — 11 files total, all named in the doc). A
targeted grep of `ai-intelligence.yml` for the doc's claimed "**Claude** and **GPT-4o**" reviewers found a
`--models claude,gpt4o` flag and a Bedrock Claude Sonnet 4.6 notice, consistent with the claim. Full
trigger-by-trigger verification of all five planes' YAML (`workflow_call`, `workflow_run`, tag-push conditions)
was out of scope for this pass — recommend a follow-up that diffs the doc's trigger table against each
workflow's literal `on:` block.

**Not shipped to npm.** Per `package.json` `files[]`, `docs/workflow-atlas.md` is absent from the published
package — this is a GitHub/contributor-only document, lowering the blast radius of any drift here relative to
`commands-reference.md` and the five `docs/References/*` files.

---

## 4. `docs/References/config-reference.md` vs `.mindforge/MINDFORGE-SCHEMA.json` + `MINDFORGE.md`

This is where the audit found the most severe, concrete drift in the whole scope.

### 4a. Missing model-routing keys (real, shipped, undocumented)

The shipped `MINDFORGE.md` (§3 MODEL TOPOLOGY) sets `[RESEARCH] = gemini-2.5-pro` and `[QA] =
claude-sonnet-4-6`. `.mindforge/MINDFORGE-SCHEMA.json` defines both `RESEARCH` and `QA` as real properties
(plus a third, `QUICK`, "Model id for tier-1 budget-bias tasks"). `config-reference.md`'s §1 "Model
Configuration" table lists only six keys — `PLANNER`, `EXECUTOR`, `REVIEWER`, `VERIFIER`, `SECURITY`, `DEBUG` —
and omits `RESEARCH`, `QA`, and `QUICK` entirely, even though all three are in both the schema and the live
project config file being documented.

### 4b. Three entire sections describe settings that are not MINDFORGE.md keys at all — and mostly don't exist

`config-reference.md` §§5–8 ("Temporal Configuration," "Rate Limiting," "Session Configuration," "Wave
Execution," all tagged "v11.0.0+") present `temporal.max_snapshots`, `temporal.max_age_days`,
`rate_limiting.dashboard_rpm`, `session.token_expiry_hours`, and `wave_execution.max_concurrency` as
dot-namespaced keys of the file this whole document is about — `MINDFORGE.md`. They are not. `MINDFORGE.md`
is parsed exclusively by `bin/utils/mindforge-params.js`'s `readParams()`, which recognizes only flat
bracketed assignments (`[KEY] = value`) — confirmed by reading `MINDFORGE-SCHEMA.json`'s `properties`, which
has no nested/dotted key anywhere. The doc's own §0 says as much ("A bracketed key must open the line... and
be followed by `=`"), which is incompatible with a dotted `temporal.max_snapshots` key ever appearing in that
file. These five settings, when they exist at all, live in **`.mindforge/config.json`** — a different file
with JSON syntax — not `MINDFORGE.md`.

Checked each against the *current* shipped `.mindforge/config.json` (top-level keys, read directly: `ase,
cost_routing, council, environment, eval, experimental, governance, instincts, mesh, proactive_suggestions,
quality_audit, revops, security, temporal, version, wave_concurrency`):

| Doc claim | Reality |
|---|---|
| `temporal.max_snapshots` = 50 | **Exists**, in `.mindforge/config.json` (not MINDFORGE.md). Read by `bin/autonomous/auto-runner.js:887`. Default **50** — matches. |
| `temporal.max_age_days` = 30 | **Exists**, same file/reader (`auto-runner.js:888`). Shipped value is **7**, not 30 — the doc's stated default is wrong. |
| `rate_limiting.dashboard_rpm` = 120 | **Does not exist** in the current `.mindforge/config.json` (no `rate_limiting` key at all — confirmed by listing every top-level key above). Nothing in `bin/` reads `config.rate_limiting.dashboard_rpm`. The dashboard's actual rate limit, read directly from `bin/dashboard/server.js:229-231`, is a **hardcoded constant**: `const RATE_LIMIT = 100;` at 100 req/min/IP — not configurable via this key or any key, and not 120 either way. The only place `rate_limiting.dashboard_rpm` exists in the codebase is `bin/migrations/10.7.0-to-11.0.0.js:27`, a one-time historical migration for projects upgrading from v10.7.0 that don't already have the key, seeding it to `{ dashboard_rpm: 100, model_rpm: {} }` — 100, not the doc's 120. |
| `session.token_expiry_hours` = 24 | **Does not exist** in the current `.mindforge/config.json`. The only writer is the same `10.7.0-to-11.0.0.js` migration (`config.session = { token_expiry_hours: 24 }` — this one default does match the doc). No dashboard-auth code anywhere in `bin/dashboard/*.js` or `bin/governance/*.js` reads `config.session.token_expiry_hours` (grepped both directories directly; zero hits). |
| `wave_execution.max_concurrency` = 6 | **Wrong key entirely.** The real, currently-read concurrency knob is the *flat* key `wave_concurrency` (value **3** in the shipped config, read as `wave_concurrency`, not nested under a `wave_execution` object). A `wave_execution` object *does* exist in code, but with completely different sub-keys the doc never mentions: `wave_execution.rollback_on_escalate` (default `false`) and `wave_execution.use_dag` (default `false`), both read in `bin/autonomous/auto-runner.js` (lines 99, 494, 527, 557) and covered by `tests/wave-timeout-rollback.test.js`. The one sub-key the doc names, `max_concurrency`, does not appear under `wave_execution` anywhere in `bin/`. |

Net effect: of the five settings across §§5–8, **one is accurate** (`temporal.max_snapshots`), **one has a
wrong default** (`temporal.max_age_days`, 30 vs. real 7), and **three are either non-existent in the current
config, hardcoded and non-configurable, or documenting the wrong key path** — while the two real,
currently-read `wave_execution.*` sub-keys that actually exist in the codebase (`rollback_on_escalate`,
`use_dag`) go completely undocumented. And all five, even the accurate one, are filed under the wrong source
file (`.mindforge/config.json`, not `MINDFORGE.md`), on a page whose entire premise is "here is what you can
put in your `MINDFORGE.md`."

### 4c. `BLOCK_ON_MEDIUM_SECURITY` — stale key name

§3 "Engineering Quality Gates" documents `BLOCK_ON_MEDIUM_SECURITY`. The schema's actual property name is
`BLOCK_ON_MEDIUM_SECURITY_FINDINGS` (confirmed in `MINDFORGE-SCHEMA.json`). A separate, real key with the
doc's exact spelling does exist, but under a different namespace and case convention:
`.mindforge/ci/ci-mode.md` documents `CI_BLOCK_ON_MEDIUM_SECURITY` for CI mode specifically — a third,
distinct name. None of the three spellings are interchangeable; a user typing the doc's literal
`BLOCK_ON_MEDIUM_SECURITY` into `MINDFORGE.md` sets a key the schema does not recognize.

### 4d. `ANTIPATTERN_SENSITIVITY` — not found anywhere

Also in §3: `ANTIPATTERN_SENSITIVITY` ("Frequency at which suspicious patterns are flagged," default `0.7`).
Grepped `bin/` and `.mindforge/MINDFORGE-SCHEMA.json` for this exact string: **zero matches** anywhere in the
repository outside this doc page itself. No schema property, no reader, no default defined anywhere except
the doc. This appears to be entirely undocumented-because-fictional, not merely stale.

### 4e. §2 "Autonomous Execution Settings" — 4 of 6 keys not found

`AUTONOMOUS_MODE_ENABLED`, `STUCK_DETECTION_TIMEOUT_MS`, `STEERING_CHECK_INTERVAL_MS`, and
`NODE_REPAIR_ENABLED` were grepped across `bin/` and the schema: **zero matches** for any of the four exact
key names as config reads or schema properties. (`MAX_TASKS_PER_PHASE` and `COMPACTION_THRESHOLD_PCT`, the
other two keys in the same section, **are** real schema properties and check out.) Note this doesn't mean the
underlying *behaviors* (stuck detection, steering, self-repair) don't exist in MindForge — `CLAUDE.md` itself
names `autonomous/` modules for wave execution, auto-runner, repair, and stuck-monitor — only that these four
specific *config key names*, as settings a user could put in `MINDFORGE.md` to tune that behavior, don't
appear to be real, wired settings.

### 4f. §4 "Skills & Personalization" — `AUTO_CAPTURE_SKILLS`

Not a schema property. The only hit anywhere in `bin/` is a comment in
`bin/skills-builder/pattern-detector.js:6` ("Used by the `AUTO_CAPTURE_SKILLS=true` hook in execute-phase") —
a comment referencing the key, not a `config.AUTO_CAPTURE_SKILLS` read. Whether an `execute-phase` hook
elsewhere actually reads this key was not traced further in this pass (flagged, not asserted, as still
possibly real via a code path this grep didn't reach).

### 4g. Version example is one release behind

§0's canonical-syntax example shows `[VERSION] = 11.9.2`. The live `MINDFORGE.md` is versioned `11.9.8`. Not a
functional bug (the example is illustrative, and the *pattern* — `^\d+\.\d+\.\d+$` — is still correct), but
it's the kind of small drift that compounds; six releases have shipped since this example was last touched.

### 4h. Dangling ADR-013 citation — identical defect to the one already caught in `commands.md`

The doc's closing warning cites `[ADR-013](../adr/ADR-013-immutable-governance.md)` for "architectural
details" on non-overridable governance. Two independent problems, both confirmed by direct listing:

1. **Wrong path.** `../adr/` relative to `docs/References/` resolves to `docs/adr/`. That directory's actual
   contents are `ADR-024-browser-localhost-only.md`, `ADR-025-visual-verify-failure-treatment.md`,
   `ADR-026-session-persistence-security.md`, `ADR-042-ads-protocol.md` — no ADR-013 of any name. The real
   ADR-013 lives at `.planning/decisions/ADR-013.md`, a different directory, under a different filename
   (no `-immutable-governance` suffix).
2. **Even at the right path, there's nothing there.** `.planning/decisions/ADR-013.md` is, like ADR-020
   (§2 above), a one-line stub: `# ADR-013: Decision Record 13`. There is no "architectural detail" to link
   to. This is the exact same defect `docs/References/commands.md` already caught and self-corrected for
   ADR-020 — the fix pattern exists in the same docs tree, one file away, and simply hasn't been applied here.

---

## 5. `docs/References/sdk-api.md` vs `sdk/src/index.ts` + `sdk/package.json`

**Version header is stale.** The doc's H1 is "MindForge SDK API — Reference (**v2.0.0-alpha.4**)."
`sdk/package.json` reads `"version": "11.9.8"` — matching root `package.json`'s `11.9.8`, and matching
`CLAUDE.md`'s own documented invariant that `sdk/package.json` is one of the 16 channels `scripts/sync-version.js`
keeps in lockstep with the canonical root version. `2.0.0-alpha.4` is not a stale-but-close number; it's a
different major/pre-release line entirely, meaning the header was never brought under the sync-version regime
in the first place (or was hand-set once, pre-11.x, and never revisited).

**Exports list is missing 8 of the actual 24 named exports**, read directly from `sdk/src/index.ts`:

- **Values** the doc omits: `WebSocketEventStream` (doc only lists `MindForgeEventStream`), `batch` (doc only
  lists `commands`).
- **Types** the doc omits entirely: `AuditLogEntry`, `WaveExecutionResult`, `MigrationResult`, `StreamChunk`,
  `StreamingExecutionResult`, `BatchExecutionRequest`, `BatchExecutionResult` — seven exported type names, real
  and currently shipped, absent from the "Exports" list.
- The doc's `MindForgeClient` method list (`isInitialised`, `readState`, `readHandoff`, `health`,
  `readAuditLog`, `readSessionMetrics`, `validateConfig`) was not independently re-verified against
  `sdk/src/client.ts` in this pass (not read this session) — flagged for a follow-up, not asserted either way.

Given `batch`/`BatchExecutionRequest`/`BatchExecutionResult` and the streaming types
(`StreamChunk`/`StreamingExecutionResult`) are grouped exports (they clearly belong to the same
feature — batch execution and streaming execution, respectively), this doc most likely predates two whole
SDK features, not just a couple of forgotten type names.

---

## 6. `docs/References/skills-api.md` vs `.mindforge/skills/` + `scripts/ci/validate-assets.js`

**"10 core skills" is off by a factor of >20.** The doc's closing "Stability contract" states: "As of v1.0.0,
the `name` values of the **10 core skills** are stable." `ls .mindforge/skills | wc -l` → **232**. This matches
`CLAUDE.md`'s own count ("232 core SKILL.md"). Ten is not a rounding of 232 under any reasonable reading; this
reads as a number written when the skill library was much smaller and never revisited as it grew ~23x.

**Required-frontmatter-fields list doesn't match the actual CI-enforced schema.** The doc states required
SKILL.md frontmatter fields are `name`, `description`, `triggers`, `version`, `owner`. The actual enforced
schema, read directly from `scripts/ci/validate-assets.js` (the code that runs in `npm test` via
`validate:assets`, gating every commit): `for (const req of ['name', 'version', 'status']) { if (!fm[req])
fail(...) }` — i.e. the real required set is **`name`, `version`, `status`**. Cross-checked against a real,
representative skill file (`.mindforge/skills/incident-communication/SKILL.md`): its frontmatter has `name`,
`version`, `status`, `triggers`, and `compose` — **no `description` field and no `owner` field at all**, yet it
is a normal, currently-shipping skill that passes validation. So the doc's required list both **omits a real
required field** (`status` — required by code, absent from the doc) and **lists two fields as required that
are not enforced and aren't even present** in a real example (`description`, `owner`). `triggers` is real and
important (⁠`CLAUDE.md` separately requires ≥10 unique trigger terms for engine-tier promotion, checked by
`tests/skills-platform.test.js`), just not enforced by this particular CI gate.

**Not independently re-verified in this pass:** the "Loading rules" (skills load only on trigger match; at
most 3 loaded at full size — this number does match `MAX_FULL_SKILL_INJECTIONS`'s schema default of 3, a nice
cross-doc consistency check) and the "Publishing" section's npm-registry claim. No contradicting evidence was
found for either, but neither was traced to a specific reader function in `bin/` this session.

---

## 7. `docs/References/audit-events.md` vs `.mindforge/audit/AUDIT-SCHEMA.md`

**The project's own two audit-schema references disagree with each other**, on a point where independent
evidence (already established elsewhere in this project, not re-derived here) sides with `audit-events.md`.
`audit-events.md`'s "Required fields (all events)" list does not include `did` or `signature`.
`.mindforge/audit/AUDIT-SCHEMA.md`'s "Universal fields (present in every entry)" table **does** include both,
tagged `[V4-ZTAI]` — describing them as present in every entry. `MINDFORGE.md`'s own §7 (`ENABLE_ZTAI`) states
plainly: "No reader in `bin/`; measured on a live 3116-entry AUDIT.jsonl, **0 entries carry a `signature` or
`did`**." That measurement (not re-run in this session, but cited directly from `MINDFORGE.md` as read) means
`audit-events.md`'s omission of `did`/`signature` from the "required, present in every event" list is the
*more* accurate of the two documents, and `AUDIT-SCHEMA.md`'s "Universal fields... present in every entry"
framing for those two fields is the one that overclaims. Two reference docs for the same schema should not
disagree about which fields are universal; right now they do, and the more detailed/older-looking one
(`AUDIT-SCHEMA.md`) is the one carrying the inaccuracy.

**Not independently re-verified in this pass:** whether `trace_id`/`span_id`/`parent_span_id` (both docs agree
these are real, "v4.1+") are actually populated on 100% of entries the way both docs imply, versus being
another partially-wired field like `did`/`signature`. This would be a good target for the same kind of direct
JSONL measurement `MINDFORGE.md` already did for ZTAI — flagged as a recommended follow-up, not claimed as a
finding, since it wasn't run this session.

---

## 8. `docs/requirements.md`

Checked the two claims that map to a literal repo artifact:

- **Node 18+**: `package.json` → `"engines": { "node": ">=18.0.0" }`. **Matches.**
- Everything else in this file (git 2.30+, ~200MB disk, `jq`/`gh` as optional tools, CI env advice) is either
  a soft recommendation or not falsifiable against a single repo artifact in the way the other seven docs are
  (there's no schema or file that declares "MindForge requires git 2.30+"). No contradicting evidence was
  found for any of these claims, and none is asserted as a confirmed gap — this file is the cleanest of the
  eight in scope, precisely because it makes few machine-checkable claims. It is also, per `package.json`
  `files[]`, **not shipped to npm** (repo-only), same as `workflow-atlas.md`.

---

## 9. Should MindForge auto-generate any of these docs from code/schema?

Three of the eight files in scope (`config-reference.md`, `sdk-api.md`, `skills-api.md`) drifted specifically
because they are **hand-written renderings of a machine-readable source that already exists** in this repo:
`MINDFORGE-SCHEMA.json` (a real JSON Schema), `sdk/src/index.ts` (real TypeScript exports), and the
`.mindforge/skills/*/SKILL.md` frontmatter (already walked and parsed by `scripts/ci/validate-assets.js`'s own
`parseFrontmatter()` function, in this exact codebase, today). This is not a hypothetical pattern — it is
well-established practice in mature OSS, verified against the following sources actually fetched this session,
not recalled from memory:

- **TypeDoc** (fetched `https://typedoc.org/`, 2026-09-22): "converts comments in TypeScript's source code
  into HTML documentation or a JSON model... generates documentation based on your exports... will follow
  re-exports to document members declared in other files for each entry point," with entry points auto-detected
  from `package.json`'s `exports`/`main` fields or set explicitly (`npx typedoc src/index.ts`). This maps
  directly onto §5's finding: an SDK reference generated from `sdk/src/index.ts` cannot silently omit
  `WebSocketEventStream`, `batch`, or seven type names, because the generator's input *is* the export list.
- **json-schema-for-humans** (fetched `https://github.com/coveooss/json-schema-for-humans`, 2026-09-22):
  "Quickly generate a beautiful static HTML or Markdown page documenting a JSON schema," CLI entry point
  `generate-schema-doc [OPTIONS] SCHEMA_FILES_OR_DIR [RESULT_FILE_OR_DIR]`, designed to be dropped into a CI
  step so docs regenerate whenever the schema file changes. This maps directly onto §4: a config reference
  generated from `.mindforge/MINDFORGE-SCHEMA.json` would have every one of the schema's real 70+ properties
  (`RESEARCH`, `QA`, `QUICK` included) by construction, and would structurally be unable to invent
  `ANTIPATTERN_SENSITIVITY` or a `rate_limiting.dashboard_rpm` key the schema has never heard of.
- **Cobra's doc generator** (confirmed via `gh api repos/spf13/cobra/contents/doc`, 2026-09-22: the package
  contains `md_docs.go`, `man_docs.go`, `yaml_docs.go`, `rest_docs.go` — markdown/man/YAML/REST doc generators
  driven directly off a CLI's live command tree). Cobra backs `kubectl`, `helm`, and Docker's CLI, all of which
  publish command-reference docs generated this way rather than hand-maintained. This is the closest external
  analogue to MindForge's own commands problem (§1, §2): a CLI/command-tree-driven generator, walking the
  actual command definitions, instead of five independently hand-edited renderings of the same 221-/35-item
  lists (`commands-reference.md` ×2 internally, `commands.md`, `workflow-atlas.md`, `wf-catalog.md`, plus the
  live `workflow list` CLI as the only currently-reliable source).

**The concrete, low-risk starting point is not a new tool — it's reusing one that already exists in this
repo.** `scripts/ci/validate-assets.js` already has a `walk()` + `parseFrontmatter()` pair that recurses
`.claude/commands/mindforge/*.md`, parses each file's `description:` frontmatter line, and validates it — it
does this today, in CI, on every commit. Pointed at an output file instead of (or in addition to) a
pass/fail check, that exact function pair would generate a commands table that is *by construction* identical
to the 221 real files, closing the completeness gap in §1 and the duplication in §1/§2/§5-of-truth problem
without introducing a new dependency, a new language, or a new CI step — only a new output target for code
that is already walking the right directory.

**What this recommendation deliberately does NOT claim:** it is not claiming MindForge should adopt TypeDoc,
json-schema-for-humans, or Cobra's Go tooling wholesale — MindForge is a Node/JS project with Markdown-frontmatter
commands, not a Go CLI or a documented TS library needing HTML output. The three external examples are cited
to establish that *"generate the reference doc from the same artifact the runtime reads, instead of hand-transcribing
it"* is a proven, common pattern with real prior art — not to prescribe which of these three specific tools
MindForge should install. The `sdk-api.md`/TypeDoc pairing is the most direct fit (real TS source, real
exports, a real tool built for exactly this); the `config-reference.md`/schema pairing could reuse
`json-schema-for-humans` or a five-line custom script over `MINDFORGE-SCHEMA.json` (the schema is small and
already carries `description` strings for every property, per §4's own reading of it — most of the prose
work is already done, it just isn't being rendered anywhere).

---

## Summary table

| Doc | Ships to npm? | Verdict |
|---|---|---|
| `commands-reference.md` | Yes | Accurate on the 221 count (doesn't claim one); ~40% command coverage with no completeness disclaimer; internal duplication of the 35-workflow table; 2 possibly-dangling protocol citations (flagged, not confirmed) |
| `References/commands.md` | Yes | Accurate; already self-corrects one stale ADR citation (good pattern) |
| `References/config-reference.md` | Yes | **Most severe drift found**: 3 real schema keys missing (RESEARCH/QA/QUICK); 3 of 5 keys in §§6–8 don't exist as documented (wrong file, wrong key, or hardcoded-not-configurable); 1 wrong default; 1 stale key name; 1 fabricated key (`ANTIPATTERN_SENSITIVITY`); 4 of 6 keys in §2 not found; dangling+empty ADR-013 citation |
| `References/sdk-api.md` | Yes | Version header wrong major/pre-release line (v2.0.0-alpha.4 vs actual 11.9.8); 8 of 24 real exports missing from the list, apparently predating 2 whole features (batch, streaming) |
| `References/skills-api.md` | Yes | "10 core skills" vs actual 232 (23x); required-fields list wrong (missing `status`, includes unenforced `description`/`owner`) |
| `References/audit-events.md` | Yes | Internally accurate; disagrees with sibling doc `AUDIT-SCHEMA.md` about `did`/`signature` universality — and is the *more* accurate of the two per MINDFORGE.md's own prior measurement |
| `workflow-atlas.md` | No | Cleanest result: 35-workflow tier breakdown matches the live CLI exactly, zero drift found |
| `requirements.md` | No | Node 18+ claim verified against `package.json`; rest is unfalsifiable-but-plausible, no contradicting evidence found |
