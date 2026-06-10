---
description: Orchestrate bootstrapping a working MVP from a design/spec doc — ingest, slice, scaffold, TDD, review, gated commit. Thin wrapper over the orch-pipeline skill (build loop delegates to the swarm; GAN harness deferred).
---

# MindForge — Orch: Build MVP
# Usage: /mindforge:orch-build-mvp <path to design/spec doc>

Manually launch the **build-mvp** orchestration: turn an SDD/PRD/system-design
document into a running vertical slice.

## Usage

```
/mindforge:orch-build-mvp <path to design/spec doc>
```

Examples:

```
/mindforge:orch-build-mvp docs/SDD-v0.6.md
/mindforge:orch-build-mvp .planning/REQUIREMENTS.md
```

## What It Does

Activate the `orch-pipeline` skill (`.mindforge/skills/orch-pipeline/SKILL.md`)
with `$ARGUMENTS` as the doc path and `operation = build-mvp` (default floor:
**large**, full pipeline incl. Scaffold). The engine will:

1. **Step 0 — size classifier** (floor large). Read the spec; extract scope,
   locked decisions, and a feature list ordered as **thin vertical slices** (one
   end-to-end path first), written as MindForge XML under `.planning/` via
   `/mindforge:plan-write`. → **GATE 1** (approve slice plan).
2. Scaffold the first end-to-end slice.
3. **Build loop — delegate to the swarm.** Drive each vertical slice through
   `WaveExecutor` / the `mindforge-swarm-execution` protocol
   (`.mindforge/engine/wave-executor.md`), with `SwarmController`
   (`.mindforge/engine/swarm-controller.md`) selecting the cluster, gated by
   `mindforge-tdd_extended` (Red-Green) and `/mindforge:cross-review`.
   > **GAN harness is deferred** — the ECC GAN generate/evaluate inner loop
   > (`/gan-build`, generator → evaluator) is NOT ported. See the DESCOPE note in
   > the orch-pipeline skill.
4. `/mindforge:review` (+ the `quick.md` security auto-trigger / `security-reviewer`
   on any security-trigger slice), then commit the scaffold and each slice as
   separate conventional `feat(...)` commits, each writing a Merkle-linked
   AUDIT.jsonl entry. → **GATE 2**.

If `$ARGUMENTS` is empty, ask the user for the path to the design/spec doc.
