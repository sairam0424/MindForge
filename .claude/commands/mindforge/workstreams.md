---
name: mindforge:workstreams
description: Manage parallel feature tracks with isolated state
argument-hint: [list|create|switch|status|complete]
allowed-tools:
  - list_dir
  - view_file
  - write_to_file
  - run_command
---

<objective>
Enable developers to work on multiple features or bugs concurrently within the same codebase without state collision. Provides isolated tracking for each "workstream".
</objective>

<execution_context>
.claude/commands/mindforge/workstreams.md
</execution_context>

<context>
Arguments: $ARGUMENTS (Switch subcommand)
Storage: .planning/workstreams/
State: Each workstream maintains its own subset of `STATE.md` or a local context file.
</context>

<process>
1. **Route Subcommand**:
    - `list`: Show all active and archived workstreams in `.planning/workstreams/`.
    - `create <name>`: Initialize a new workstream directory and baseline state.
    - `switch <name>`: Update the global pointer in `STATE.md` to the targeted workstream.
    - `status`: Show the current active workstream and its progress.
2. **Manage Isolation**:
    - When switching, ensure current work is saved or stashed if necessary.
3. **Confirm**: Success/Failure status message to user.
</process>
