---
description: Launch parallel multi-model execution via tmux and git worktrees. Usage - /mindforge:dmux [task-file.json] [--max-panes 5] [--model-per-pane]
---

<objective>
Split independent work across parallel tmux panes with worktree isolation,
enabling multiple agents/models to work simultaneously without conflicts.
</objective>

<execution_context>
@.mindforge/skills/dmux-workflows/SKILL.md
@.mindforge/skills/rfc-pipeline/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse worker definitions from task-file.json (or interactive if no file provided).
2. Verify task independence: confirm no two workers will modify the same files.
3. Create git worktree per worker: `git worktree add .worktrees/[name] -b dmux/[name]`.
4. Launch tmux session with one pane per worker (max --max-panes, default 5).
5. Seed each pane with its task description and constraints.
6. If --model-per-pane: assign different models to different panes (e.g., Sonnet for impl, Gemini for research).
7. Monitor pane progress (check for completion signals or stuck patterns).
8. On pane completion: review output diff before merging.
9. Merge completed worktrees back to main branch (sequential, resolve conflicts).
10. Cleanup: remove worktrees (`git worktree remove`), close tmux panes.
11. Consolidate results: produce summary of what each pane accomplished.
12. Log dmux session in AUDIT with pane count, models used, and merge status.
</process>
