# Council Framework — Synthesis Engine

## Purpose
Merge four independent council voices into a single coherent verdict with
confidence scoring, documented dissent, and actionable output.

## Synthesis Algorithm

### Input
Four voice outputs, each containing:
- recommended_option: string
- reasons: string[3]
- concerns_with_others: string[]
- confidence: float (0.0-1.0)
- post_challenge_confidence: float (after challenge round)

### Step 1 — Vote Counting
```
For each option:
  weighted_votes = sum(voice.confidence for voice if voice.recommended_option == option)
  
winner = option with highest weighted_votes
```

### Step 2 — Consensus Scoring
```
consensus = weighted_votes_for_winner / sum(all_confidences)

Interpretation:
  >= 0.85: Strong consensus (proceed with confidence)
  0.65-0.84: Moderate consensus (proceed but monitor risks)
  0.50-0.64: Weak consensus (consider user input)
  < 0.50: No consensus (present all options, defer to user)
```

### Step 3 — Dissent Identification
A voice is marked as dissenting if:
- They did NOT vote for the winning option AND
- Their post-challenge confidence remains > 0.6

Dissenting voices have their full reasoning preserved in the output.

### Step 4 — Risk Extraction
From the Skeptic voice (regardless of their vote):
- Extract all concerns rated "high" or "critical"
- These become the Risk Register
- Each risk must have a proposed mitigation or be flagged as unmitigated

### Step 5 — Factor Identification
Identify the top 3 deciding factors by:
1. Finding reasons that appear in 2+ voices' reasoning
2. Finding reasons from the winning voices with highest confidence
3. Prioritizing reasons that address the Skeptic's concerns

## Edge Cases

### Tie (2v2 split)
- If exactly 2 voices choose each option: report "Split verdict"
- Present both options with their respective advocates
- Recommend the option favored by Architect (as tiebreaker for technical decisions)
- Flag for user decision

### Single Dissenter with Very High Confidence
- If one voice has confidence > 0.9 while disagreeing with the majority:
- Include a "Strong Dissent Warning" in the output
- The dissenter's concerns get elevated visibility

### All Agree (4-0)
- Consensus = 1.0
- Still include the Skeptic's concerns (they may have low-confidence risks)
- Fast-path: skip challenge round if all initial confidences > 0.8
