---
name: mindforge:qa
description: Run systematic visual QA on changed UI surfaces
argument-hint: [--phase N] [--auto]
allowed-tools:
  - run_command
  - list_dir
  - open_browser_url
  - view_file
---

<objective>
Automatically identify UI regressions and visual bugs by scanning phase diffs for frontend changes, navigating to affected pages, and performing automated sanity checks.
</objective>

<execution_context>
.claude/commands/mindforge/qa.md
</execution_context>

<context>
Scope: Files changed in the target phase.
Output: QA-REPORT report and automated Playwright regression tests.
</context>

<process>
1. **Diff Analysis**: Identify changed pages/routes from git history.
2. **Visual Scan**: Navigate to affected URLs using the browser tool.
3. **Bug Hunting**: Look for console errors, hydration issues, and visual brokenness.
4. **Reporting**: Generate a `QA-REPORT-[N].md` with screenshots of findings.
5. **Sanitization**: Draft regression tests in `tests/regression/` to prevent recurrence.
</process>
