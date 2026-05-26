---
name: mindforge:plant-seed
description: Capture speculative ideas with triggers that surface automatically when relevant
argument-hint: <idea>
allowed-tools:
  - list_dir
  - write_to_file
  - view_file
---

<objective>
Capture speculative or long-term ideas (seeds) and store them in a way that they can be automatically resurfaced when a relevant future milestone or phase is started.
</objective>

<execution_context>
.claude/commands/mindforge/plant-seed.md
</execution_context>

<context>
Arguments: $ARGUMENTS (The speculative idea)
Storage: .planning/seeds/
Trigger mechanism: Files in this directory are checked during `init-project` or `milestone` creation.
</context>

<process>
1. **Ensure storage**: Verify `.planning/seeds/` exists; create if not.
2. **Generate filename**: Create a slugified filename based on the idea or a timestamp.
3. **Write seed**: Create a markdown file with the idea, any inferred triggers (tags/keywords), and the current timestamp.
4. **Link to system**: Add a note to the master seed index if one exists.
5. **Confirm**: Let the user know the seed has been planted and what might trigger its resurrection.
</process>
