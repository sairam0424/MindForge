---
description: "Implementer vs. scorer loop: revise each round, score against a fixed metric, keep re-attempting until the score is maxed or a round cap is hit"
---
# /mindforge:wf-verification-loop

Runs the **Verification Loop** dynamic workflow.

## Usage
`/mindforge:wf-verification-loop [task description, or { task, metric, targetScore, maxRounds }]`

## What it does
- **Scope**: Pins the artifact, the metric, and the target score / max-round cap
- **Round**: An implementer agent revises the artifact; a separate scorer agent grades it
  against the same fixed rubric every round; repeats until the target score is hit, the
  score plateaus for `plateauRounds` consecutive rounds, or `maxRounds` is reached
- **Report**: Round-by-round score history plus the final artifact

Unlike a fixed-count review pass, this loop's whole point is that the implementer keeps
re-attempting the SAME task, judged by a separate scorer, until the score stops moving —
not a one-shot audit.

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/verification-loop.js",
  args: {
    task: "Tighten this system prompt for token efficiency without losing instruction coverage",
    metric: "10 pts clarity, 10 pts token economy, 10 pts no lost instructions",
    targetScore: 95,
    maxRounds: 8
  }
})
```

`args` can also be a plain string task description if you want the scorer to infer and
hold its own rubric. Defaults: `targetScore` 95, `maxRounds` 8, `plateauRounds` 2 (stop
early if the score doesn't improve for 2 consecutive rounds).

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info verification-loop
```
