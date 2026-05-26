---
description: Systematic debugging using the Debug Specialist persona with full RCA protocol.
---
# MindForge — Debug Command
# Usage: /mindforge:debug [description]

Systematic debugging using the Debug Specialist persona with full RCA protocol.

## Activation

## Step 0 — Activate Extended Debugging Protocol

**MANDATORY**: Invoke the `mindforge-debug_extended` skill.
This ensures the full scientific root-cause investigation depth is applied to this session.

## Step 1 — Intake

Ask the user:
1. "Describe the problem. What is happening vs. what should happen?"
2. "Can you reproduce it reliably? If yes: what are the exact steps?"
3. "When did this start? Was it working before? What changed?"
4. "Do you have an error message or stack trace? Paste it here."

Capture all answers before proceeding.

## Step 2 — Triage

Classify the issue immediately:
- **Regression** (was working, now broken) → check recent commits
- **Never worked** (new feature failing) → check the plan and verify step
- **Environment issue** (works locally, fails in CI) → check environment diffs
- **Data issue** (specific data causes failure) → check data shape assumptions
- **Integration issue** (fails when calling external service) → check contracts

Report classification to user: "This looks like a [type] issue. Here's my approach..."

## Step 3 — Follow Debug Specialist protocol

Execute the full protocol from `debug-specialist.md`:
1. Reproduce
2. Isolate
3. Read the error
4. Check recent changes
5. Instrument
6. Form hypothesis
7. Test hypothesis (write a failing test)
8. Fix
9. Verify (test from step 7 now passes, no regressions)
10. Document

At each step, report what was found before moving to the next step.
Do not skip steps or combine them.

## Step 3b — Full test suite verification (mandatory)
After the fix and targeted verify pass, run the project's full test suite.
Do not mark the debug task complete if any tests fail.

## Step 4 — Check recent git history

```bash
git log --oneline -20
git diff HEAD~[N] HEAD -- [suspected file]
```

If a recent commit is the likely cause, show the user the specific diff.

## Step 5 — Write the RCA report

Create `.planning/phases/[current-phase]/DEBUG-[timestamp].md`:

```markdown
# Debug Report — [short description]

## Date
[ISO-8601]

## Problem
[User's description + what was verified during debugging]

## Root cause category
[Logic error / Data error / Integration error / Concurrency error /
Configuration error / Dependency error]

## Root cause
[Precise description of what the actual cause was]

## Evidence
- [How the root cause was confirmed]
- [Failing test that proved the bug: file:line]

## Fix applied
- File: [path]
- Change: [description]
- Commit: [SHA]

## Regression test
[Test written to prevent this from recurring: file:line]

## Prevention
[What should change in process/code to prevent this class of bug]
```

## Step 6 — Write AUDIT entry

```json
{
  "id": "uuid",
  "timestamp": "ISO-8601",
  "event": "debug_completed",
  "agent": "mindforge-debug-specialist",
  "phase": [current phase or null],
  "session_id": "sess_abc",
  "issue_type": "regression",
  "root_cause_category": "Logic error",
  "root_cause_summary": "[one sentence]",
  "commit_sha": "[fix commit sha]",
  "regression_test_added": true,
  "report_path": ".planning/phases/[N]/DEBUG-[timestamp].md"
}
```

## When the bug cannot be reproduced

Ask:
1. "Does it happen every time or intermittently?"
2. "Does it happen in specific environments only? (dev/staging/prod)"
3. "Does it happen for specific users or all users?"

If intermittent: focus on concurrency, caching, and race conditions.
Write a monitoring/logging plan to catch the next occurrence.
Document the inconclusive investigation in the DEBUG report with evidence gathered.
