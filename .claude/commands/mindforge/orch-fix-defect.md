---
description: Orchestrate fixing a bug — reproduce it as a failing regression test, fix to green, review, gated commit. Thin wrapper over the orch-pipeline skill.
---

# MindForge — Orch: Fix Defect
# Usage: /mindforge:orch-fix-defect <what is broken>

Manually launch the **fix-defect** orchestration: prove the bug with a red test,
then fix to green.

## Usage

```
/mindforge:orch-fix-defect <what is broken>
```

Examples:

```
/mindforge:orch-fix-defect poller crashes on empty upstream response
/mindforge:orch-fix-defect login returns 500 when email has a plus sign
```

## What It Does

Activate the `orch-pipeline` skill (`.mindforge/skills/orch-pipeline/SKILL.md`)
with `$ARGUMENTS` as the request and `operation = fix-defect`. The engine will:

1. **Step 0 — size classifier**: classify size (default floor: **small**, often
   **tiny**); scope root cause with `/mindforge:map-codebase` if unclear.
2. **Write a new failing regression test** reproducing the bug, then fix until it
   goes green via `mindforge-tdd_extended`. (Proving the bug first is what makes
   this a fix, not a tweak.)
3. `/mindforge:review` (+ the `quick.md` security auto-trigger / `security-reviewer`
   if the defect sits in a sensitive path).
4. Commit as a conventional `fix(...)` commit + Merkle-linked AUDIT.jsonl entry.
   → **GATE 2** (confirm before commit).

Use this only when behavior is **broken/wrong** — not for intentional changes
(`/mindforge:orch-change-feature`) or new capability
(`/mindforge:orch-add-feature`).

If `$ARGUMENTS` is empty, ask the user to describe the defect.
