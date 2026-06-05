---
name: "mindforge:review-backlog"
description: "Review and promote backlog items to the active phase sequence"
argument-hint: [optional filters]
allowed-tools:
  - view_file
  - write_to_file
  - replace_file_content
  - multi_replace_file_content
---

<objective>
Review items currently parked in the ROADMAP.md backlog and facilitate their promotion to the active development plan.
</objective>

<execution_context>
.claude/commands/mindforge/review-backlog.md
</execution_context>

<context>
Target File: ROADMAP.md, STATE.md
State: Resolves the next available phase number from STATE.md for promotion.
</context>

<process>
1. **Read ROADMAP.md**: Extract all items under the `## Backlog` section (999.x).
2. **Present to User**: List the backlog items and ask which one(s) should be promoted.
3. **Determine Promotion Slot**: Read STATE.md to find the next sequential phase number.
4. **Promote Item**:
    - Move the item from the backlog to the active milestone list.
    - Renumber the item to the next available phase number.
5. **Update STATE.md**: Add the new phase to STATE.md in `unplanned` or `planned` status as appropriate.
6. **Confirm**: Summarize the promotion to the user.
</process>
