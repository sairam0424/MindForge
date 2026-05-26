---
name: mindforge:add-backlog
description: Capture ideas in a "parking lot" to keep them out of the active phase sequence
argument-hint: <description>
allowed-tools:
  - view_file
  - write_to_file
  - replace_file_content
  - multi_replace_file_content
---

<objective>
Capture an idea, task, or feature request in a "parking lot" section of the ROADMAP.md to prevent it from cluttering the active development phases.
</objective>

<execution_context>
.claude/commands/mindforge/add-backlog.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The description of the backlog item)
Target File: ROADMAP.md
State: Uses 999.x numbering scheme for backlog items.
</context>

<process>
1. **Read ROADMAP.md**: Locate the `## Backlog` or `## Future Milestones` section.
2. **Initialize if missing**: If no backlog section exists, create `## Backlog` at the end of the file.
3. **Determine numbering**: Find the last `999.x` item. If none, start with `999.1`.
4. **Append item**: Add the new backlog item with the determined number and the provided description.
5. **Confirm**: Notify the user that the item has been parked in the backlog.
</process>
