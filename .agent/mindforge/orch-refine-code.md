---
description: Orchestrate a behavior-preserving refactor — confirm tests green, restructure without changing behavior, keep green, review, gated commit. Thin wrapper over the orch-pipeline skill.
---

# MindForge — Orch: Refine Code
# Usage: /mindforge:orch-refine-code <what to restructure>

Manually launch the **refine-code** orchestration: improve structure while
behavior stays identical, with the existing test suite as the safety net.

## Usage

```
/mindforge:orch-refine-code <what to restructure>
```

Examples:

```
/mindforge:orch-refine-code extract the HTTP client out of poller.py
/mindforge:orch-refine-code remove dead code and duplication in the dashboard module
```

## What It Does

Activate the `orch-pipeline` skill (`.mindforge/skills/orch-pipeline/SKILL.md`)
with `$ARGUMENTS` as the request and `operation = refine-code`. The engine will:

1. **Step 0 — size classifier**: classify size (default floor: **medium** —
   restructures touch multiple files).
2. Confirm the relevant tests exist and are **green before** touching code; add
   characterization tests first if coverage is thin. Plan the restructure as
   MindForge XML under `.planning/` via `/mindforge:plan-write`. → **GATE 1**.
3. Restructure in small steps, re-running tests after each (no new behavior tests
   — the existing suite proves behavior is unchanged). Dead-code/dup sweeps
   delegate to `/mindforge:de-slop`.
4. `/mindforge:review`, then commit as `refactor(...)` (the diff must be
   behavior-neutral) + Merkle-linked AUDIT.jsonl entry. → **GATE 2**.

Use this only when behavior must **not** change. If behavior should change at
all, use `/mindforge:orch-change-feature` or `/mindforge:orch-fix-defect`.

If `$ARGUMENTS` is empty, ask the user what to refine.
