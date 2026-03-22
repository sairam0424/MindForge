# MindForge — Day 2 Hardening Prompt
# Branch: `feat/mindforge-wave-engine`
# Run this AFTER DAY2-REVIEW.md is APPROVED

---

## CONTEXT

You are performing **Day 2 Hardening** of the MindForge wave execution engine,
audit pipeline, compaction protocol, and four new commands.

Activate the **`architect.md`** persona. Think in failure modes and edge cases.
The goal is not new features — it is making every Day 2 component production-grade:
resilient, unambiguous, and impossible to misuse.

Confirm all review findings (BLOCKING + MAJOR) are fixed before starting:
```bash
git log --oneline | head -20   # look for review fix commits
node tests/install.test.js && node tests/wave-engine.test.js &&
node tests/audit.test.js && node tests/compaction.test.js
# all must pass
```

---

## HARDEN 1 — Fix all review findings

For every BLOCKING and MAJOR finding from DAY2-REVIEW.md:
1. Read the finding and recommendation precisely
2. Make exactly the change described
3. Commit: `fix(day2-review): [finding title]`

Do not combine multiple findings into one commit — one fix per commit.

After all fixes, re-run the full test suite to confirm no regressions.

---

## HARDEN 2 — Wave executor: add explicit failure handling paths

The current wave executor specifies the happy path well. Harden every failure path.

Add a **"Failure Handling" section** to `wave-executor.md`:

```markdown
## Failure handling

### Task verify failure (mid-wave)

When a task's `<verify>` step fails:

1. **Stop the task immediately.** Do not attempt a second run automatically.
2. **Write the SUMMARY file** with status `Failed ❌` and the full verify output.
3. **Write a `task_failed` AUDIT entry** (see AUDIT-SCHEMA.md).
4. **Stop the entire wave.** Other tasks in this wave that have not yet started:
   do not start them. Tasks already running in parallel: let them complete
   naturally, but do not start the next wave regardless of their outcome.
5. **Report to the orchestrator:**
   ```
   ━━━ Wave [W] STOPPED — Task Failure ━━━━━━━━━━━━━━━━━━━━━━
   Failed task : Plan [N]-[M]: [task name]
   Verify output:
   [full verify output]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
6. **Ask the user:**
   ```
   Options:
     1. Spawn debug agent to diagnose the failure
     2. Show me the failing code and I'll fix it manually
     3. Skip this task and continue the wave (not recommended)
     4. Abort the entire phase
   
   Choose 1, 2, 3, or 4:
   ```
7. If user chooses 1: invoke `/mindforge:debug` with the failure context pre-loaded.
8. If user chooses 3 (skip): write a `quality_gate_failed` AUDIT entry with
   `"gate": "verify_skipped_by_user"` and continue. This is tracked.
9. If user chooses 4: update STATE.md with `status: Phase [N] aborted` and stop.

### Test suite failure (between waves)

When the test suite fails after a wave completes:

1. **Identify the failing tests** — capture the full test output.
2. **Identify the likely causal commit:**
   ```bash
   git log --oneline -[number of tasks in this wave]
   ```
3. **Report specifically:**
   ```
   ━━━ Test Suite Failure After Wave [W] ━━━━━━━━━━━━━━━━━━━━━
   [N] tests failing.
   
   Likely cause: [commit sha] — [commit message]
   Failing tests:
     - [test name]: [error]
     - [test name]: [error]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```
4. **Write a `quality_gate_failed` AUDIT entry.**
5. **Do not start the next wave.** This is absolute — no exceptions.
6. **Ask the user:**
   ```
   Options:
     1. Debug the failing tests now
     2. Revert the last wave's commits and re-plan
     3. I'll fix the tests manually — notify me when done
   ```

### Subagent hang (no SUMMARY file after expected duration)

When a subagent has been running for an unexpectedly long time:
(Heuristic: if a task with < 5 files has no SUMMARY after 30 minutes of session time)

1. Alert the user: "Task [N]-[M] appears to be taking longer than expected.
   Check if the subagent is still running or has stalled."
2. Provide the option to: wait longer | restart the task | skip the task.
3. Never silently let a wave stall indefinitely.

### Missing PLAN file detected at runtime

When execute-phase discovers a PLAN file referenced in the dependency graph is missing:

1. Stop immediately.
2. Report: "PLAN-[N]-[M].md was referenced but does not exist.
   Run /mindforge:plan-phase [N] to regenerate the missing plan."
3. Do not continue with partial plan execution.
```

**Commit:**
```bash
git add .mindforge/engine/wave-executor.md
git commit -m "harden(wave-engine): add explicit failure handling for all failure paths"
```

---

## HARDEN 3 — Dependency parser: add self-reference and empty-graph guards

Add these cases to `dependency-parser.md` under Step 3 (Validate the graph):

```markdown
### Additional validation cases

**Self-referencing plan:**
If any plan lists its own ID in `<dependencies>` (e.g., Plan 03 depends on 03):
```
Error: Plan [N]-[M] declares a dependency on itself.
This is impossible to satisfy. Remove [M] from its own <dependencies> list.
```

**Empty plan directory:**
If the phase directory contains zero PLAN files:
```
Error: No PLAN files found in .planning/phases/[N]/.
Run /mindforge:plan-phase [N] to create plans before executing.
```
Do not return an empty graph — return this error explicitly.

**Dependency on a completed phase's plans:**
If a PLAN in Phase 3 declares a dependency on a PLAN in Phase 2:
This is valid only if Phase 2 is complete (all SuMMARY files exist and passing).
If Phase 2 is not complete: flag as a warning, not an error.
Allow execution to proceed but note the cross-phase dependency.

**All plans in the same wave touch the same file:**
If all plans in a computed wave touch at least one common file, the wave
cannot run in parallel without conflicts. In this case:
Sort the plans into sequential execution order within the wave.
Notify: "Wave [W]: file conflicts detected — executing plans sequentially."
This is suboptimal but safe. The user should redesign plans to avoid this.
```

**Commit:**
```bash
git add .mindforge/engine/dependency-parser.md
git commit -m "harden(dependency-parser): add self-reference, empty graph, and cross-phase guards"
```

---

## HARDEN 4 — Context injector: add path traversal guard and SECURITY.md validation

Add to `context-injector.md`:

```markdown
## Security guards (run before building any context package)

### Path traversal guard
Before reading any file referenced in a PLAN's `<context>` field (ADR files,
skill paths, or any other referenced file):

1. Resolve the file path to an absolute path.
2. Verify the absolute path starts with the project root directory.
3. If it does not: STOP. Report:
   "Security: Plan [N]-[M] references a file outside the project root: [path]
    This may indicate a path traversal attempt. Review the plan before continuing."
4. Never read files outside the project root directory, regardless of the reference.

### SECURITY.md validation
Before injecting SECURITY.md into a subagent context:

1. Check if SECURITY.md contains placeholder text.
   Look for any of: `[ORG NAME]`, `[specify]`, `[your-org]`, `TODO`, `[placeholder]`
2. If placeholder text is found: warn the user:
   "Warning: .mindforge/org/SECURITY.md still contains placeholder text.
    Subagents will receive incomplete security guidance.
    Fill in SECURITY.md before running phases with security-sensitive tasks."
3. Allow the user to proceed or fill in SECURITY.md first.
4. Log a AUDIT entry: `{"event":"security_config_warning","detail":"SECURITY.md has placeholder text"}`

### Context size enforcement
Before injecting context to a subagent:

1. Estimate total token count (rough estimate: characters / 4)
2. If estimated tokens > 30,000:
   a. Log which files are contributing most
   b. Try summarising ARCHITECTURE.md to relevant sections only
   c. If still > 30,000 after summarisation: warn the user and ask to proceed
3. Never silently inject oversized context — the budget exists for a reason.
```

**Commit:**
```bash
git add .mindforge/engine/context-injector.md
git commit -m "harden(context-injector): add path traversal guard, SECURITY.md validation, size enforcement"
```

---

## HARDEN 5 — Compaction protocol: add the missing edge cases

Add to `compaction-protocol.md`:

```markdown
## Edge case handling

### Compaction during active wave execution
If compaction is triggered while a wave is executing (subagents are running):

1. **Do not interrupt running subagents.** Let them complete their current task.
2. When the running subagent writes its SUMMARY file: trigger compaction immediately
   after (before starting the next subagent in the wave or the next wave).
3. Never compact mid-task. Always compact at task boundaries.

### WIP commit and pre-commit hooks
Compaction may need to commit uncommitted work-in-progress. If pre-commit hooks
(lint, type check, test) are configured, a WIP commit might fail these hooks.

Resolution:
```bash
git add -A
git commit --no-verify -m "wip(phase-[N]-plan-[M]): compaction checkpoint — [description]"
```

Use `--no-verify` for compaction commits ONLY. Document this in STATE.md:
```
[timestamp]: WIP commit at compaction point (hooks bypassed per compaction protocol)
```
This is acceptable and tracked. The bypassed hooks will be enforced on the
next real task commit.

### Staleness detection
When a new session reads HANDOFF.json:

1. Check `updated_at` timestamp.
2. If older than 48 hours: warn the user:
   "HANDOFF.json is [N] days old. Context may have changed significantly.
    Recent git history will be compared against recorded commits."
3. Compare `recent_commits` in HANDOFF.json against `git log`:
   - If commits match: safe to continue from HANDOFF state.
   - If git log shows commits not in HANDOFF: "These commits happened since
     the last session was saved. Review them before continuing:"
     [list the new commits]
4. Let the user decide: continue from HANDOFF state | run fresh state detection.

### Multiple session risk
HANDOFF.json is a shared file. If two agents read it simultaneously:

1. Note: this risk exists but is mitigated by the single-user nature of
   Claude Code and Antigravity sessions.
2. In a team environment where multiple engineers might share the same repo
   and both run MindForge: the last writer wins for HANDOFF.json.
3. Mitigation: each team member should use their own feature branch.
   HANDOFF.json on different branches does not conflict.
4. Future: Day 4 will introduce per-developer HANDOFF.json naming for teams.

### Compaction when near 85%+ context
If compaction was not triggered at 70% and context is now at 85%+:

1. This is an error condition — the 70% trigger was missed.
2. Emergency compact immediately: skip the "summarise last 20 tool calls" step
   (there may not be enough context to do it well).
3. Write HANDOFF.json from whatever state is available.
4. Restart immediately with the minimum viable context.
5. Add an AUDIT entry with `"event":"compaction_late"` to flag this for review.
```

**Commit:**
```bash
git add .mindforge/engine/compaction-protocol.md
git commit -m "harden(compaction): add wave-active handling, WIP commit protocol, staleness detection"
```

---

## HARDEN 6 — Command hardening: close the gaps found in review

### Update `/mindforge:next`

Add to the command file:

```markdown
## HANDOFF.json priority rule
Check HANDOFF.json BEFORE running the decision tree.

If HANDOFF.json exists AND `updated_at` is within 48 hours AND `next_task` is not null:
Present the HANDOFF state first. Let the user choose to continue from it.
Only run the decision tree if the user says no or HANDOFF.json is stale.

## Partial phase execution handling
In the decision tree step "Do SUMMARY files exist for all plans?":

Do not treat this as binary. Check individually:

```
PLAN-[N]-01.md exists?          SUMMARY-[N]-01.md exists?
PLAN-[N]-02.md exists?          SUMMARY-[N]-02.md exists?
PLAN-[N]-03.md exists?          SUMMARY-[N]-03.md exists?
```

If some SUMMARY files exist and some don't: this is a partially-executed phase.
Report: "Phase [N] is partially executed: plans [X, Y] are done, [Z] is not."
Ask: "Resume execution from Plan [Z]? (yes/no)"
Do not restart the entire phase — resume from the first missing SUMMARY.
```

### Update `/mindforge:quick`

Add to the command file:

```markdown
## Sequential quick task numbering
To determine the next quick task number:
1. List `.planning/quick/` directory.
2. Find all directories matching `[0-9][0-9][0-9]-*`.
3. Extract the numeric prefix, find the maximum, and add 1.
4. If `.planning/quick/` does not exist: create it. Start at 001.
5. Example: existing dirs `001-fix-login`, `002-update-readme` → next is `003`.

This is deterministic regardless of session.

## Auto-trigger security review on quick tasks
Before executing ANY quick task, check the task description and files for security keywords:
[auth, authentication, login, password, token, JWT, session, payment, PII, upload, credential, secret, key]

If any keyword matches: automatically load `security-review/SKILL.md` and activate
`security-reviewer.md` persona for the implementation step.
This applies even without the `--full` flag.
Security review is never optional on security-sensitive quick tasks.

## Linting always runs
Regardless of flags, after every quick task execution:
1. Run the project's linter (from CONVENTIONS.md — check which linter applies)
2. If lint errors found: fix them before committing.
3. Linting is not part of `--full` — it is always part of quick.
The `--full` flag adds: full test suite + type checking + security scan.
```

### Update `/mindforge:status`

Add to the command file:

```markdown
## Handling empty/missing data sources gracefully

### Empty AUDIT.jsonl
If AUDIT.jsonl is empty or does not exist:
```
Recent Activity
───────────────────────────────────────────────────────
  No activity logged yet. Activity will appear here
  after running /mindforge:execute-phase.
```
Never crash on empty AUDIT.jsonl.

### Missing VERIFICATION.md (phase in progress)
For any phase without a VERIFICATION.md:
Show progress bar based on SUMMARY files only.
Label it "In progress" not "0% verified".

### Phase progress calculation (correction from review)
Count ONLY SUMMARY files that contain `Status: Completed ✅` or `Status\nCompleted`.
Do NOT count SUMMARY files with `Status: Failed ❌`.
Failed tasks are not progress.

### Status command performance
The status command reads many files. For large projects:
1. Read AUDIT.jsonl for "recent activity" but only the LAST 500 bytes
   (recent entries are at the end — no need to read the entire file)
   ```
   tail -c 500 .planning/AUDIT.jsonl | [parse last complete JSON objects]
   ```
2. For REQUIREMENTS.md requirement counting: count lines starting with `| FR-`
   rather than parsing the full document.
These optimisations keep the status command fast even on mature projects.
```

**Commit:**
```bash
git add .claude/commands/mindforge/next.md .agent/mindforge/next.md \
        .claude/commands/mindforge/quick.md .agent/mindforge/quick.md \
        .claude/commands/mindforge/status.md .agent/mindforge/status.md
git commit -m "harden(commands): close logic gaps in next, quick, and status commands"
```

---

## HARDEN 7 — Add missing test coverage

Add the missing tests identified in the review.

### Add to `tests/wave-engine.test.js`:

```javascript
// Add these tests after the existing ones:

console.log('\nAdditional edge cases:');

test('handles empty graph (zero plans)', () => {
  const waves = groupIntoWaves({});
  assert.deepStrictEqual(waves, []);
});

test('detects self-referencing dependency (plan depends on itself)', () => {
  const graph = { '01': { dependsOn: ['01'] } };
  assert.strictEqual(hasCircularDependency(graph), true);
});

test('three plans all touching the same file — all conflict', () => {
  const plans = [
    { id: '01', files: ['src/shared.ts'] },
    { id: '02', files: ['src/shared.ts'] },
    { id: '03', files: ['src/shared.ts'] },
  ];
  const conflicts = findFileConflicts(plans);
  assert.ok(conflicts.length >= 2, `Expected >= 2 conflicts, got ${conflicts.length}`);
});

test('6-plan complex graph groups correctly', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: [] },
    '03': { dependsOn: [] },
    '04': { dependsOn: ['01', '02'] },
    '05': { dependsOn: ['02', '03'] },
    '06': { dependsOn: ['04', '05'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 3);
  assert.deepStrictEqual(waves[0].sort(), ['01', '02', '03']);
  assert.deepStrictEqual(waves[1].sort(), ['04', '05']);
  assert.deepStrictEqual(waves[2], ['06']);
});

test('single linear chain of 4 plans → 4 waves', () => {
  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: ['01'] },
    '03': { dependsOn: ['02'] },
    '04': { dependsOn: ['03'] },
  };
  const waves = groupIntoWaves(graph);
  assert.strictEqual(waves.length, 4);
  waves.forEach((wave, i) => {
    const expectedId = String(i + 1).padStart(2, '0');
    assert.deepStrictEqual(wave, [expectedId]);
  });
});

test('wave executor stops on first failure — does not cascade', () => {
  // Simulates: Wave 1 has 3 tasks. Task 02 fails.
  // Expected: tasks 01 and 03 may run, but Wave 2 must NOT start.
  const executionLog = [];
  
  function simulateWaveExecution(graph, failingPlan) {
    const waves = groupIntoWaves(graph);
    let phaseFailed = false;
    
    for (const wave of waves) {
      if (phaseFailed) break; // critical: wave 2 must not start after failure
      for (const planId of wave) {
        if (planId === failingPlan) {
          executionLog.push({ plan: planId, status: 'failed' });
          phaseFailed = true;
        } else if (!phaseFailed) {
          executionLog.push({ plan: planId, status: 'completed' });
        }
      }
    }
    return { phaseFailed, executionLog };
  }

  const graph = {
    '01': { dependsOn: [] },
    '02': { dependsOn: [] }, // this one will fail
    '03': { dependsOn: [] },
    '04': { dependsOn: ['01', '03'] }, // must NOT execute
  };

  const result = simulateWaveExecution(graph, '02');
  assert.strictEqual(result.phaseFailed, true);
  // Plan 04 must not appear in the execution log
  const plan04Executed = result.executionLog.some(e => e.plan === '04');
  assert.strictEqual(plan04Executed, false, 'Plan 04 should not execute after wave failure');
});
```

### Add to `tests/audit.test.js`:

```javascript
// Add after existing tests:

console.log('\nAdditional audit tests:');

test('validates security_finding event type', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    timestamp: new Date().toISOString(),
    event: 'security_finding',
    agent: 'mindforge-security-reviewer',
    phase: 1,
    session_id: 'sess_test',
    severity: 'HIGH',
    owasp_category: 'A03:Injection',
    finding: 'SQL query built by string concatenation',
    file: 'src/api/search.ts',
    line: 42,
    remediated: false
  };
  assert.doesNotThrow(() => validateAuditEntry(entry));
  assert.strictEqual(entry.event, 'security_finding');
});

test('validates context_compaction event type', () => {
  const entry = {
    id: '550e8400-e29b-41d4-a716-446655440003',
    timestamp: new Date().toISOString(),
    event: 'context_compaction',
    agent: 'mindforge-orchestrator',
    phase: 2,
    plan: '03',
    session_id: 'sess_test',
    context_usage_pct: 72,
    handoff_written: true
  };
  assert.doesNotThrow(() => validateAuditEntry(entry));
});

test('rejects entry with malformed UUID', () => {
  const entry = {
    id: 'not-a-uuid',
    timestamp: new Date().toISOString(),
    event: 'task_completed',
    agent: 'test',
    session_id: 'sess_test'
  };
  assert.throws(() => validateAuditEntry(entry), /Invalid UUID/);
});

test('AUDIT.jsonl contains no secrets', () => {
  const content = fs.readFileSync('.planning/AUDIT.jsonl', 'utf8');
  const secretPatterns = [
    /password\s*["']?\s*:\s*["'][^"']{6,}/i,
    /sk-[a-zA-Z0-9]{20,}/,
    /-----BEGIN.*KEY-----/,
  ];
  secretPatterns.forEach(pattern => {
    assert.ok(!pattern.test(content), `Potential secret found in AUDIT.jsonl`);
  });
});
```

### Add to `tests/compaction.test.js`:

```javascript
// Add after existing tests:

console.log('\nAdditional compaction tests:');

test('HANDOFF.json has recent_commits field', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok('recent_commits' in obj, 'Missing recent_commits field');
  assert.ok(Array.isArray(obj.recent_commits), 'recent_commits must be an array');
});

test('HANDOFF.json has recent_files field', () => {
  const obj = JSON.parse(fs.readFileSync('.planning/HANDOFF.json', 'utf8'));
  assert.ok('recent_files' in obj, 'Missing recent_files field');
  assert.ok(Array.isArray(obj.recent_files), 'recent_files must be an array');
});

test('compaction-protocol.md covers WIP commit with --no-verify', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('--no-verify') || content.includes('no-verify'),
    'Should mention --no-verify for WIP commits that bypass hooks'
  );
});

test('compaction-protocol.md covers staleness detection', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('48 hours') || content.includes('staleness') || content.includes('stale'),
    'Should cover HANDOFF.json staleness detection'
  );
});

test('compaction-protocol.md mentions 85% emergency compaction', () => {
  const content = fs.readFileSync('.mindforge/engine/compaction-protocol.md', 'utf8');
  assert.ok(
    content.includes('85%') || content.includes('emergency'),
    'Should cover emergency compaction when 85%+ context is reached'
  );
});
```

**Commit:**
```bash
git add tests/
git commit -m "test(day2): add missing edge case tests from hardening review"
```

---

## HARDEN 8 — Write ADR-004 and ADR-005 for Day 2 decisions

Two significant architectural decisions were made in Day 2 that need ADRs.

### `.planning/decisions/ADR-004-wave-parallelism-model.md`

```markdown
# ADR-004: Wave-based parallel execution over full parallelism

**Status:** Accepted
**Date:** [today]
**Deciders:** MindForge core team

## Context
When executing multiple tasks in a phase, we can choose:
A) Run all tasks simultaneously (maximum parallelism)
B) Run tasks in dependency-ordered waves (wave parallelism — chosen)
C) Run tasks sequentially (no parallelism)

## Decision
Wave-based parallel execution. Tasks within a wave run in parallel.
Waves execute sequentially.

## Options considered

### Option A — Full parallelism
Pros: Maximum speed
Cons: Cannot handle dependencies safely. If Plan 03 depends on Plan 01's output
and both run simultaneously, Plan 03 reads stale data. Produces corrupt output.

### Option B — Wave parallelism (chosen)
Pros: Safely parallel within dependency constraints. Significantly faster than
sequential. Dependency correctness is guaranteed by wave ordering.
Cons: Some tasks that could theoretically run in parallel must wait for their
dependency wave to complete.

### Option C — Sequential
Pros: Simplest to implement and reason about.
Cons: Discards the primary quality advantage of parallel subagents — isolated
200K token contexts per task. In sequential mode, the orchestrator's context
fills up across tasks, degrading output quality over time.

## Rationale
Wave parallelism gives the correctness of sequential execution (dependency order
respected) with the quality benefits of parallel isolation (each task gets a
fresh 200K context). This is the optimal tradeoff.

## Consequences
- Plan authors must declare dependencies accurately — incorrect dependencies
  can cause parallel tasks to conflict.
- The dependency parser must catch cycles and conflicts before execution starts.
- A small planning overhead (building the wave graph) is incurred per phase.
```

### `.planning/decisions/ADR-005-append-only-audit-log.md`

```markdown
# ADR-005: Append-only JSONL audit log over structured database

**Status:** Accepted
**Date:** [today]
**Deciders:** MindForge core team

## Context
MindForge needs an audit trail of agent actions. The storage format choices are:
A) Append-only JSONL file (chosen)
B) SQLite database
C) In-memory log (written to JSON on session end)

## Decision
Append-only JSONL file: `.planning/AUDIT.jsonl`

## Options considered

### Option A — Append-only JSONL (chosen)
Pros:
- Zero dependencies (no SQLite driver needed)
- Readable with standard Unix tools (grep, jq, tail)
- Git-trackable — history of history
- Tamper-evident via git (any deletion or modification is visible in `git diff`)
- Works identically across all platforms and environments

Cons:
- No query language — filtering requires grep/jq
- File grows unboundedly (mitigated by archiving strategy)
- No transactions — a crash mid-write could produce a partial line

### Option B — SQLite
Pros: Full SQL query capability, transactional writes
Cons: Binary file — not readable without tooling, not meaningfully git-diffable,
      adds a native dependency, harder to inspect in CI/CD environments

### Option C — In-memory log
Pros: No I/O overhead during session
Cons: Lost entirely if session crashes mid-execution — exactly when the audit log
      is most needed.

## Rationale
For a framework targeting solo developers and small teams, readability and
zero-dependency simplicity outweigh query sophistication. The primary audit use
case is "what happened in this phase?" which grep handles well.

## Consequences
- A partial-line recovery tool should be built in a future hardening pass.
  (Run `python3 -c "import sys,json;[print(l.strip()) for l in sys.stdin if json.loads(l)]"
  to filter clean lines from a corrupted AUDIT.jsonl)
- An archiving strategy (rotate after 10,000 lines) will be added in Day 4.
- The `status` command reads AUDIT.jsonl from the tail for performance.
```

**Commit:**
```bash
git add .planning/decisions/
git commit -m "docs(adr): add ADR-004 wave parallelism, ADR-005 append-only audit log"
```

---

## HARDEN 9 — Run the complete test battery

Run every test. All must pass before pushing.

```bash
echo "=== Day 1 Tests ===" && node tests/install.test.js
echo "=== Wave Engine ===" && node tests/wave-engine.test.js
echo "=== Audit System ===" && node tests/audit.test.js
echo "=== Compaction  ===" && node tests/compaction.test.js
```

Expected output per suite: "All tests passed."

If any test fails: fix the source, not the test. Tests describe requirements.

---

## HARDEN 10 — Update README.md for Day 2 features

Add a new section to README.md documenting Day 2 capabilities:

```markdown
## How the wave engine works

MindForge's execution engine is not sequential. It analyses task dependencies and
runs independent tasks in parallel — each with its own isolated 200K-token context.

```
/mindforge:plan-phase 1
    → Creates 5 task plans with dependency declarations

/mindforge:execute-phase 1
    → Parser builds dependency graph
    → Groups into waves: [01,02] → [03,04] → [05]
    → Wave 1: Plans 01 and 02 run in parallel (independent)
    → Wave 2: Plans 03 and 04 run in parallel (both depend on Wave 1 only)
    → Wave 3: Plan 05 runs (depends on both Wave 2 plans)
    → Full test suite runs between each wave
    → Automated verification after all waves complete
```

This produces consistently higher quality than sequential execution: each subagent
has a full, clean context window focused entirely on its specific task.

## Long sessions and context compaction

MindForge monitors context window usage. At 70%:
1. Current state is committed to git
2. `STATE.md` and `HANDOFF.json` are updated with full session context
3. Work resumes in a fresh context window with clean working memory

Sessions never degrade. Every session starts fresh with complete state awareness.

## Audit trail

Every agent action is logged to `.planning/AUDIT.jsonl`:
- Task starts and completions with commit SHAs
- Security findings with OWASP classification
- Context compaction events
- Quality gate failures

Query the audit log:
```bash
# What happened in phase 1?
grep '"phase":1' .planning/AUDIT.jsonl | jq .

# Any security findings?
grep '"event":"security_finding"' .planning/AUDIT.jsonl | jq '{severity,finding,file}'

# Today's activity
grep "$(date -u +%Y-%m-%d)" .planning/AUDIT.jsonl | jq .event
```
```

**Commit:**
```bash
git add README.md
git commit -m "docs(readme): document wave engine, compaction, and audit trail"
```

---

## HARDEN 11 — Final pre-merge checklist

Run every check. Do not push until all pass.

```bash
# 1. All tests pass (complete battery)
node tests/install.test.js && \
node tests/wave-engine.test.js && \
node tests/audit.test.js && \
node tests/compaction.test.js
# Expected: all suites show "All tests passed"

# 2. Engine files complete
ls .mindforge/engine/
# Expected: 4 files
# dependency-parser.md  wave-executor.md  context-injector.md
# compaction-protocol.md  verification-pipeline.md

# 3. All 10 commands present in both runtimes
ls .claude/commands/mindforge/ | wc -l   # Expected: 10
ls .agent/mindforge/ | wc -l             # Expected: 10
diff <(ls .claude/commands/mindforge/ | sort) <(ls .agent/mindforge/ | sort)
# Expected: no output (identical)

# 4. AUDIT.jsonl is valid JSON Lines
node -e "
  const fs = require('fs');
  const c = fs.readFileSync('.planning/AUDIT.jsonl','utf8').trim();
  if (!c) { console.log('AUDIT.jsonl: empty (valid)'); process.exit(0); }
  const lines = c.split('\n').filter(l => l.trim());
  lines.forEach((l, i) => { try { JSON.parse(l); } catch(e) { throw new Error('Line '+(i+1)+': '+e.message); }});
  console.log('AUDIT.jsonl: ' + lines.length + ' valid entries');
"

# 5. HANDOFF.json has all hardened fields
node -e "
  const h = JSON.parse(require('fs').readFileSync('.planning/HANDOFF.json','utf8'));
  const required = ['schema_version','next_task','_warning','context_refs',
                    'blockers','decisions_needed','recent_commits','recent_files'];
  const missing = required.filter(f => h[f] === undefined);
  if (missing.length) throw new Error('Missing: ' + missing.join(', '));
  console.log('HANDOFF.json: all fields present');
"

# 6. ADRs: now 5 total
ls .planning/decisions/*.md | wc -l   # Expected: 5

# 7. Git log: clean Day 2 commits (roughly 12 commits)
git log --oneline | head -20
# No WIP, temp, fix, or oops commits

# 8. No secrets in any file
grep -rE "(password|api_key|secret)\s*=\s*['\"][^'\"]{6,}" \
  --include="*.md" --include="*.js" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=.git \
  . 2>/dev/null | grep -v "placeholder\|example\|your-"
# Expected: no output

# 9. README covers all Day 2 features
grep -c "wave engine\|compaction\|audit" README.md
# Expected: 3 or more matches

# 10. CLAUDE.md updated with Day 2 references
grep "wave-executor\|compaction-protocol\|AUDIT.jsonl" .claude/CLAUDE.md | wc -l
# Expected: 3 or more matches
```

---

## FINAL COMMIT AND PUSH

```bash
git add .
git commit -m "harden(day2): complete Day 2 hardening — engine, audit, compaction, commands"
git push origin feat/mindforge-wave-engine
```

---

## DAY 2 COMPLETE — What you have built

| Component | Files Added | Status |
|---|---|---|
| Wave execution engine | 4 engine spec files | ✅ |
| Dependency parser | dependency-parser.md | ✅ |
| Context injector | context-injector.md | ✅ |
| Compaction protocol | compaction-protocol.md | ✅ |
| Verification pipeline | verification-pipeline.md | ✅ |
| AUDIT system + schema | AUDIT-SCHEMA.md + AUDIT.jsonl | ✅ |
| /mindforge:next | next.md (both runtimes) | ✅ |
| /mindforge:quick | quick.md (both runtimes) | ✅ |
| /mindforge:status | status.md (both runtimes) | ✅ |
| /mindforge:debug | debug.md (both runtimes) | ✅ |
| Day 2 test suites | 3 new test files | ✅ |
| Architecture ADRs | ADR-004, ADR-005 | ✅ |

---

## DAY 3 PREVIEW

```
Branch: feat/mindforge-skills-platform

Day 3 scope:
- Org-wide skills distribution system (install org skills globally)
- 5 additional skill packs: performance, accessibility, data-privacy,
  incident-response, database-patterns
- Skills CLI: /mindforge:skills list | add | update | validate
- Skill versioning and compatibility checks
- /mindforge:review command (full code review using code-quality skill)
- /mindforge:security-scan command (standalone security scan)
- /mindforge:map-codebase command (brownfield project onboarding)
- Phase discussion command (/mindforge:discuss-phase)
- Persona customisation system (override persona defaults per project)
```

**Branch:** `feat/mindforge-wave-engine`
**Day 2 hardening complete. Open PR → assign reviewer → merge to main.**
