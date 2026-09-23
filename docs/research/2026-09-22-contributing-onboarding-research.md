# Contributor Onboarding & Architecture Docs — Gap Research (2026-09-22)

> **Historical snapshot:** Sections 1.1 and 1.2 describe the pre-remediation documentation
> state. Both were fixed in the same PR that shipped this report — `docs/contributing/CONTRIBUTING.md`
> is now a pointer to the stronger root file (and `README.md`'s link was corrected to match), and
> `docs/architecture/README.md` was rewritten around a real `bin/` codemap. §1.4's
> recommendations 1-2 (fix the item count, add Section G to the recommended order) are also
> applied; recommendations 3-4 (restore real verification steps for Sections A-E, regenerate
> `.planning/RELEASE-CHECKLIST.md`) remain open. Sections 1.3, 1.5, and 2 were not remediated and
> still describe the current state.

**Scope:** `docs/architecture/README.md`, `docs/contributing/CONTRIBUTING.md`,
`docs/ci-quickstart.md`, `docs/release-checklist-guide.md`, traced against the live repo
(`sairam0424/MindForge`, package version 11.9.8) plus external OSS practice, with every
external claim backed by a page actually fetched in this session (URLs cited inline).

**Bottom line:** A new contributor *can* get a passing local test run from these four docs —
the mechanical `npm install && npm test` / `node tests/install.test.js` instructions are
correct and were verified to run clean (86/86 assertions, exit 0) during this research. What
breaks down is everything past "clone and test green": the docs point to the *weaker* of two
CONTRIBUTING files, the architecture doc has no codemap or diagram, the CI doc doesn't
describe the CI that actually gates a PR, and the release doc's item count contradicts the
checklist file it's a guide *for* — twice, with two different wrong numbers.

---

## 1. What a new contributor actually hits, traced step by step

### 1.1 Two CONTRIBUTING.md files — README links to the thin one; GitHub's own rule would surface the good one

The repo has **two** contributing guides that materially disagree:

| | Root `CONTRIBUTING.md` | `docs/contributing/CONTRIBUTING.md` |
|---|---|---|
| Points to `CLAUDE.md` as the architecture source of truth | Yes | No |
| States the real test command (`node scripts/ci/validate-assets.js && node tests/run-all.js`, 140 files, 137 pass / 3 skip) | Yes | No — says only `npm install && npm test`, then `node tests/install.test.js` as "the" test |
| Explains SDK/MCP-server are separate packages not covered by root `npm test` | Yes | No |
| Explains version-bump discipline (`scripts/sync-version.js`, 16 channels) | Yes | No |
| Skill-authoring tier detail (extended vs. engine, `triggers:` uniqueness) | Yes | No |
| Links to `SECURITY.md` for vulnerability reports | Yes (root file, correct path) | Yes, but to `docs/security/SECURITY.md` — a *different*, thinner file that does exist but isn't the canonical one `SECURITY.md` (root) is |

I ran `diff CONTRIBUTING.md docs/contributing/CONTRIBUTING.md` directly — they are not near-duplicates, they are two independently-written documents at very different levels of detail and accuracy, and the root one is dated substantially later (it explicitly cites "140 files today... 137 passed, 3 skipped," matching the exact live count I reproduced).

**The README makes this worse, not better.** `README.md` line 307 explicitly sends contributors to the *weaker* file:

```
| Contributing | [Contributing guide](docs/contributing/CONTRIBUTING.md) | Sending a PR |
```

The much better root `CONTRIBUTING.md` is not linked from `README.md` at all — it's orphaned from the doc a newcomer actually opens first. This is doubly confusing because GitHub itself has an explicit, documented precedence rule for exactly this situation. Per GitHub's own docs on repository contribution guidelines (fetched live), when more than one `CONTRIBUTING` file exists, *"the file shown in links is chosen from locations in the following order: the `.github` directory, then the repository's root directory, and finally the `docs` directory."* (docs.github.com, "Setting guidelines for repository contributors"). MindForge has no `.github/CONTRIBUTING.md`, so by GitHub's own rule the **root** file is what GitHub's automatic "Contributing guidelines" link (shown when opening a new issue/PR, and on the repo's Community Standards / Insights page) would surface — while the hand-written README table points readers at the docs/ one instead. The repo's own README and GitHub's own UI disagree about which file is canonical.

**Recommendation:** Pick one canonical file (root `CONTRIBUTING.md` is the stronger, more current one) and either delete `docs/contributing/CONTRIBUTING.md` or turn it into a one-line pointer (`See the root CONTRIBUTING.md`). Fix `README.md` line 307 to link to it. Fix the `docs/security/SECURITY.md` vs. root `SECURITY.md` link mismatch at the same time.

### 1.2 `docs/architecture/README.md` gives pillar history, not the codemap a contributor needs to find where to make a change

I read the file in full. It is organized around eight historical "Pillars" (FIM, CADIA, PAR, ZTS, ZTAI, ADS, Semantic Sharding, Autonomous Execution) with a five-row directory table (`EIS/Mesh`, `Governance`, `.mindforge/`, `.agent/`, `.planning/`) — notably **`bin/` itself, where ~25K lines of actual runtime code live, is never explained as a subsystem** beyond two file-path mentions buried in prose. It never covers: the task lifecycle (command → skill loader → cost router → subagent → verification), the two single-sources-of-truth the project itself flags as load-bearing (`audit-hash.js`, `pricing-registry.js`), or which of the eight "Pillars" map to which real, runnable code paths at all.

That content *does* exist — verbatim, and considerably better organized — in this repo's own root `CLAUDE.md` ("High-level Architecture" section: 4 layers, task lifecycle, two SSOTs). But `docs/architecture/README.md` never links to `CLAUDE.md` (checked with `grep -n "CLAUDE.md" docs/architecture/README.md` — zero hits), so a contributor who follows README's explicit "Understanding the codebase before sending a PR" pointer to `docs/architecture/README.md` gets the weaker of the two documents and has no signpost to the better one.

This is a well-known, named gap in OSS practice. rust-analyzer maintainer matklad's widely-cited essay on `ARCHITECTURE.md` files (fetched live, matklad.github.io/2021/02/06/ARCHITECTURE.md.html) argues explicitly that *"new contributors struggle far more with figuring out where to make a change than with actually writing the code"* and prescribes a **codemap** — "a map of a country, not an atlas of maps of its states" — that names concrete modules/crates and calls out architectural invariants explicitly (e.g., "layer X never depends on layer Y"). He cites rust-analyzer's own `architecture.md` as the model to copy. I fetched that file directly: it opens with an actual embedded diagram image under a "Bird's Eye View" heading, then a "Code Map" section with one subsection per crate (`crates/parser`, `crates/syntax`, `crates/hir-*`, `crates/ide-*`...), each with a plain-language description and explicit **"Architecture Invariant"** callout boxes (e.g., "`syntax` crate is completely independent from the rest of rust-analyzer").

`docs/architecture/README.md` has zero diagrams and no invariant callouts of this kind — it does correctly hedge which capabilities are simulated vs. real (a genuinely good honesty practice this repo already follows elsewhere), but it doesn't do the *orienting* job an architecture doc is for.

**Recommendation:** Rewrite `docs/architecture/README.md` around a real codemap — one subsection per `bin/` domain (`autonomous/`, `engine/`, `memory/`, `governance/`, `models/`, `dashboard/`, `security/`, `browser/`, `eval/` — all named in root `CLAUDE.md` already) with 1-2 sentences each and an explicit invariant or two (the project already has two good candidates: "only `audit-hash.js` computes the audit hash chain" and "only `pricing-registry.js` prices a model call"). Add one diagram (even a simple boxes-and-arrows image of the 4-layer flow already described in prose in `CLAUDE.md` would clear the bar rust-analyzer sets). Link to `CLAUDE.md` explicitly rather than duplicating its content with less detail.

### 1.3 `docs/ci-quickstart.md` describes a toy CI job, not the one that actually gates a PR

The doc's GitHub Actions example runs a single step: `npx c8 node tests/install.test.js`, labeled "Run MindForge suite." I checked the real workflow, `.github/workflows/mindforge-ci.yml`: it has (at minimum) four jobs — `mindforge-health`, `mindforge-security`, `mindforge-quality`, and `mindforge-ai-review` (confirmed via `grep -n "^  [a-z-]*:$"` on the file). Root `CLAUDE.md` states the `mindforge-quality` job specifically is what runs `npm run harness:compliance`, `npm run harness:gate`, and `npm run release:ready` — none of which `ci-quickstart.md` mentions anywhere (`grep -n -i "mindforge-quality\|harness:compliance\|harness:gate\|release:ready"` on the doc returns nothing). The doc also never states the canonical `npm test` command (`validate-assets.js` + full 140-file `run-all.js`) that both root `CONTRIBUTING.md` and `package.json` treat as *the* test entrypoint — its one code example runs exactly one of 140 test files and calls it "the suite."

This isn't a claim the doc makes that's false — it's explicitly an illustrative minimal example — but for a doc whose stated purpose is "how to run MindForge in real pipelines" and "understanding what CI checks before you push" (per README's own description of it), a contributor who reads only this file would come away thinking a single test file plus coverage is what gates merges, and would have no idea `mindforge-quality`/`harness:compliance`/`release:ready` exist or run on every PR.

**Recommendation:** Either replace the illustrative example with (or add alongside it) a short table naming the real jobs in `mindforge-ci.yml` and one sentence on what each gates, or at minimum add "see `.github/workflows/mindforge-ci.yml` for what actually runs on this repo's PRs" with a link.

### 1.4 `docs/release-checklist-guide.md`'s item count is wrong twice, and its "recommended order" skips a whole section

This is the sharpest, most concrete finding, and it matters because it's a **release gate document** — the exact place where being wrong is costly (this project's own root `CLAUDE.md` documents a real past incident of a version shipping four releases out of sync across Homebrew/Dockerfile/marketplace files, caused by skipping a step in a process very much like this one).

I read `docs/release-checklist-guide.md` and cross-checked it against the file it is explicitly a guide for, `.mindforge/production/production-checklist.md`, and against `.planning/RELEASE-CHECKLIST.md` (the file it tells contributors to log results into). The numbers do not agree, anywhere:

- `docs/release-checklist-guide.md` says: *"Do not tag or publish until **all 55 items** are ✅"* and lists a "Recommended order" of **Sections A through F only**.
- `production-checklist.md` line 3 says: *"Policy: **ALL 65 items** must be ✅ before tagging v2.0.0"* — and its own "Checkbox summary" section literally lists 65 checkboxes (A01–A10, B01–B10, C01–C10, D01–D10, E01–E10, F01–F10, **G01–G05**).
- The *same file*'s closing "Release gate procedure" section (line 128) says a third number: *"When ALL **50** items show ✅"*.
- `.planning/RELEASE-CHECKLIST.md` (v1.0.0, the file the guide tells you to log into) has **55** rows total — but I counted them directly (`grep -c "^| [A-Z][0-9]"` → 55) and they run only through **F05**, i.e. this is a *stale, older* 55-item version of the checklist (A–E = 50 items + only 5 of the current 10 F-items), predating the current v2.0.0 checklist's F06–F10 and the entire G section. The guide's "55" number matches this *stale* tracking file, not the *current* production checklist it names in its own first paragraph.

Three files, three different totals (65 / 50 / 55), and the number the guide actually gives a contributor (55) traces to a leftover v1.0.0 artifact, not the v2.0.0 checklist in active use. Concretely: a contributor following the guide's own "Recommended order" (Sections A–F) would never look at **Section G — final packaging (5 points)**, which is exactly the version-consistency / git-tag / CHANGELOG-entry / `npm publish --dry-run` cleanliness check this project's own `CLAUDE.md` says was skipped in the real incident it documents.

**A second, independent problem in the same file:** `docs/release-checklist-guide.md`'s "How to use" step 2 says *"For each item, run the Verification step exactly."* I read `production-checklist.md` in full — Sections A through E (50 of the 65/50/55 items, depending which number you believe) do not contain verification steps at all. Their table bodies are literally the placeholder text `... (existing items A01-A10)` (and the equivalent for B–E) rather than actual rows; only Sections F and G have real `| # | Check | Verification step | ✅/❌ | Verified by | Date |` tables with runnable commands. The only place A01–E10 have any description at all is the terse "Checkbox summary" list further down (e.g. `A03 — Installer handles --version flag`) — a title, not a verification step. The guide's instruction to "run the Verification step exactly" is literally not executable for the majority of the checklist as currently written.

**Recommendation:**
1. Pick the one true number (65, matching the real current checkbox summary) and fix it in both `docs/release-checklist-guide.md` and `production-checklist.md`'s own contradictory footer.
2. Fix the "Recommended order" to include Section G explicitly — this is the one most directly tied to a documented past incident.
3. Either restore real verification-step rows for Sections A–E (they clearly existed at some point, given the detailed checkbox titles), or explicitly say in the guide that A–E currently only have checkbox-level guidance and point at the commands root `CLAUDE.md`/`CONTRIBUTING.md` already give for the equivalent checks (e.g. `node scripts/sync-version.js`, `node bin/verify-audit.js`).
4. Regenerate `.planning/RELEASE-CHECKLIST.md` for the current v2.0.0 65-item shape rather than leaving the stale v1.0.0/55-item version as the thing contributors are told to log into.

### 1.5 Smaller items found while tracing

- `docs/contributing/CONTRIBUTING.md`'s PR checklist says "New commands added to command reference" with no link; the actual reference is `docs/reference/commands.md` (confirmed it exists, 76 lines) — one markdown link would close this.
- Positive finding, for calibration: the actually-runnable instructions in `docs/contributing/CONTRIBUTING.md` (`npm install`, `npm test`, `node tests/install.test.js`) were traced live in this session and work exactly as described — `node tests/install.test.js` produced "Results: 86 passed, 0 failed... exit=0". The problem with this file is thinness and staleness relative to its root sibling, not incorrectness.
- `docs/ci-quickstart.md`'s per-suite loop (`SUITES=(install wave-engine audit ...)`) — I checked all 15 named files exist as `tests/<name>.test.js` and they do. Accurate, just incomplete against the real 140-file/4-job picture above.

---

## 2. What well-regarded OSS projects do here that MindForge's docs don't — external sources fetched live

### 2.1 "Good first issue" / beginner-task labeling — absent here entirely

MindForge has no `good-first-issue` (or equivalent) label mentioned anywhere in `CONTRIBUTING.md` (either copy), no mention in the issue templates (`.github/ISSUE_TEMPLATE/{bug_report,feature_request,config}.yml` — checked, none reference difficulty/beginner labels), and `.github/ISSUE_TEMPLATE/config.yml` only links to the security policy and Discussions.

This is one of the single most common, lowest-cost OSS onboarding patterns. I fetched `github.com/topics/good-first-issue` directly: GitHub reports **2,838 public repositories** tagged with this topic, spanning virtually every major language, and the convention is typically paired with sibling labels (`help-wanted`, `up-for-grabs`). Two purpose-built examples of the pattern: `firstcontributions/first-contributions` (a repo built specifically to onboard first-time contributors) and `up-for-grabs/up-for-grabs.net`, which describes itself as curating "projects with curated tasks specifically for new contributors."

**Recommendation:** Add a `good first issue` label, apply it to a handful of genuinely small, well-scoped issues (a stale-doc-link fix like the ones in §1 would qualify), and add one sentence to `CONTRIBUTING.md` pointing new contributors at it — mirroring opensource.guide's phrasing (below).

### 2.2 PR review turnaround / expectations — undocumented here, and other projects state it explicitly

Neither `CONTRIBUTING.md` file states how long a contributor should expect to wait for a review, or what happens if nobody responds. GitHub's own `opensource.guide` "Best Practices" page (fetched live) explicitly recommends codifying this as a written ground rule and offers model phrasing: *"You can expect a response from a maintainer within 7 days. If you haven't heard anything by then, feel free to ping the thread."*

Node.js's collaborator pull-request guide (fetched live, `nodejs/node/blob/main/doc/contributing/pull-requests.md`) goes further with hard, numeric rules: *"For non-trivial changes, pull requests must be left open for at least 48 hours"* and approval requires *"at least two Node.js Collaborators (one collaborator approval is enough if the pull request has been open for more than 7 days)."* It also states an explicit mentoring principle worth borrowing verbatim in spirit: *"Every pull request from a new contributor is an opportunity to grow the community"* and reviewers should *"not assume that the submitter already knows how to add a test."*

**Recommendation:** Add a short "What to expect after opening a PR" subsection to `CONTRIBUTING.md` with a concrete number (even something modest and honest, e.g. "expect an initial response within N days; if you don't hear back, ping the PR") — this project is small enough that Node.js-scale numeric SLAs would overclaim, but *some* stated number is better than none, and this doc's own honesty bar ("measured, not asserted") argues for picking a number the maintainer can actually keep.

### 2.3 Local dev setup troubleshooting — absent here, present as a named pattern elsewhere

None of the four target docs, nor root `CONTRIBUTING.md`, has a troubleshooting section for local setup problems (MindForge's setup is comparatively low-risk — pure JS, zero native deps, sql.js/WASM — but `sdk/` and `mcp-server/` are separate TypeScript packages with their own install/build steps that can and do fail in ways worth documenting).

Node.js's `BUILDING.md` (fetched live) has a dedicated "Troubleshooting Unix and macOS builds" section in exactly the symptom → cause → fix shape worth copying, e.g.: *"Stale builds can sometimes result in `file not found` errors while building... This and some other problems can be resolved with `make distclean`"*, and for a specific compiler error, *"this is likely a memory issue and you should either provide more RAM or create swap space, or reduce the number of parallel build tasks."*

**Recommendation:** Add a short "Troubleshooting" section to root `CONTRIBUTING.md` (once consolidated per §1.1) covering the handful of setup failures this repo's own structure makes likely: Node version below 18, the three environment-dependent skipped tests (`browser.test.js`, `browser-daemon-auth-live.test.js`, `sre-integration.test.js` — already named in root `CONTRIBUTING.md`'s prose, just not framed as a troubleshooting entry), and `sdk`/`mcp-server` needing their own separate `npm install`.

### 2.4 Actual architecture diagram vs. prose-only — covered fully in §1.2 above (rust-analyzer / matklad's ARCHITECTURE.md pattern); not repeated here to avoid duplication.

---

## 3. Summary of recommendations, ranked by leverage

1. **(Highest leverage) Consolidate the two `CONTRIBUTING.md` files and fix `README.md`'s link.** This is a one-file decision with an immediate, measurable effect: right now the doc explicitly pointed at from the README, and read first by every new contributor, is the strictly worse of two files that already exist in this repo — the better one just needs a link. Grounded in the live `diff` between the two files and GitHub's own documented `.github` > root > `docs` precedence rule (docs.github.com).
2. **Fix `docs/release-checklist-guide.md`'s item count and missing Section G.** Grounded in three internally-contradictory counts (65 / 50 / 55) found by reading `production-checklist.md` and `.planning/RELEASE-CHECKLIST.md` directly, and tied to a version-drift incident this repo's own `CLAUDE.md` already documents.
3. **Rewrite `docs/architecture/README.md` around a real codemap, with at least one diagram, and a link to `CLAUDE.md`.** Grounded in matklad's ARCHITECTURE.md essay and rust-analyzer's `architecture.md` (both fetched live), applied against the concrete missing content (`bin/` subsystem breakdown, task lifecycle) that already exists in this repo's own `CLAUDE.md`.
4. **Add a `good first issue` label + one CONTRIBUTING sentence.** Grounded in the 2,838-repo `good-first-issue` GitHub topic and the `first-contributions` / `up-for-grabs.net` projects (all fetched live).
5. **State a PR review turnaround expectation.** Grounded in opensource.guide's model phrasing and Node.js's 48-hour/7-day rule (both fetched live) — pick a number this project's actual maintenance capacity can honor.
6. **Add a short local-dev troubleshooting section.** Grounded in Node.js `BUILDING.md`'s "Troubleshooting" section (fetched live), scoped to this repo's actual failure modes (Node version, the 3 env-gated test skips, SDK/MCP separate installs).
7. **(Minor) Point CI quickstart at the real `mindforge-quality`/`harness:compliance`/`release:ready` jobs**, and link `docs/contributing/CONTRIBUTING.md`'s "command reference" checklist item to `docs/reference/commands.md`.

None of these recommendations ask MindForge to claim a capability it doesn't have — every one is either fixing a documented internal contradiction (§1) or adding a doc-only convention (a label, a sentence, a troubleshooting list, a link) that doesn't touch or mischaracterize `bin/` runtime behavior at all.

---

## Appendix: primary-source verification performed in this session

- Read in full: `docs/architecture/README.md`, `docs/contributing/CONTRIBUTING.md`, `docs/ci-quickstart.md`, `docs/release-checklist-guide.md`, root `CONTRIBUTING.md`, root `SECURITY.md` (head), `.mindforge/production/production-checklist.md` (full), `.planning/RELEASE-CHECKLIST.md` (full), root `CLAUDE.md` (system-provided), `.github/workflows/mindforge-ci.yml` (head), `.github/ISSUE_TEMPLATE/config.yml`.
- Ran directly: `diff CONTRIBUTING.md docs/contributing/CONTRIBUTING.md`; `node tests/install.test.js` (86 passed, exit 0); existence checks for all 15 `SUITES` files named in `ci-quickstart.md`; `git remote -v` (confirmed `github.com/sairam0424/MindForge`); `git log` on `production-checklist.md`; row/section counts on both release-checklist files via `grep -c`/`grep -oE`.
- Fetched live (not from memory), each cited inline above: docs.github.com contribution-guidelines precedence page; opensource.guide "Best Practices"; `matklad.github.io` ARCHITECTURE.md essay; `rust-lang/rust-analyzer` `architecture.md`; `nodejs/node` `doc/contributing/pull-requests.md`; `nodejs/node` `BUILDING.md`; `github.com/topics/good-first-issue`. Three fetch attempts 404'd and are *not* cited above (`freeCodeCamp/CONTRIBUTING.md`, `vite.dev/guide/contributing.html`, `facebook/react/.github/CONTRIBUTING.md`, `docs.github.com` tags page) — omitted rather than guessed at.
