---
description: Run multi-angle verification by spawning 2-3 independent reviewers on current work. Usage - /mindforge:santa [scope] [--angles 2|3] [--batch-sample]
---

<objective>
Verify current work through multiple independent reviewers with isolated context.
Both reviewers must pass (AND gate) to approve. Eliminates author-bias.
</objective>

<execution_context>
@.mindforge/skills/santa-method/SKILL.md
@.mindforge/engine/verification-pipeline.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse scope from arguments (default: current uncommitted diff).
2. Determine angle count (default: 2, max: 3 via --angles flag).
3. Prepare isolated context for each reviewer (strip cross-references between reviewers).
4. Define shared rubric: correctness, edge cases, security, maintainability (scored 1-5 each).
5. Spawn Reviewer 1 with Angle A (correctness + logic focus).
6. Spawn Reviewer 2 with Angle B (edge cases + security focus).
7. If --angles 3: Spawn Reviewer 3 with Angle C (performance + maintainability focus).
8. Collect independent verdicts (JSON format with pass/fail + score + findings).
9. Apply AND gate: ALL reviewers must pass. If any fail → mark as FAILED.
10. If disagreement (one pass, one fail): run convergence loop — narrow to specific findings, re-evaluate (max 2 rounds).
11. If --batch-sample: select 10-15% of outputs for review (for large artifact sets).
12. Output final verdict with per-angle scores and combined confidence.
13. Log santa verification event in AUDIT with verdict and reviewer count.
</process>
