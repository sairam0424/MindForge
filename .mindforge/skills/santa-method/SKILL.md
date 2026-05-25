---
name: santa-method
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: santa, multi-angle verification, independent review, convergence, AND gate, double-check, dual review, parallel verification, cross-verification, rubric scoring, multi-reviewer, batch sampling
compose:
  - verification-loop
---

# Skill — Santa Method (Multi-Angle Independent Verification)

## When this skill activates
After any significant implementation, before shipping, or whenever author-bias
is suspected. Use when a single reviewer perspective is insufficient to guarantee
correctness — the Santa Method ensures two independent reviewers reach the same
conclusion without cross-contamination.

Named after the "making a list, checking it twice" principle: one pass is never enough
for high-stakes outputs.

## Mandatory actions when this skill is active

### Before review begins

1. **Identify the artifact under review** — code diff, architecture doc, API design, or generated output.
2. **Define the review rubric** — establish 3-7 criteria with clear pass/fail definitions before spawning reviewers.
3. **Prepare sanitized context packets** — each reviewer gets ONLY:
   - The artifact itself
   - The acceptance criteria / rubric
   - Relevant domain context (docs, types, schemas)
   - NO access to the other reviewer's notes, findings, or verdict
4. **Select reviewer perspectives** — choose complementary angles:
   - Reviewer A: Correctness & Logic (does it do what it claims?)
   - Reviewer B: Robustness & Edge Cases (what breaks it?)
   - Alternative pairs: Security/Functionality, UX/Architecture, Performance/Maintainability

### During review (parallel execution)

**Context Isolation Protocol:**
- Reviewer A and Reviewer B operate in separate reasoning contexts
- Neither reviewer sees the other's output until both have submitted
- If using sub-agents: spawn as independent tasks with no shared state
- If single-agent: complete Reviewer A's full assessment, seal it, then begin Reviewer B fresh

**Each reviewer MUST produce structured JSON output:**
```json
{
  "reviewer": "A",
  "perspective": "Correctness & Logic",
  "verdict": "PASS" | "FAIL" | "CONDITIONAL",
  "confidence": 0.0-1.0,
  "findings": [
    {
      "criterion": "string",
      "score": 1-5,
      "evidence": "specific line/section reference",
      "severity": "critical" | "major" | "minor" | "info"
    }
  ],
  "blocking_issues": [],
  "summary": "one-paragraph assessment"
}
```

**AND Gate Logic (non-negotiable):**
- PASS requires: Reviewer A = PASS **AND** Reviewer B = PASS
- If EITHER reviewer returns FAIL → overall verdict is FAIL
- If EITHER reviewer returns CONDITIONAL → enter convergence loop
- This is an AND gate, never an OR gate — both must independently agree

**Batch Sampling (for large outputs):**
- If the artifact exceeds 500 lines or 20 logical units:
  - Sample 10-15% of units for full santa review (random + targeted selection)
  - Targeted selection: always include security-sensitive, complex, and high-change-rate sections
  - If sampled sections fail: expand review to 30% or full artifact
  - Document which sections were sampled and which were skipped

### After review (convergence and resolution)

**If both reviewers PASS:**
- Record combined verdict as PASS
- Merge findings into unified report
- Log to `.mindforge/reviews/santa-[timestamp].json`

**If disagreement (convergence loop):**
1. Identify the specific criteria where reviewers diverge
2. Narrow scope to ONLY the disputed items
3. Re-evaluate disputed items with additional context (both reviewers now see each other's evidence for disputed items ONLY)
4. Round 2 verdict: apply AND gate again
5. If still disagreeing after Round 2: escalate to human decision with both perspectives presented
6. Maximum 2 convergence rounds — never infinite loops

**Convergence rules:**
- Round 1: Independent review (no cross-contamination)
- Round 2: Targeted re-review of disputed items only (both see each other's evidence)
- Round 3: NEVER — escalate to human if Round 2 fails
- Each round narrows scope (never broadens)

### Output format

Final santa review report:
```json
{
  "method": "santa-method",
  "artifact": "description of what was reviewed",
  "timestamp": "ISO-8601",
  "reviewer_a": { /* full reviewer output */ },
  "reviewer_b": { /* full reviewer output */ },
  "and_gate_result": "PASS" | "FAIL" | "ESCALATED",
  "convergence_rounds": 0-2,
  "disputed_items": [],
  "final_verdict": "PASS" | "FAIL" | "ESCALATED",
  "batch_sampling": {
    "total_units": 0,
    "sampled_units": 0,
    "sampling_percentage": 0.0,
    "sampling_strategy": "random+targeted"
  }
}
```

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did both reviewers have fully isolated context? (No cross-contamination)
- [ ] Did I apply the AND gate strictly? (Both must PASS, not just one)
- [ ] Were reviewer perspectives complementary, not redundant?
- [ ] Was convergence attempted on disagreement (max 2 rounds)?
- [ ] For large artifacts, was batch sampling applied (10-15%)?
- [ ] Was the rubric defined BEFORE review began?
- [ ] Is the final verdict supported by evidence from both reviewers?
- [ ] Was the review output stored in structured JSON format?
