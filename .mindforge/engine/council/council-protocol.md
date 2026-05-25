# Council Framework — Decision Protocol

## Purpose
A structured multi-voice decision harness for resolving ambiguous architectural
decisions. Four specialist voices debate from different perspectives, producing
a verdict with confidence scoring and documented dissent.

## When to Invoke Council

Council is appropriate when:
- Multiple valid approaches exist with non-obvious tradeoffs
- The decision affects system architecture (new systems, breaking changes)
- Team members (or prior sessions) have expressed conflicting preferences
- The Adversarial Decision Loop (ADS) produces a split verdict
- Tier 3 security escalations require multi-perspective review

Council is NOT appropriate for:
- Simple implementation choices with one obvious answer
- Bug fixes with clear root causes
- Tasks where the user has already made the decision

## The Four Voices

| Voice | Persona | Perspective | Bias (intentional) |
|-------|---------|-------------|-------------------|
| Architect | council-architect | System design, scalability, long-term | Favors elegant, extensible solutions |
| Skeptic | council-skeptic | Adversarial, edge cases, failure modes | Favors caution, surfaces hidden risks |
| Pragmatist | council-pragmatist | Delivery, time-to-value, incremental | Favors shipping, "good enough" |
| Critic | council-critic | Quality, craftsmanship, standards | Favors excellence, refuses shortcuts |

## Protocol Steps

### Step 1 — Frame the Decision
Present the decision to all four voices with:
- Context: what prompted this decision
- Options: the 2-4 approaches being considered
- Constraints: deadlines, budget, team capacity, existing tech debt
- Stakes: what happens if we get this wrong

### Step 2 — Individual Positions (parallel)
Each voice independently analyzes and states:
- Their recommended option
- Their top 3 reasons (from their perspective)
- Their biggest concern with the other options
- Confidence in their position (0.0-1.0)

### Step 3 — Challenge Round
Each voice responds to the strongest counterargument against their position:
- Acknowledge valid concerns
- Rebut where possible
- Adjust confidence if swayed

### Step 4 — Synthesis
The synthesis engine (see `synthesis-engine.md`) produces:
- Final verdict (the recommended option)
- Consensus score (0.0-1.0)
- Key factors that decided it
- Documented dissent (any voice that disagrees with confidence > 0.6)
- Risk register (concerns raised by Skeptic that remain unmitigated)

### Step 5 — Output
Write to `.planning/decisions/COUNCIL-[timestamp].md`:
```markdown
# Council Decision: [Title]
Date: [timestamp]
Consensus: [score]

## Verdict
[The recommended approach in 2-3 sentences]

## Positions
| Voice | Recommendation | Confidence | Aligned with Verdict? |
...

## Key Deciding Factors
1. ...
2. ...
3. ...

## Dissent
[Any voice that disagreed, with their reasoning]

## Risk Register
[Unmitigated concerns from the Skeptic]

## Action Items
[Concrete next steps based on the verdict]
```

## Guardrails

- Council is advisory — the user ALWAYS has final say (User Sovereignty principle)
- If consensus < 0.5: report "No consensus reached" and present all positions equally
- Council never auto-executes decisions; it only recommends
- Maximum 2 rounds (initial + challenge); no infinite debates
- Each voice is limited to 200 words per round
