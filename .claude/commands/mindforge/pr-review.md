---
name: mindforge:pr-review
description: Run the AI PR review engine on a pull request diff
argument-hint: [--diff path] [--sha base..head] [--output github|json|markdown]
allowed-tools:
  - run_command
  - view_file
  - write_to_file
---

<objective>
Automate the review of pull request diffs using an AI engine, providing structured feedback in various formats (GitHub, JSON, Markdown) tailored to the type of changes made.
</objective>

<execution_context>
.claude/commands/mindforge/pr-review.md
</execution_context>

<context>
Source: Diff file, SHA range, or staged changes.
Knowledge: PROJECT.md, ARCHITECTURE.md, CONVENTIONS.md, SECURITY.md.
Environment: Requires ANTHROPIC_API_KEY for external model calls.
</context>

<process>
1. **Determine Source**: Extract the diff from the provided path, SHA range, or git state.
2. **Load Context**: Gather project-level documentation and relevant ADRs.
3. **Select Template**: Detect change type (Auth, DB, API) and select the corresponding review template.
4. **Execute Review**: Invoke the Claude API with the built system/review prompts.
5. **Format Output**: Generate the report according to the `--output` flag (GitHub-flavoured MD, JSON, or standard MD).
6. **Finalize**: Write to the specified destination (CI /tmp/ or interactive console) and log the event.
</process>
