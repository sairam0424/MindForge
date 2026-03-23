---
name: mindforge:milestone
description: Create or update a milestone definition and track grouped phase health
argument-hint: <name> [phase list]
allowed-tools:
  - list_dir
  - write_to_file
  - view_file
---

<objective>
Define and track major project milestones by grouping phases, monitoring their health, and linking approvals and verification status.
</objective>

<execution_context>
.claude/commands/mindforge/milestone.md
</execution_context>

<context>
Arguments: $ARGUMENTS (Name of milestone and optional list of phase numbers)
Storage: .planning/milestones/
Health Rules: Any blocked phase makes the milestone "at risk".
</context>

<process>
1. **Parse Arguments**: Extract milestone name and phase list.
2. **Read State**: Check existing phases in `.planning/phases/`.
3. **Generate/Update Milestone**:
    - Create/update `.planning/milestones/[name].md`.
    - Include phase list, health summary (on track, at risk, blocked), and verification status.
4. **Evaluate Health**:
    - Mark as "at risk" if any linked phase is blocked.
    - Monitor for completed vs. verified phases for release readiness.
5. **Report**: Summarize milestone health and next actions to the user.
</process>
