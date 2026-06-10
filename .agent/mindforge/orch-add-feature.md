---
description: Orchestrate building a brand-new feature end to end — research, plan, TDD, review, gated commit. Thin wrapper over the orch-pipeline skill.
---

# MindForge — Orch: Add Feature
# Usage: /mindforge:orch-add-feature <what to add>

Manually launch the **add-feature** orchestration: a gated
Research → Plan → TDD → Review → Commit pipeline for net-new capability.

## Usage

```
/mindforge:orch-add-feature <what to add>
```

Examples:

```
/mindforge:orch-add-feature add OAuth2 login to the auth service
/mindforge:orch-add-feature support CSV export in the dashboard
```

## What It Does

Activate the `orch-pipeline` skill (`.mindforge/skills/orch-pipeline/SKILL.md`)
with `$ARGUMENTS` as the request and `operation = add-feature`. The engine will:

1. **Step 0 — size classifier**: classify size on blast radius and state the tier
   in one line (no floor; classify on the three signals). The user may override.
2. Research existing libraries/patterns (Search-Before-Building), then plan a
   MindForge XML `<action>` task_list under `.planning/` via
   `/mindforge:plan-write`. → **GATE 1** (approve plan).
3. TDD each task via `mindforge-tdd_extended` (new failing tests → green), then
   `/mindforge:review` (+ the `quick.md` security auto-trigger / `security-reviewer`
   if a security trigger is touched).
4. Commit as conventional `feat(...)` commits, each writing a Merkle-linked
   AUDIT.jsonl entry. → **GATE 2** (confirm before commit).

Honor both gates — do not write implementation before Gate 1, do not commit
before Gate 2.

If `$ARGUMENTS` is empty, ask the user what capability to add.
