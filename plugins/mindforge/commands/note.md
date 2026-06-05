---
name: "mindforge:note"
description: "Capture an idea, task, or issue that surfaces during a session as a quick note for later"
argument-hint: <text> [list|promote N]
allowed-tools:
  - list_dir
  - view_file
  - write_to_file
  - multi_replace_file_content
---

<objective>
Provide a zero-friction way to capture ephemeral thoughts, bugs, or todos during an active session without interrupting the current flow, with the ability to later promote them to official tasks.
</objective>

<execution_context>
.claude/commands/mindforge/note.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The note text or subcommand like `list` or `promote`)
Storage: .planning/notes/
Target for Promotion: ROADMAP.md or STATE.md
</context>

<process>
1. **Route Subcommand**:
    - If `list`: Read all files in `.planning/notes/` and present them.
    - If `promote <N>`: Read note N, add it to current phase/milestone in STATE.md or ROADMAP.md, then move the note to `.planning/notes/archived/`.
    - Else (default): Capture the text.
2. **Capture Flow**:
    - Ensure `.planning/notes/` directory.
    - Create a file `note_[timestamp].md` with the content.
3. **Confirm**: Quick confirmation of capture or promotion result.
</process>
