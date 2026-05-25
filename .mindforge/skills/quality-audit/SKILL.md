---
name: quality-audit
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: quality audit, quality score, clarity score, completeness check, accuracy check, usefulness score, four-dimension, weighted scoring, quality scoring, output quality, quality threshold, quality comparison
---

# Skill — Quality Audit (Four-Dimension Weighted Scoring)

## When this skill activates
When evaluating the quality of any output — code, documentation, architecture
decisions, generated content, or deliverables. Use to enforce a consistent,
evidence-based quality bar across all work products. Especially valuable when
"good enough" is ambiguous and you need a defensible, repeatable score.

Three modes of operation:
- **Quick mode**: Accuracy dimension only (fast gate check)
- **Full mode**: All 4 dimensions scored (standard quality gate)
- **Comparative mode**: Score artifact A vs artifact B on all dimensions

## Mandatory actions when this skill is active

### Before scoring

1. **Identify the artifact type** — code, documentation, API design, generated output, architecture decision, etc.
2. **Select scoring mode:**
   - Quick: when you need a fast go/no-go on factual correctness
   - Full: standard quality gate for all deliverables
   - Comparative: when choosing between alternatives
3. **Load custom rubric** (if exists): check `validation/rubric.yaml` in project root or `.mindforge/validation/rubric.yaml`
4. **Establish context**: what is this artifact supposed to accomplish? Who is the audience?

### During scoring

**The Four Dimensions:**

| Dimension | Weight | Definition | Measures |
|-----------|--------|------------|----------|
| Clarity | 25% | How easily understood is the output? | Structure, naming, formatting, progressive disclosure, lack of ambiguity |
| Completeness | 25% | Does it cover all requirements? | Missing cases, TODOs, partial implementations, unstated assumptions |
| Accuracy | 30% | Is it factually and logically correct? | Bugs, wrong behavior, incorrect statements, logic errors, type mismatches |
| Usefulness | 20% | Does it solve the actual problem? | User value, practical applicability, appropriate scope, actionability |

**5-Point Scale (apply consistently):**

| Score | Label | Meaning |
|-------|-------|---------|
| 1 | Poor | Fundamentally broken, requires complete rewrite |
| 2 | Below Average | Significant issues, multiple major fixes needed |
| 3 | Acceptable | Meets minimum bar, minor issues remain |
| 4 | Good | Solid work, only cosmetic improvements possible |
| 5 | Excellent | Exemplary, could serve as a reference implementation |

**Scoring Protocol:**
1. Read the entire artifact before scoring any dimension
2. Score each dimension independently (don't let one influence others)
3. Provide specific evidence for each score (line numbers, examples, quotes)
4. Calculate weighted average: `(Clarity * 0.25) + (Completeness * 0.25) + (Accuracy * 0.30) + (Usefulness * 0.20)`

**Passing Thresholds:**
- **Weighted average >= 3.0** — artifact passes overall quality gate
- **Accuracy >= 3.0 (BLOCKING)** — accuracy must independently meet this bar regardless of other scores
- An artifact with Clarity=5, Completeness=5, Accuracy=2, Usefulness=5 still FAILS (accuracy blocking gate)

**Scoring Output Format:**
```json
{
  "mode": "quick" | "full" | "comparative",
  "artifact": "description",
  "timestamp": "ISO-8601",
  "scores": {
    "clarity": {
      "score": 1-5,
      "weight": 0.25,
      "evidence": ["specific observation 1", "specific observation 2"],
      "improvements": ["actionable suggestion"]
    },
    "completeness": {
      "score": 1-5,
      "weight": 0.25,
      "evidence": ["..."],
      "improvements": ["..."]
    },
    "accuracy": {
      "score": 1-5,
      "weight": 0.30,
      "evidence": ["..."],
      "improvements": ["..."],
      "blocking_gate": true
    },
    "usefulness": {
      "score": 1-5,
      "weight": 0.20,
      "evidence": ["..."],
      "improvements": ["..."]
    }
  },
  "weighted_average": 0.0,
  "accuracy_gate_passed": true | false,
  "overall_verdict": "PASS" | "FAIL",
  "fail_reason": "null | description"
}
```

**Quick Mode (accuracy only):**
- Score only the Accuracy dimension
- Pass if Accuracy >= 3.0
- Use when you need a fast gate check and other dimensions are less relevant
- Output: simplified JSON with only accuracy scores

**Comparative Mode:**
- Score both artifacts A and B on all 4 dimensions
- Report per-dimension winner and overall winner
- Tie-breaking: Accuracy wins ties, then Usefulness, then Completeness, then Clarity
- Output includes side-by-side comparison table

**Custom Rubric Support:**
If `validation/rubric.yaml` exists, it overrides default dimension definitions:
```yaml
dimensions:
  clarity:
    weight: 0.20  # can adjust weights (must sum to 1.0)
    criteria:
      - "Code uses consistent naming conventions"
      - "Comments explain WHY, not WHAT"
    passing_score: 3
  accuracy:
    weight: 0.35
    criteria:
      - "All edge cases handled"
      - "No logic errors in conditional paths"
    passing_score: 4  # can raise the bar per-dimension
    blocking: true
```

### After scoring

1. **Determine verdict:**
   - If `accuracy_gate_passed == false` → FAIL (regardless of other scores)
   - If `weighted_average < 3.0` → FAIL
   - Otherwise → PASS

2. **If FAIL:**
   - List all dimensions below threshold
   - Provide specific, actionable improvements for each
   - Prioritize: fix accuracy issues first (blocking), then lowest-scoring dimension
   - Re-score after fixes (don't assume the fix worked)

3. **If PASS:**
   - Log the score to `.mindforge/quality/[artifact-name]-[timestamp].json`
   - Note any dimensions at exactly 3.0 (borderline — flag for future improvement)
   - Record the weighted average as the artifact's quality score

4. **Track trends:**
   - Compare current score to previous scores for same artifact type
   - If quality trending downward: flag in session report
   - If quality consistently above 4.0: consider raising the threshold

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I score all 4 dimensions (unless using quick mode)?
- [ ] Did I check the accuracy blocking gate independently?
- [ ] Did I provide specific evidence (not just scores) for each dimension?
- [ ] Did I calculate the weighted average correctly?
- [ ] If the artifact failed: did I provide actionable improvements?
- [ ] If using custom rubric: did I load it from validation/rubric.yaml?
- [ ] Is the scoring output in structured JSON format?
- [ ] Did I avoid letting one dimension's score influence another?
