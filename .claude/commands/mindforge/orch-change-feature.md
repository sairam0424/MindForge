---
description: Orchestrate altering an existing, working feature to new desired behavior — update tests to the new spec, change impl, review, gated commit. Thin wrapper over the orch-pipeline skill.
---

# MindForge — Orch: Change Feature
# Usage: /mindforge:orch-change-feature <the new desired behavior>

Manually launch the **change-feature** orchestration: change behavior that
already works to a new desired spec, tests-first.

## Usage

```
/mindforge:orch-change-feature <the new desired behavior>
```

Examples:

```
/mindforge:orch-change-feature alert at 2 warnings instead of 3
/mindforge:orch-change-feature instead of sorting by date, sort by priority
```

## What It Does

Activate the `orch-pipeline` skill (`.mindforge/skills/orch-pipeline/SKILL.md`)
with `$ARGUMENTS` as the request and `operation = change-feature`. The engine will:

1. **Step 0 — size classifier**: classify size (default floor: **small**) and
   state the tier in one line.
2. Light plan only if the new behavior needs research, written as MindForge XML
   under `.planning/` via `/mindforge:plan-write`. → **GATE 1** (approve
   changed-test plan).
3. **Update the existing tests** to express the new behavior, then change the
   implementation until green via `mindforge-tdd_extended`. (Changing the tests
   first is what makes this a tweak, not a fix.)
4. `/mindforge:review` (+ the `quick.md` security auto-trigger / `security-reviewer`
   on a security trigger), then commit as conventional `feat(...)` / `refactor(...)`
   + Merkle-linked AUDIT.jsonl entry. → **GATE 2**.

Use this only when the feature **works** but should behave differently — not for
bugs (`/mindforge:orch-fix-defect`) or net-new capability
(`/mindforge:orch-add-feature`).

If `$ARGUMENTS` is empty, ask the user what behavior should change.
