# Cross-Model Eval — Multi-Model Comparison Protocol

## Purpose
Route the same task to two different models and compare outputs. Divergence
between models is a quality signal; agreement is a confidence booster.

## When to Trigger
- Architecture decisions (high stakes, hard to reverse)
- Security-critical code (auth, payment, PII handling)
- Agent confidence < 0.7 on current approach
- User explicitly requests second opinion (via /mindforge:consult)
- Eval-harness model-grader needs calibration

## Model Selection Logic

| Primary Model | Comparison Model | Rationale |
|--------------|-----------------|-----------|
| claude-sonnet-4-6 | gemini-2.5-pro | Different training, different strengths |
| claude-opus-4-7 | gpt-4o | Independent validation of complex reasoning |
| gemini-2.5-pro | claude-sonnet-4-6 | Verify research findings independently |

Selection follows the cost-routing tier: comparison model is always from a DIFFERENT provider than the primary.

## Comparison Method

### Step 1 — Sanitize Context
Same sanitization as multi-llm-consult skill:
- Remove internal file paths, variable names, proprietary logic
- Keep abstract question and public references

### Step 2 — Parallel Dispatch
Send identical sanitized prompt to both models simultaneously.

### Step 3 — Structural Comparison
Compare responses structurally (not token-by-token):
- Do they recommend the same approach/pattern?
- Do they identify the same risks?
- Do they agree on the key trade-offs?

### Step 4 — Divergence Classification

| Agreement Level | Meaning | Action |
|----------------|---------|--------|
| Full agreement | Both recommend same approach with same reasoning | High confidence — proceed |
| Partial agreement | Same recommendation, different reasoning | Moderate confidence — note alternate reasoning |
| Approach divergence | Different recommendations, shared concerns | Flag for human review with both perspectives |
| Full divergence | Different recommendations, different concerns | STOP — present both to user, defer decision |

### Step 5 — Output
Log to AUDIT entry:
```json
{
  "event": "cross_model_eval",
  "primary_model": "claude-sonnet-4-6",
  "comparison_model": "gemini-2.5-pro",
  "agreement_level": "partial",
  "primary_recommendation": "...",
  "comparison_recommendation": "...",
  "divergence_points": ["..."],
  "action_taken": "proceed_with_note"
}
```

## Budget Guard
- Maximum 2 cross-model evals per session (expensive operation)
- Each eval costs ~2x a normal model call
- Only trigger automatically on high-stakes decisions (not routine tasks)
- User can always override via /mindforge:consult (manual, no limit)

## Integration Points
- Cost-routing module determines which comparison model to use
- Multi-LLM consult skill handles the actual external dispatch
- Token-ledger records both model calls
- Council framework may trigger cross-model eval when consensus < 0.5
