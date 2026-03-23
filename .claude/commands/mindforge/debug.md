---
name: mindforge:debug
description: Perform systematic debugging using the RCA protocol
argument-hint: [description]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Resolve complex software defects by following a rigorous Root Cause Analysis (RCA) protocol, including reproduction, isolation, instrumentation, and regression testing.
</objective>

<execution_context>
.claude/commands/mindforge/debug.md
</execution_context>

<context>
Persona: debug-specialist.md
Lifecycle: Triage -> Reproduce -> Hypothesis -> Fix -> Verify.
Artifact: .planning/phases/[N]/DEBUG-[timestamp].md
</context>

<process>
1. **Intake**: Gather symptoms, reproduction steps, working history, and error logs.
2. **Triage**: Classify as Regression, Never Worked, Environment, or Integration issue.
3. **Isolate**: Use git history and breadcrumb logging to identify the failure point.
4. **Reproduce**: Write a failing test case that proves the bug.
5. **Fix**: Implement the minimum necessary change to resolve the issue.
6. **Verify**: Ensure the new test passes and run the full project test suite to detect regressions.
7. **Document**: Write the `DEBUG-[timestamp].md` RCA report and log the event in `AUDIT.jsonl`.
</process>
