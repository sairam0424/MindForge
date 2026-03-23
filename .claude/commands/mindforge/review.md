---
name: mindforge:review
description: Perform a comprehensive code quality and security review
argument-hint: [path|phase N|--staged|--last-commit]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
  - list_dir
---

<objective>
Conduct a deep code review of a specified target (files, directories, phases, or git SHAs), focusing on structural quality, security vulnerabilities, and adherence to project conventions.
</objective>

<execution_context>
.claude/commands/mindforge/review.md
</execution_context>

<context>
Target: Staged changes, last commit, specific phase, or path.
Personas: code-quality.md, security-reviewer.md
Skills: code-quality, security-review, accessibility (for UI), api-design (for routes), database-patterns (for migrations).
</context>

<process>
1. **Establish Scope**: Use `git diff` or `git log` to determine the list of files needing review.
2. **Initialize Personas**: Load the appropriate reviewer personas and skills based on file types.
3. **Audit Implementation**: For each file, read full content and check:
    - Code quality (complexity, naming, error handling).
    - Conventions (from CONVENTIONS.md).
    - Security (secrets, validation, injection).
    - Type safety (TS specifics).
4. **Generate Report**: Write `CODE-REVIEW-[timestamp].md` with categorized findings (Blocking, Major, Minor, Suggestion) and an overall verdict.
5. **Update State**: Log `code_review_completed` in `AUDIT.jsonl`.
6. **Report**: Summarize findings to the user and block merge if "Blocking" issues exist.
</process>
