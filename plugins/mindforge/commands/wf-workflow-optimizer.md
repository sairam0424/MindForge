---
description: "Builder + scorer + a distinct process-optimizer role: proposes structural changes to the PROCESS itself across rounds, not just fixes to one output"
---
# /mindforge:wf-workflow-optimizer

Runs the **Workflow Optimizer** dynamic workflow.

## Usage
`/mindforge:wf-workflow-optimizer [task family description, or { taskFamily, metric, maxRounds, priorHistory }]`

## What it does
- **Scope**: Pins the task family, the fixed outcome metric, and any prior round history
  you supply (this script holds no state of its own between invocations)
- **Cycle**: A builder agent runs under the *current* process instructions; a separate
  scorer agent grades the output against the fixed metric; a **third, distinct
  process-optimizer agent** — with no role in building or scoring — diagnoses *why* the
  process produced that result and rewrites the builder's instructions for next round.
  Repeats until the optimizer judges the process has converged or `maxRounds` is hit.
- **Report**: The score trend across rounds alongside every round's structural diagnosis,
  so you can see whether rising scores came from real process changes, not just luck.

This is not "implementer vs. scorer, keep re-attempting the same task" (that's
`/mindforge:wf-verification-loop`, one artifact, one metric, no separate optimizer role).
This workflow's object of improvement is the **process itself** — the builder's own
instructions evolve round to round, and the deliverable includes that evolution history,
not just a final artifact.

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/workflow-optimizer.js",
  args: {
    taskFamily: "Write a one-paragraph executive summary of a technical incident postmortem",
    metric: "30 pts non-technical-reader clarity, 30 pts root-cause traceability, 40 pts action-item concreteness",
    maxRounds: 5
  }
})
```

To continue optimizing the SAME process across separate sessions, pass the previous run's
returned `processHistory` back in as `args.priorHistory` — the script itself has no
filesystem access and keeps no state between invocations, so cross-session continuity is
the caller's responsibility.

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info workflow-optimizer
```
