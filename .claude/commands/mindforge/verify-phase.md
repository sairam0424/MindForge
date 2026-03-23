---
name: mindforge:verify-phase
description: Human acceptance testing (UAT) for a completed phase
argument-hint: [N]
allowed-tools:
  - view_file
  - write_to_file
---

<objective>
Conduct a structured User Acceptance Testing (UAT) session for a completed phase, gathering human feedback on deliverables and identifying any required fixes.
</objective>

<execution_context>
.claude/commands/mindforge/verify-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (Phase N)
Prerequisite: .planning/phases/[N]/VERIFICATION.md must exist.
Output: .planning/phases/[N]/UAT.md
</context>

<process>
1. **Extract Deliverables**: Read requirements and plans to generate a list of checkable instructions for the user.
2. **Interactive Walkthrough**: Present deliverables one at a time and ask the user for Pass/Fail status and observations.
3. **Handle Failures**: If a task fails, spawn a debug subagent and create a `FIX-PLAN-[N]-[NN].md`.
4. **Record Results**: Write `UAT.md` capturing testers, dates, results per deliverable, and overall sign-off status.
5. **Update State**: If all pass, mark phase as verified in `STATE.md` and guide the user to `/mindforge:ship`.
</process>
