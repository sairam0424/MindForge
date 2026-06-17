---
description: "4-phase root cause debugging — understand the bug completely before attempting any fix."
---

# MindForge — Systematic Debug Command
# Usage: /mindforge:systematic-debug [problem description]

Activates the systematic debugging skill. The iron law: **NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST**. Symptom fixes are failure.

## Activation

Load `.mindforge/skills/systematic-debugging/SKILL.md` immediately.
Follow its 4-phase protocol for the full duration of this session.

## Phase 1 — Understand the Bug

Before touching any code:

1. **Reproduce it.** Can you reproduce it in a minimal, isolated environment?
   - If no: document what you tried. Ask the user for more context. Do not guess.
   - If yes: record the exact reproduction steps.

2. **Read the error completely.** Stack trace, logs, error message — read every line.

3. **Identify the invariant.** What assumption is being violated? What should be true that isn't?

4. **Map the control flow.** Trace the path from input to failure point.

**Output of Phase 1:** A written statement of the root cause hypothesis with evidence.

## Phase 2 — Isolate the Root Cause

1. Write a failing test that exercises exactly the broken invariant.
2. Confirm the test fails for the right reason (not just any reason).
3. Narrow scope: is the bug in this file? This function? This line?
4. Check: is this a regression? Run `git log --oneline -20` on affected files.

**Gate:** Do not proceed to Phase 3 without a failing test that proves the bug.

## Phase 3 — Fix

1. Apply the minimal fix that restores the invariant.
2. Do not fix adjacent issues or refactor — single responsibility per fix.
3. Run the failing test — it must now pass.
4. Run the full test suite — zero new failures allowed.

## Phase 4 — Verify and Document

1. Confirm the original reproduction steps no longer trigger the bug.
2. Write a one-paragraph RCA summary: what was broken, why, how it was fixed.
3. Commit with a message that explains the root cause, not the symptom.

## When you cannot find the root cause

- Add logging/instrumentation at the point of failure.
- Form 2–3 competing hypotheses and test each independently.
- Document what you ruled out — negative evidence is evidence.
- Ask the user for additional context before guessing.

Do not apply a fix that "might work." Every fix requires a root cause explanation.
