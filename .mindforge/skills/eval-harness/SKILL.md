---
name: eval-harness
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: eval, evaluation, grading, pass at k, rubric, regression eval, capability eval, model judge, deterministic grading, LLM-as-judge, eval score, eval-driven, benchmark eval
---

# Skill — Eval Harness (Systematic Evaluation Framework)

## When this skill activates
When measuring, scoring, or validating system outputs against defined criteria.
Use for capability evaluation (can the system do X?), regression evaluation (does
a change break existing behavior?), or comparative evaluation (is version A better
than version B?). The eval harness ensures you define success BEFORE implementing,
not after.

Core principle: **Define-before-code** — write evaluation criteria before writing
the implementation they measure.

## Mandatory actions when this skill is active

### Before evaluation begins

1. **Define the eval type:**
   - **Capability eval**: Can the system perform task X at acceptable quality?
   - **Regression eval**: Does this change preserve existing behavior?
   - **Comparative eval**: Is output A better than output B on criteria C?

2. **Write the eval config BEFORE implementation:**
   ```
   .mindforge/evals/[eval-name]/
   ├── config.json      # eval metadata, parameters, thresholds
   ├── rubric.md        # human-readable success criteria
   ├── test-cases.json  # input/expected-output pairs
   └── results.jsonl    # append-only results log
   ```

3. **Define success criteria in config.json:**
   ```json
   {
     "name": "eval-name",
     "type": "capability" | "regression" | "comparative",
     "version": "1.0.0",
     "created": "ISO-8601",
     "thresholds": {
       "pass_at_1": 0.8,
       "pass_at_5": 0.95,
       "pass_at_10": 0.99
     },
     "grader": "code" | "model" | "human",
     "model_judge_config": {
       "model": "claude-sonnet",
       "rubric_path": "./rubric.md",
       "temperature": 0.0
     },
     "test_case_count": 0,
     "tags": []
   }
   ```

4. **Write the rubric (rubric.md) with explicit scoring:**
   - Each criterion gets a 1-5 scale with concrete examples at each level
   - Define what a "pass" means (minimum score per criterion)
   - Define what a "fail" looks like with specific examples
   - Include edge cases that should be tested

### During evaluation

**Three Grader Types:**

**1. Code-Based (Deterministic):**
- Use when outputs have objectively verifiable properties
- Write assertion functions that return PASS/FAIL with evidence
- Examples: output matches regex, JSON schema validates, function returns expected value
- No ambiguity — the grader is a function, not a judgment call
- Always prefer code-based grading when possible (fastest, most reliable)

```typescript
// Example code grader
function grade(output: string, expected: TestCase): GradeResult {
  const parsed = JSON.parse(output);
  return {
    pass: parsed.status === expected.status && parsed.count >= expected.minCount,
    evidence: `status=${parsed.status}, count=${parsed.count}`,
    criterion: "structural-correctness"
  };
}
```

**2. Model-Based (LLM-as-Judge):**
- Use when outputs require semantic understanding (prose quality, code correctness, reasoning)
- Always provide the rubric in the judge prompt — never rely on implicit standards
- Use temperature 0.0 for judge calls (determinism)
- Run judge 3x per item and take majority vote (reduces noise)
- Log the judge's reasoning alongside the score

```
Judge prompt structure:
1. Task description (what was the system asked to do?)
2. Rubric (what does good look like? what does bad look like?)
3. The output to grade
4. Instruction: score 1-5 per criterion, explain each score, give overall PASS/FAIL
```

**3. Human-Based (Flag for Review):**
- Use when stakes are too high for automated judgment
- Generate a review queue with: input, output, rubric, suggested-score
- Human confirms or overrides the suggested score
- Track inter-rater reliability if multiple humans review

**pass@k Metrics:**
- Generate k independent outputs for each test case
- **pass@1**: Fraction of test cases where the first output passes
- **pass@5**: Fraction where at least 1 of 5 outputs passes
- **pass@10**: Fraction where at least 1 of 10 outputs passes
- Formula: pass@k = 1 - C(n-c, k) / C(n, k) where n=total, c=correct
- Always report pass@1 (baseline) and at least one higher-k metric
- Use pass@1 for production readiness, pass@k for capability ceiling

**Result logging (results.jsonl):**
```json
{
  "timestamp": "ISO-8601",
  "test_case_id": "tc-001",
  "input": "...",
  "output": "...",
  "grader": "code",
  "scores": {"criterion_a": 4, "criterion_b": 5},
  "pass": true,
  "evidence": "...",
  "latency_ms": 0,
  "model_version": "...",
  "run_id": "uuid"
}
```

### After evaluation

1. **Compute aggregate metrics:**
   - Overall pass rate (pass@1, pass@5, pass@10)
   - Per-criterion score distribution
   - Failure mode clustering (what patterns cause failures?)
   - Comparison to previous run (regression detection)

2. **Regression detection logic:**
   - If pass@1 drops > 5% from previous run: FLAG as regression
   - If any previously-passing test case now fails: FLAG as regression
   - If new failure modes appear that didn't exist before: FLAG as regression
   - Regressions block shipping until investigated

3. **Store results:**
   - Append to results.jsonl (never overwrite)
   - Update config.json with latest run metadata
   - If regression detected: create `.mindforge/evals/[name]/REGRESSION.md`

4. **Report format:**
   ```
   ## Eval Report: [eval-name]
   - Type: capability | regression | comparative
   - Run: [run-id] at [timestamp]
   - Test cases: N total, P passed, F failed
   - pass@1: X% | pass@5: Y% | pass@10: Z%
   - Threshold: pass@1 >= T% → [MET / NOT MET]
   - Regressions: [none | list]
   - Top failure modes: [list with counts]
   ```

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I define success criteria BEFORE writing implementation code?
- [ ] Did I choose the appropriate grader type (code > model > human preference)?
- [ ] Did I track pass@k metrics (at minimum pass@1)?
- [ ] Did I run regression evals against previous results?
- [ ] Are results stored in `.mindforge/evals/[name]/results.jsonl`?
- [ ] If model-based grading: did I use temperature 0.0 and majority vote?
- [ ] Did I report failure modes, not just pass rates?
- [ ] Is the rubric explicit enough that another reviewer could grade independently?
