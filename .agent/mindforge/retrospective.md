---
description: Facilitate a structured retrospective with objective metrics + qualitative insights.
---

# MindForge — Retrospective Command
# Usage: /mindforge:retrospective [phase N|milestone M] [--template agile|4ls|starfish]

Facilitate a structured retrospective with objective metrics + qualitative insights.

## Workflow
1. Gather quantitative signals (tasks, verify pass rate, findings, UAT, approvals).
2. Run structured discussion by template.
3. Write retrospective artifact in `.planning/phases/...` or `.planning/milestones/...`.
4. Create follow-up tasks/tickets for action items.
5. Update metrics with retrospective-completed event.
6. Run `/mindforge:record-learning` to sync any new architectural "Aha!" moments or significant anti-patterns discovered during this phase/milestone.

## Step 5 — Apply learnings to MINDFORGE.md
Ask explicitly:
`Based on this retrospective, should we update MINDFORGE.md to improve future phases?`

If yes:
- propose exact config changes
- apply only after confirmation
- commit with clear rationale

Common mappings:
- vague plans -> lower discuss threshold / enable auto-discuss
- low verify pass rate -> lower max tasks per phase
- rising security findings -> force-load `security-review,data-privacy`
- frequent compaction pressure -> lower compaction threshold
