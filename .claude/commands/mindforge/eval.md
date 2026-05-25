---
description: Score the last task using eval-harness rubrics and track pass@k metrics. Usage - /mindforge:eval [eval-name] [--grader code|model|human] [--k 5] [--type capability|regression]
---

<objective>
Apply structured evaluation to the last task output, tracking metrics over time
to detect capability regression and measure improvement.
</objective>

<execution_context>
@.mindforge/skills/eval-harness/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse eval-name (required — identifies the evaluation being run).
2. Load or create eval config from `.mindforge/evals/[eval-name]/config.json`.
3. Determine grader type: --grader code (deterministic assertions) | model (LLM-as-judge) | human (flag for review).
4. Determine eval type: --type capability (new feature) or regression (existing behavior).
5. If pass@k requested (--k N): generate N outputs for the same input.
6. Apply grading rubric from `.mindforge/evals/[eval-name]/rubric.md`.
7. For code grader: run assertions, compute binary pass/fail per criterion.
8. For model grader: score each criterion 1-5 with reasoning, compute average.
9. For human grader: present output with rubric, collect scores interactively.
10. Compute pass@k: how many of k attempts passed all criteria.
11. Compare result to baseline in `results.jsonl` — detect regression (score drop > 10%).
12. Append result to `.mindforge/evals/[eval-name]/results.jsonl`.
13. Report: score, pass@k, trend (improving/stable/regressing), delta from baseline.
14. Log eval event in AUDIT.
</process>
