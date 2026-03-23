---
name: mindforge:validate-phase
description: Audit the current phase for requirement coverage and test gaps
argument-hint: [N]
allowed-tools:
  - view_file
  - list_dir
---

<objective>
Audit a completed project phase to ensure every requirement has been addressed and that corresponding automated tests have been implemented and are passing.
</objective>

<execution_context>
.claude/commands/mindforge/validate-phase.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The phase number [N], optional)
Knowledge: `STATE.md`, `REQUIREMENTS.md`, and the codebase test suite.
</context>

<process>
1. **Identify Phase**: Resolve the targeted phase.
2. **Cross-reference**:
    - List all requirements in `REQUIREMENTS.md` marked for this phase.
    - Verify implementation of each requirement in the code.
    - Check for the existence of passing tests for each requirement.
3. **Analyze Gaps**: Identify any "orphaned" requirements or features missing tests.
4. **Report Findings**: Summarize coverage and call out specific gaps to the user.
</process>
