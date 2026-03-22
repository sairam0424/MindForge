# MindForge — Day 2 Review Prompt
# Branch: `feat/mindforge-wave-engine`
# Run this AFTER DAY2-IMPLEMENT.md is complete

---

## CONTEXT

You are performing a **Day 2 Architecture & Quality Review** of the MindForge
wave execution engine, audit system, compaction protocol, and four new commands.

Activate **`architect.md` + `qa-engineer.md` + `security-reviewer.md`** simultaneously.

Day 2 introduced complex orchestration logic described in Markdown. The risk
is not syntax errors — it is logical gaps: edge cases the engine specification
doesn't handle, race conditions in the parallel model, and audit entries that
could be missing for certain failure paths.

---

## REVIEW PASS 1 — Wave Execution Engine: Logic Completeness

### Dependency parser (`dependency-parser.md`)

Read the full file. Answer every question. Flag anything unclear as a finding.

- [ ] Does the parser handle an empty `<dependencies>` tag (no text content)?
- [ ] Does the parser handle a PLAN file with no `<dependencies>` tag at all?
- [ ] Does the parser handle a PLAN file with XML that has extra whitespace?
- [ ] Does the circular dependency check handle self-referencing plans (`"01"` depends on `"01"`)?
- [ ] Does the missing dependency check provide enough information to fix the problem?
  (It should say which PLAN file is missing, not just which ID)
- [ ] Does the file conflict check produce a concrete resolution (which wave each plan goes to)?
- [ ] Does the output DEPENDENCY-GRAPH file include wave assignments, or just the dependency list?
  (It must include wave assignments so execute-phase can read it without re-running the parser)

**Critical logic gap to check:**
What happens if two plans declare identical task names but different plan IDs?
Is there any risk of confusion or duplicate SUMMARY file creation?
Flag if not handled.

### Wave executor (`wave-executor.md`)

- [ ] Does the "before starting a wave" section specify what happens if a SUMMARY
  file exists but shows a failed status? (Previous wave failed and was partially cleaned up)
- [ ] Is the test-suite-run step between waves mandatory or optional?
  It must be mandatory — skip it and a later wave can build on broken foundations.
- [ ] What happens if the test suite itself does not exist yet (new project with no tests)?
  Is there a graceful path, or does the engine crash?
- [ ] Does the wave completion section clearly state that ALL plans in a wave must
  complete before the test run? (Not just "most" — all.)
- [ ] Is there a timeout concept? What if a subagent hangs indefinitely?
  (Even a mention that "after [N] minutes without a SUMMARY file, flag to user" would suffice)
- [ ] Does the WAVE-REPORT template include failures clearly, or only successes?
  Failure rows must be visually distinct and include the error.

**Specific question:**
The executor says "spawn a subagent." In practice with Claude Code and Antigravity,
this means using the Task tool or a specific subagent invocation pattern.
Does the spec describe how to invoke this for both Claude Code and Antigravity?
If not: flag as MAJOR — the executor will be interpreted differently by different runtimes.

### Context injector (`context-injector.md`)

- [ ] Is the context budget (30K tokens) validated before injection or just estimated?
  "Estimate" without validation means the budget can be silently exceeded.
- [ ] What happens when the ARCHITECTURE.md is very large and "relevant sections only"
  is ambiguous? Define what "relevant" means — at minimum, which headings to include.
- [ ] Does the injector specify how a subagent signals completion back to the orchestrator?
  The current spec says "report completion status" but does not define the mechanism.
  For Markdown-based agents: this is a file (SUMMARY.md). Confirm this is explicit.
- [ ] Does the injector template include the SKILL.md trigger keywords so the subagent
  can also load additional skills discovered during execution? Or is the skill set fixed
  at injection time?
- [ ] "Never inject STATE.md to subagents" — correct. But what about ROADMAP.md?
  Is ROADMAP.md ever needed by a subagent? Should it also be in the "never inject" list?

### Verification pipeline (`verification-pipeline.md`)

- [ ] Stage 2 (requirement traceability) uses `grep` to find implementations.
  What if the implementation uses a different term than the requirement text?
  Is there a fallback when grep finds nothing? (Many false negatives are possible)
- [ ] Stage 4 (security regression) activates the security-reviewer persona.
  Does it specify which files to scan — only new/modified files, or the entire codebase?
  Scanning the entire codebase is too slow. It should be diff-scoped.
- [ ] Does VERIFICATION.md clearly distinguish between "not found by grep" (⚠️ ambiguous)
  and "confirmed not implemented" (❌ certain)? These have different remediation urgencies.
- [ ] What is the escalation path if Stage 1 (tests) fails at verification time?
  Does the pipeline create fix plans automatically, or does it stop and wait?

---

## REVIEW PASS 2 — AUDIT System: Coverage Completeness

Read `AUDIT-SCHEMA.md`. Answer these questions:

### Event coverage gaps
Do the defined event types cover every significant agent action?
Check each of these against the schema — flag any that are missing:

- [ ] `phase_planned` — is this event defined?
- [ ] `task_started` — is this event defined?
- [ ] `task_completed` — is this event defined?
- [ ] `task_failed` — is this event defined?
- [ ] `security_finding` — is this event defined?
- [ ] `quality_gate_failed` — is this event defined?
- [ ] `context_compaction` — is this event defined?
- [ ] `phase_completed` — is this event defined?
- [ ] `decision_recorded` — is this event defined?
- [ ] `quick_task_completed` — is this event defined?
- [ ] `debug_completed` — is this event defined?
- [ ] `project_initialised` — is this event defined?

Missing events to add if not present:
- `uat_started` — when verify-phase begins human testing
- `uat_completed` — when UAT is signed off (or fails)
- `ship_started` — when ship command begins
- `ship_completed` — when a release PR is created
- `session_started` — when a new agent session begins (reads HANDOFF.json)

### AUDIT entry field consistency

- [ ] Does every event type include the universal fields (`id`, `timestamp`, `event`, `agent`, `session_id`)?
- [ ] Is `phase` consistently typed across all events? (number or null — never string "1")
- [ ] Is the `id` field described as UUID v4 with a clear example?
- [ ] Are there any events where `commit_sha` should be present but is not defined?

### Append-only enforcement

- [ ] Does the schema document state explicitly that no tooling or command should
  ever read + rewrite the entire file (which would lose other entries)?
- [ ] Is there guidance on what to do if AUDIT.jsonl becomes corrupted?
  (Even a brief "restore from git history" note is sufficient)
- [ ] Is there a note about AUDIT.jsonl file size growth over time?
  A 6-month-old busy project could have thousands of entries. Is there an archiving strategy?

---

## REVIEW PASS 3 — Compaction Protocol: Edge Case Coverage

Read `compaction-protocol.md` completely. Check these edge cases:

- [ ] **Compaction during a wave:** If compaction triggers mid-wave (while a subagent
  is running), what happens to the in-flight subagent? Does it complete first,
  or is it interrupted? The protocol must specify this.
  Recommendation: Always let the current subagent complete before compacting.

- [ ] **WIP commit quality:** The protocol creates WIP commits during compaction.
  But the branch may have a pre-commit hook (lint, test). Does the compaction commit
  bypass hooks? Should it? The protocol must address this.
  Recommendation: WIP commits at compaction points bypass pre-commit hooks
  (via `git commit --no-verify`) and are documented in STATE.md.

- [ ] **Session restart conflict:** A new session reads HANDOFF.json and its
  `next_task` says "continue Plan 03 from Step 4." But the developer has manually
  committed some changes since the compaction. Does the restart protocol check
  for this conflict?
  Recommendation: Add "run git log and compare against recent_commits field
  to detect any manual changes made between sessions."

- [ ] **HANDOFF.json staleness:** What if HANDOFF.json was written 3 weeks ago and
  much has changed since? Is there a staleness check?
  Recommendation: "If `updated_at` is more than 48 hours old, warn the user
  and confirm they want to continue from that state."

- [ ] **Multiple concurrent sessions:** Can two agents read the same HANDOFF.json
  and both try to continue? The protocol should note this risk.

---

## REVIEW PASS 4 — New Commands: UX and Logic

### `/mindforge:next` command

- [ ] **Decision tree completeness:** Does the decision tree handle every valid
  project state? Enumerate the states and check:
  - [ ] No PROJECT.md → init-project ✓ (in spec?)
  - [ ] PROJECT.md exists, no phases → plan-phase 1 ✓ (in spec?)
  - [ ] Plans exist, no SUMMARY files → execute-phase ✓ (in spec?)
  - [ ] All SUMMARY files exist, no VERIFICATION → verify-phase (automated) ✓?
  - [ ] VERIFICATION exists, no UAT → verify-phase (UAT) ✓?
  - [ ] UAT exists, not shipped → ship ✓?
  - [ ] All phases shipped → next milestone? ✓?

- [ ] Does "next" correctly advance phase numbers?
  (When Phase 1 is complete, does it move to Phase 2 or try to re-run Phase 1?)

- [ ] Does the HANDOFF.json check come BEFORE or AFTER the state detection tree?
  (HANDOFF.json represents a specific interrupted state — it should take priority
  over general state detection if it exists and is recent)

### `/mindforge:quick` command

- [ ] **Quick task numbering:** The spec uses a 3-digit sequential number (001, 002, ...).
  How is the next number determined? Read `.planning/quick/` and count existing directories.
  But what if two quick tasks are run in the same session? Will they both try to use "001"?
  The spec must address how to avoid directory name collisions.

- [ ] **Quick task scope enforcement:** The spec warns if a task seems "too big" but
  still allows proceeding. Is this the right policy? A large "quick" task without
  proper planning is risky. Consider: if the task would touch > 6 files, require
  `--force` flag to proceed, making the override deliberate.

- [ ] **Quick tasks and the phase state:** Does running a quick task update STATE.md?
  If the phase is "in progress" when a quick task runs, STATE.md should not change.
  If there is no active phase, STATE.md should note the quick task. Is this specified?

- [ ] **Flags without --full:** The spec says `--full` adds "full test suite + linting."
  But shouldn't linting always run even without `--full`? Committing unlinted code
  from a quick task is exactly the kind of regression that makes codebases messy.
  Recommendation: linting always runs. `--full` adds the test suite + security scan.

### `/mindforge:status` command

- [ ] **Phase progress calculation:** The spec calculates phase progress as
  "tasks with SUMMARY files / total tasks in phase."
  But a SUMMARY file exists for failed tasks too. Should failed tasks count as progress?
  They should not. The calculation should be: SUMMARY files with `Status: Completed ✅`.

- [ ] **Empty AUDIT.jsonl:** On a fresh project, AUDIT.jsonl is empty.
  Does the status command handle this gracefully? (No "Recent Activity" section,
  or "No activity logged yet" — either is fine, but it must not crash)

- [ ] **Missing VERIFICATION.md:** On a phase in progress, VERIFICATION.md does not
  exist yet. Does the requirements coverage section handle this gracefully?
  It should show "In progress" rather than crashing.

### `/mindforge:debug` command

- [ ] **Intake vs. diagnosis:** The intake step asks 4 questions. What if the user
  already provided all the information in their initial `/mindforge:debug` invocation?
  Does the command re-ask questions they already answered?
  Recommendation: Parse the initial description for answers before asking.

- [ ] **Debug Specialist persona activation:** The command says "load
  debug-specialist.md persona immediately." Does this mean the DEBUG command's
  entire execution is in that persona, even the intake and reporting steps?
  It should be — confirm this is unambiguous.

- [ ] **When the fix introduces a new bug:** The protocol says step 9 is "verify —
  the test from step 7 now passes, no regressions." But what if the fix passes the
  new test but breaks an unrelated test? The debug protocol must include a full
  test suite run after the fix, not just the newly-written test.

---

## REVIEW PASS 5 — Test Suite Quality

Read all three new test files.

### `tests/wave-engine.test.js`

- [ ] Does the test cover the 5-plan realistic diamond example? ✓ (should be there)
- [ ] Does the test cover a plan with a dependency on a non-existent plan ID?
  (Missing dependency detection — this should throw an error)
- [ ] Does the test cover the empty graph (zero plans)?
- [ ] Does the `findFileConflicts` test cover the case where 3+ plans touch the same file?
- [ ] Are there any tests for the wave executor's "before starting a wave" validation?
  (Checking that all previous wave plans have SUMMARY files with passing status)

Missing tests to add if not present:
```javascript
test('handles empty graph (no plans)', () => {
  const waves = groupIntoWaves({});
  assert.deepStrictEqual(waves, []);
});

test('detects self-referencing dependency', () => {
  const graph = { '01': { dependsOn: ['01'] } }; // depends on itself
  assert.strictEqual(hasCircularDependency(graph), true);
});

test('three-plan file conflict', () => {
  const plans = [
    { id: '01', files: ['src/shared.ts'] },
    { id: '02', files: ['src/shared.ts'] },
    { id: '03', files: ['src/shared.ts'] },
  ];
  const conflicts = findFileConflicts(plans);
  // At least 2 conflicts (01vs02, 01vs03 or 02vs03)
  assert.ok(conflicts.length >= 2);
});
```

### `tests/audit.test.js`

- [ ] Does it test that AUDIT.jsonl with mixed valid/invalid lines is rejected correctly?
- [ ] Does it test the `security_finding` event type specifically?
- [ ] Does it test that a UUID with wrong format is rejected?

### `tests/compaction.test.js`

- [ ] Does it test that compaction-protocol.md mentions WIP commits?
- [ ] Does it test that HANDOFF.json has a `recent_commits` field defined?
- [ ] Does it test the `in_progress` field structure in HANDOFF.json?

---

## REVIEW PASS 6 — Cross-Component Consistency

Check that all Day 2 components are internally consistent with each other AND with Day 1.

### Consistency checks (flag any mismatch as MAJOR)

- [ ] `execute-phase.md` references the wave engine — do the referenced file paths match actual files?
  - `.mindforge/engine/dependency-parser.md` ← exists?
  - `.mindforge/engine/wave-executor.md` ← exists?
  - `.mindforge/engine/context-injector.md` ← exists?
  - `.mindforge/engine/verification-pipeline.md` ← exists?

- [ ] `compaction-protocol.md` says to write HANDOFF.json with a specific schema.
  Does the schema match the HANDOFF.json template in `init-project.md`?
  Both must have identical field sets.

- [ ] `AUDIT-SCHEMA.md` defines events. Does `execute-phase.md` write all the events
  it is supposed to? Cross-check:
  - [ ] `phase_execution_started` at step 2 of execute-phase
  - [ ] `task_started` at subagent spawn time
  - [ ] `task_completed` after each task
  - [ ] `task_failed` on verify failure
  - [ ] `quality_gate_failed` on test suite failure
  - [ ] `phase_execution_completed` at phase end

- [ ] CLAUDE.md (updated in Task 10) — does it reference the wave engine correctly?
  Check that the file paths it references for the engine exist.

- [ ] `next.md` decision tree — does "plans exist but no SUMMARY files → execute-phase"
  correctly handle the case where some SUMMARY files exist (partial execution)?
  This means a phase was partially executed. `next` should resume at the first plan
  without a SUMMARY, not restart the entire phase.

---

## REVIEW PASS 7 — Security Review

Activate `security-reviewer.md` persona for this pass.

### Audit log security
- [ ] Is there any code path where an agent action could be taken WITHOUT writing
  an audit entry? Map every AUDIT write in execute-phase.md against every possible
  execution path. Any unaudited path is a governance gap.
- [ ] Can the AUDIT.jsonl file be written to by anything other than the MindForge agent?
  (In a CI environment, a compromised script could inject fake audit entries)
  Note this risk if not already documented.
- [ ] Could sensitive data end up in an AUDIT entry?
  Check `task_started` — it includes `files_in_scope`. Could a file path expose
  sensitive directory structure (e.g., `src/models/ssn-lookup.ts`)? Low risk but note.
- [ ] The `decision_recorded` event includes `rationale`. Could a developer accidentally
  paste credentials into a rationale? (e.g., "Used connection string: postgres://user:pass@...")
  This is a documentation risk. Add a note to the schema.

### Context injection security
- [ ] The context injector injects SECURITY.md into every subagent.
  But SECURITY.md is a template with placeholders on Day 1.
  What if the user hasn't filled it in? Does an empty/template SECURITY.md mislead
  the subagent into thinking security requirements are defined when they aren't?
  Recommendation: Add a check in the context injector — if SECURITY.md contains
  placeholder text, warn the user to fill it in.

- [ ] The context injector injects ADR files referenced in plan `<context>` fields.
  Could a malicious plan file reference `../../../etc/passwd` as an ADR path?
  (This is a path traversal risk in the reference resolution)
  Recommendation: Validate that all referenced files are within the project directory.

### Quick task security
- [ ] Does `quick.md` include a security check when the `--full` flag is used?
  What about when the task is clearly security-sensitive (keywords: auth, password,
  token, payment)? Should the security-review SKILL auto-trigger for quick tasks too?
  It should. Add if missing.

---

## REVIEW OUTPUT FORMAT

```
## Finding [N] — [Severity]: [Short title]

**File:** [path/to/file.md, line N if identifiable]
**Category:** [Wave Engine / Audit / Compaction / Commands / Tests / Consistency / Security]
**Severity:** BLOCKING | MAJOR | MINOR | SUGGESTION

**Issue:**
[What is wrong or missing. Specific.]

**Impact:**
[What breaks if unfixed.]

**Recommendation:**
[Exact change to make.]
```

---

## REVIEW SUMMARY TABLE

```
## Day 2 Review Summary

| Category      | BLOCKING | MAJOR | MINOR | SUGGESTION |
|---------------|----------|-------|-------|------------|
| Wave Engine   |          |       |       |            |
| Audit System  |          |       |       |            |
| Compaction    |          |       |       |            |
| Commands      |          |       |       |            |
| Test Suite    |          |       |       |            |
| Consistency   |          |       |       |            |
| Security      |          |       |       |            |
| **TOTAL**     |          |       |       |            |

## Verdict
[ ] ✅ APPROVED — Proceed to DAY2-HARDEN.md
[ ] ⚠️  APPROVED WITH CONDITIONS — Fix [N] major findings first
[ ] ❌ NOT APPROVED — [N] blocking findings. Fix and re-review.

## Estimated fix time
[Realistic estimate]
```

---

**Branch:** `feat/mindforge-wave-engine`
**All BLOCKING items resolved → proceed to DAY2-HARDEN.md**
