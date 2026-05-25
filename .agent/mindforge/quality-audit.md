---
description: Run weighted 4-dimension quality scoring on current output. Usage - /mindforge:quality-audit [target] [--mode quick|full|comparative] [--compare path]
---

<objective>
Score output quality across four weighted dimensions (Clarity, Completeness,
Accuracy, Usefulness) with a blocking accuracy gate.
</objective>

<execution_context>
@.mindforge/skills/quality-audit/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Parse target (file/diff/output to evaluate) and mode (default: full).
2. If --mode quick: evaluate Accuracy dimension only (fast gate check).
3. If --mode full: evaluate all 4 dimensions.
4. If --mode comparative: load --compare target, score BOTH, produce delta.
5. For each dimension, score 1-5 with specific evidence citations:
   - Clarity (25%): Is it understandable? Unambiguous? Well-structured?
   - Completeness (25%): Does it cover all requirements? Any gaps?
   - Accuracy (30%): Is it factually correct? Do code refs exist? Do examples work?
   - Usefulness (20%): Does it solve the actual problem? Is it actionable?
6. Compute weighted average: (clarity*0.25 + completeness*0.25 + accuracy*0.30 + usefulness*0.20).
7. Check blocking gate: if accuracy < 3.0 → FAIL regardless of other scores.
8. Determine verdict: weighted avg >= 3.0 AND accuracy >= 3.0 → PASS.
9. Report per-dimension scores, weighted average, verdict, and evidence.
10. If comparative: show side-by-side scores with improvement/regression indicators.
11. Log quality audit in AUDIT.
</process>
