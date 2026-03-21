# MindForge — Day 5 Review Prompt
# Branch: `feat/mindforge-intelligence-layer`
# Run this AFTER DAY5-IMPLEMENT.md is complete

---

## CONTEXT

You are performing a **Day 5 Architecture & Intelligence Review** of the
MindForge intelligence layer: health engine, smart compaction, difficulty scorer,
anti-pattern detector, skill gap analyser, team profile system, metrics engine,
MINDFORGE.md, and the interactive setup wizard.

Activate **`architect.md` + `qa-engineer.md`** simultaneously.

Day 5 risk profile:

- **Observability completeness** — does the health engine actually catch the
  failure modes that matter? Missing checks are invisible gaps.
- **Metric accuracy** — are the scoring formulas producing meaningful signals
  or misleading ones?
- **Wizard reliability** — environment detection failures produce silent wrong
  installs. Every detection path must handle the fallback gracefully.
- **Intelligence feedback loops** — do the smart compaction, difficulty scorer,
  and retrospective outputs actually feed into improved future behaviour?

---

## REVIEW PASS 1 — Health Engine: Coverage Completeness

Read `health-engine.md` completely.

### Category 1 — Installation integrity
- [ ] The required files list has 47+ items — verify it includes Day 5 additions:
  `health.md`, `retrospective.md`, `profile-team.md`, `metrics.md` in commands.
  `health-engine.md`, `difficulty-scorer.md`, `antipattern-detector.md`,
  `skill-gap-analyser.md`, `smart-compaction.md` in intelligence.
  If not updated: these will silently pass the integrity check even when missing.

- [ ] MINDFORGE.md is not in the required files list.
  Should it be? MINDFORGE.md is optional (projects may not have one) — so it
  should not be in required files. But its health (when present) should be checked:
  does it have valid syntax? Does it reference non-existent skills or personas?
  Add: "If MINDFORGE.md exists: validate it contains no references to
  unknown skills (check against MANIFEST.md) or invalid model names."

### Category 5 — State consistency
- [ ] The check "does VERIFICATION.md exist if phase is 'complete'?" is correct.
  But what about phases that are "in progress"? Should there be a consistency check:
  "if phase N has SUMMARY files but no VERIFICATION.md, and STATE.md says 'complete':
  this is the most common consistency failure — state was updated before verification ran."
  This is already covered — confirm it is explicit. If not: add it.

- [ ] The check "no WIP commits on main branch" uses `git log` to look for WIP commits.
  But how does it detect them? "WIP" in the commit message?
  What about commits prefixed with `chore(day5):` that are technically scaffolding?
  Clarify: only flag commits where the message starts with "wip" (case-insensitive),
  not all chore commits.

### Category 7 — Security configuration
- [ ] The secret scan covers `.planning/` and `.mindforge/` directories.
  But what about the root directory? `MINDFORGE.md` is in root.
  A developer could accidentally put a token in `MINDFORGE.md`.
  Add root-level scan: check MINDFORGE.md, `.env.example`, `*.config.js` in root.

### Auto-repair protocol
- [ ] "Remove invalid lines" from AUDIT.jsonl is listed as auto-repairable.
  This is dangerous — removing audit entries, even invalid ones, changes the
  immutable record. Instead: isolate invalid lines to a separate file
  `.planning/AUDIT.jsonl.corrupt` and write a correction entry documenting
  the isolation. Never delete from AUDIT.jsonl.

---

## REVIEW PASS 2 — Smart Compaction: Practical Completeness

Read `smart-compaction.md` completely.

### Compaction level thresholds
- [ ] Level 1 is triggered at "context at 70-79%." But compaction-protocol.md
  (Day 2) triggers at 70%. Are these the same trigger?
  There is a potential conflict: Day 2 protocol says "trigger at 70%" and
  Day 5 says "Level 1 at 70-79%, Level 2 at 80-89%, Level 3 at 90%+."
  Clarify: the Day 2 trigger at 70% should now invoke the Day 5 Level 1 protocol.
  The levels escalate based on how much work has been done this session —
  not just on context percentage.
  Add: "Level selection is based on BOTH context percentage AND session depth:
  Light session (< 5 tasks completed): Level 1 regardless of context %.
  Moderate session (5-10 tasks): Level 2 at 80%+.
  Deep session (10+ tasks): Level 2 at 75%+."

### Block D — Implicit knowledge
- [ ] The implicit knowledge block captures "library quirks encountered."
  But how does the agent know what counts as a "quirk" vs. standard behaviour?
  Add: "An implicit knowledge item qualifies as a 'quirk' if:
  a) It contradicts what the documentation or TOOLS.md says should happen, OR
  b) It would not be obvious to a new agent reading only the PLAN and persona files."

### Session restart conflict check
- [ ] The restart protocol says "if `in_progress.current_state` indicates an
  inconsistency: ask the user to resolve it BEFORE executing any other steps."
  But what if the user says "show me the file first"?
  The agent needs to read the file and present the relevant sections,
  not just show the file path. Add: "Read and display the first 50 lines of
  the inconsistent file so the user can assess without switching context."

---

## REVIEW PASS 3 — Difficulty Scorer: Formula Accuracy

Read `difficulty-scorer.md` completely.

### Technical complexity signal detection
- [ ] The signal detection uses `grep`-style keyword matching on the phase description.
  The keyword "migration" appears in both "database migration" (Tier 3 risk)
  and "migrating to a new framework" (different risk profile).
  Context matters. Add: "When a signal keyword is detected, verify the context:
  'migration' near 'database' or 'schema' → technical complexity 4.
  'migration' near 'code' or 'framework' → technical complexity 3."

### Risk amplifiers
- [ ] "Previous incidents in this area — check AUDIT log for past failures."
  How does the scorer check AUDIT.jsonl for relevant past failures?
  The AUDIT log doesn't index by "area" — it has phase numbers.
  Add: "Check AUDIT.jsonl for `task_failed` events with file paths that overlap
  with the current phase's expected files (from REQUIREMENTS.md or CONTEXT.md).
  Also check for `security_finding` events in phases that touched similar
  tech areas (auth, payments, database)."

### Composite formula
- [ ] The formula uses weights: Technical × 0.35, Risk × 0.30, Ambiguity × 0.20,
  Dependencies × 0.15. These sum to 1.00 ✅.
  But: the maximum possible composite score is 5.0 (all dimensions at 5).
  The minimum is 1.0.
  The task count recommendations go up to "Hard: 10-15 tasks."
  What happens for scores > 4.5 consistently? "Consider splitting the phase."
  But how does the agent help the user split it?
  Add: "If composite > 4.5: recommend a phase split. Suggest 2 sub-phases:
  Phase N-A (lowest-risk components), Phase N-B (highest-risk components).
  Offer to help design the split: /mindforge:discuss-phase [N] --split"

---

## REVIEW PASS 4 — Anti-Pattern Detector: False Positive Risk

Read `antipattern-detector.md` completely.

### C01 — Type coercion in auth checks
- [ ] The detection pattern is `== null|== undefined|== false|== 0`.
  This will produce false positives in test files:
  ```javascript
  // This is fine in tests:
  expect(result).toBe(null)
  assert.equal(count, 0)
  ```
  The detector should exclude test files from this pattern:
  Add: "For C01: exclude files matching `*.test.ts`, `*.spec.ts`, `tests/**`."

### B03 — Unbounded queries
- [ ] The pattern `grep -rn "findMany\(" | grep -v "take:\|limit:"` will
  produce a false positive for queries that use cursor-based pagination:
  ```javascript
  // This is actually paginated — but the grep wouldn't know:
  await db.posts.findMany({ where: { cursor... }, orderBy: ... })
  ```
  Cursor pagination does NOT use `take:` on every call.
  Add: "B03 false positive exception: queries using cursor-based pagination
  (contains `cursor:` parameter) are exempt from the unbounded query check."

### D01 — God Object detection
- [ ] "wc -l" counts ALL lines including comments and blank lines.
  A 500-line file with 200 lines of JSDoc comments is not a God Object.
  Better heuristic: count non-comment, non-blank lines.
  Add: "For D01: count executable lines only.
  `grep -v '^\s*\/\/' | grep -v '^\s*\*' | grep -v '^\s*$'`
  Apply 500-line threshold to this filtered count."

---

## REVIEW PASS 5 — MINDFORGE.md: Configuration Validation

Read `MINDFORGE.md` completely.

### Model name references
- [ ] MINDFORGE.md uses model names: `claude-opus-4-5`, `claude-sonnet-4-5`,
  `claude-haiku-4-5`. These must be validated against actual available models.
  For a framework document created in March 2026, these appear accurate.
  But add a note: "Model names are validated against Claude API model list.
  If a model is unavailable, fall back to `inherit` and warn the user."

### ADDITIONAL_AGENT_INSTRUCTIONS format
- [ ] The heredoc-style `ADDITIONAL_AGENT_INSTRUCTIONS="""..."""` in a Markdown
  file is not a standard format. An agent reading this file needs a clear
  parsing rule.
  Add: "Parsing rule: content between triple-quote delimiters (`"""`) is treated
  as a verbatim multi-line string value. Everything between the first `"""` and
  the next `"""` is the value."

### Conflict with CLAUDE.md
- [ ] MINDFORGE.md overrides defaults from CLAUDE.md. But which defaults can
  be overridden and which are fixed? For example:
  - Can MINDFORGE.md disable all security checks? It should not be able to.
  - Can MINDFORGE.md lower `MIN_TEST_COVERAGE_PCT` to 0%? It should not.
  Add: "Non-overridable CLAUDE.md rules:
  - Security auto-trigger (cannot be disabled via MINDFORGE.md)
  - Plan-first rule (cannot be disabled)
  - Secret detection gate (cannot be disabled)
  - AUDIT writing requirement (cannot be disabled)
  These are governance primitives — not configurable."

---

## REVIEW PASS 6 — Setup Wizard: Reliability

Read `setup-wizard.js`, `environment-detector.js`, `config-generator.js`.

### Error handling
- [ ] `createReadline()` creates an interface but if stdin is not a TTY
  (running in a script, CI environment), readline may behave unexpectedly.
  The wizard has an `IS_INTERACTIVE` check — but it only checks for flags.
  Add: "Also check `process.stdin.isTTY` — if false, fall back to non-interactive
  mode regardless of flags: `IS_INTERACTIVE = IS_INTERACTIVE && process.stdin.isTTY`."

### Environment detector — project type detection
- [ ] The detector checks `package.json` for `next` or `react` in dependencies.
  But what if dependencies are in `devDependencies`? Next.js is often in
  `dependencies` but React could be in either. Add: "Check both `dependencies`
  and `devDependencies` for framework detection."

### Config generator — write safety
- [ ] `writeIntegrationsConfig` reads the existing file and replaces placeholder
  strings. But what if the file was already partially configured?
  (e.g., JIRA_BASE_URL was set but JIRA_PROJECT_KEY was not)
  The replace might fail silently if the placeholder string was already replaced.
  Add: "Before writing: check if the target placeholder exists.
  If not (already replaced): skip the replacement and log: 'JIRA_BASE_URL
  already configured — not overwriting.'"

### Wizard output — credential guidance timing
- [ ] The wizard prints credential guidance (`ℹ️  Set JIRA_API_TOKEN`) during
  the feature configuration step, interspersed with questions.
  This is easy to miss in a fast-scrolling terminal.
  Better: collect all credential guidance and print it together at the end.
  Add: "Collect all credential guidance items. Print them all together
  in a 'Next steps: configure credentials' section after all questions."

---

## REVIEW PASS 7 — Metrics: Signal Quality

Read `METRICS-SCHEMA.md` and `quality-tracker.md`.

### Session quality score
- [ ] The formula: `base 100 - 15 per task_failed - 10 per gate_failed`.
  Maximum score when everything fails (10 tasks failed + 5 gates): 100 - 150 - 50 = -100, clamped to 0.
  The clamping is correct. But: "a session with 1 task failed scores 85, same
  as a session with 8/10 tasks completed." This conflates different scenarios.
  The current formula rewards sessions where MOST tasks succeeded, even if
  some failed. That is acceptable behaviour — confirm it is intentional.

- [ ] The bonus `+5 if zero quality gate failures` AND `+5 if zero security findings`
  means a perfect session scores `110` before clamping to `100`.
  This means all sessions without failures score exactly `100` — there is no
  differentiation between "zero failures, zero skills loaded" and
  "zero failures, 5 skills loaded, complex phase."
  Consider: tracking the score without clamping as a raw score alongside the
  clamped display score, to allow trend analysis above 100.

### Compaction quality metric
- [ ] `next_session_continuation_success` is described as "manual assessment, defaults null."
  A metric that is never populated is noise in the metrics file.
  Either: make it auto-detectable (if the next session successfully continued
  without re-doing work, it can be inferred from AUDIT: no tasks were re-done),
  or remove it until there is a clear way to populate it.

---

## REVIEW PASS 8 — Test Suite Quality

Read `tests/intelligence.test.js` and `tests/metrics.test.js`.

### Missing intelligence tests
- [ ] No test for the health engine's CLAUDE.md parity check
  (verify that the parity check function detects when files differ)
- [ ] No test for anti-pattern false positive exclusion (test files)
- [ ] No test that MINDFORGE.md lists non-overridable rules
- [ ] No test for wizard's `IS_INTERACTIVE` stdin detection logic
- [ ] No test for config-generator's "already configured" idempotency

### Metrics test gaps
- [ ] No test that metrics files are valid JSONL format
- [ ] No test that compaction-quality.jsonl schema matches the spec
- [ ] No test that skill-usage.jsonl has the `trigger_type` field

### Session quality score — edge case
- [ ] The test "perfect session scores 100 (5 bonus)" has a comment `// Actually let's check clamping: Math.min(100, 110) = 100`.
  The test as written is checking a score of `110` which is clamped to `100`.
  The test should verify the clamped value: `assert.strictEqual(s, 100)`.
  Verify the test implementation is correct in the actual file.

---

## REVIEW OUTPUT FORMAT

```
## Finding [N] — [Severity]: [Short title]

**File:** [path]
**Category:** [Health / Compaction / Difficulty / AntiPattern / MINDFORGE / Wizard / Metrics / Tests]
**Severity:** BLOCKING | MAJOR | MINOR | SUGGESTION

**Issue:** [Specific]
**Impact:** [What fails if unfixed]
**Recommendation:** [Exact change]
```

---

## REVIEW SUMMARY TABLE

```
## Day 5 Review Summary

| Category     | BLOCKING | MAJOR | MINOR | SUGGESTION |
|--------------|----------|-------|-------|------------|
| Health       |          |       |       |            |
| Compaction   |          |       |       |            |
| Difficulty   |          |       |       |            |
| AntiPattern  |          |       |       |            |
| MINDFORGE.md |          |       |       |            |
| Wizard       |          |       |       |            |
| Metrics      |          |       |       |            |
| Tests        |          |       |       |            |
| **TOTAL**    |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to DAY5-HARDEN.md
[ ] ⚠️  APPROVED WITH CONDITIONS — Fix [N] major findings first
[ ] ❌ NOT APPROVED — [N] blocking findings. Fix and re-review.
```

---

**Branch:** `feat/mindforge-intelligence-layer`
**All BLOCKING items resolved → proceed to DAY5-HARDEN.md**
