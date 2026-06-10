---
description: "Create, verify, or list lightweight workflow checkpoints — name + timestamp + git SHA + a metrics delta between two points."
---

# MindForge — Checkpoint Command
# Usage: /mindforge:checkpoint [create|verify|list|clear] [name]

Lightweight progress markers for a work session. A checkpoint records a name,
timestamp, git SHA, and a metrics snapshot (files changed, test pass-rate,
coverage, build status), so you can measure forward progress and catch regressions
between two points. Distinct from milestones (project lifecycle) — checkpoints are
intra-session.

## Create Checkpoint

1. Run `/mindforge:verify-loop` (or `verify-phase`) to confirm current state is clean.
2. Capture the marker:

```bash
echo "$(date +%Y-%m-%d-%H:%M) | $CHECKPOINT_NAME | $(git rev-parse --short HEAD)" >> .planning/CHECKPOINTS.log
```

3. Snapshot metrics: changed-file count, test pass-rate, coverage %, build status.
4. Report checkpoint created.

## Verify Checkpoint

1. Read the named checkpoint from `.planning/CHECKPOINTS.log`.
2. Compare current state to the checkpoint:

```
CHECKPOINT COMPARISON: $NAME
============================
Files changed:  X
Tests:          +Y passed / -Z failed
Coverage:       +X% / -Y%
Build:          [PASS/FAIL]
```

3. If any metric regressed (tests down, coverage down, build broken), flag it loudly
   — a checkpoint verify that shows regression is a stop signal.

## List Checkpoints

Show all checkpoints with name, timestamp, git SHA, and status (current / behind /
ahead relative to HEAD).

## Clear

Remove old checkpoints, keeping the last 5.

## Workflow

```
[Start]     -> /mindforge:checkpoint create "feature-start"
[Implement] -> /mindforge:checkpoint create "core-done"
[Test]      -> /mindforge:checkpoint verify "core-done"
[Refactor]  -> /mindforge:checkpoint create "refactor-done"
[PR]        -> /mindforge:checkpoint verify "feature-start"
```

## AUDIT linkage

Each create/verify optionally writes a Merkle-linked AUDIT.jsonl entry:

```json
{ "event": "checkpoint_created", "name": "core-done", "sha": "abc1234", "tests_pass_rate": 1.0, "coverage": 0.0 }
```

## Arguments

$ARGUMENTS:
- `create <name>` — create a named checkpoint
- `verify <name>` — verify current state against a named checkpoint
- `list` — show all checkpoints
- `clear` — remove old checkpoints (keeps last 5)
