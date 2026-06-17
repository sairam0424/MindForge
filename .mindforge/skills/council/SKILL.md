---
name: council
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: council, multi-voice, decision debate, architectural decision, trade-off, ambiguous, contentious, ADR, design decision, breaking change
---

# Skill — Council (Multi-Voice Decision)

## When this skill activates
Any ambiguous architectural decision where multiple valid approaches exist,
when resolving contentious technical choices, or when the Adversarial Decision
Loop (ADS) produces a split verdict.

## Mandatory actions when this skill is active

### Before invoking council
1. Verify the decision actually warrants multi-voice debate:
   - Are there 2+ genuinely viable options? (If one is obviously best, skip council)
   - Is the decision hard to reverse? (If easily reversible, just pick one and iterate)
   - Does the decision affect multiple stakeholders or systems?
2. Frame the decision clearly with: context, options, constraints, and stakes.

### The Four Voices

| Voice | Asks | Bias (intentional) |
|-------|------|-------------------|
| **Architect** | "What scales? What's maintainable in 2 years?" | Elegant, extensible systems |
| **Skeptic** | "What breaks? What haven't we considered?" | Caution, hidden failure modes |
| **Pragmatist** | "What ships? What delivers value soonest?" | Delivery speed, incrementalism |
| **Critic** | "What's excellent? What meets our standards?" | Quality, craftsmanship |

### Council Protocol
1. **Frame** — Present decision with context, options, constraints
2. **Positions** — Each voice states recommendation + top 3 reasons + confidence (0-1)
3. **Challenge** — Each voice rebuts the strongest counterargument
4. **Synthesize** — Produce verdict with consensus score
5. **Output** — Write to `.planning/decisions/COUNCIL-[timestamp].md`

### Interpreting Results

| Consensus Score | Meaning | Action |
|----------------|---------|--------|
| >= 0.85 | Strong agreement | Proceed with confidence |
| 0.65 - 0.84 | Moderate agreement | Proceed but address dissent concerns |
| 0.50 - 0.64 | Weak agreement | Seek user input before proceeding |
| < 0.50 | No consensus | Present all options to user, defer decision |

### Guardrails
- Council is ADVISORY — user always has final say
- Maximum 2 rounds (initial + challenge). No infinite debates.
- Each voice limited to 200 words per round
- If consensus < 0.5: do NOT auto-select. Report "No consensus" honestly.
- Always document dissent — suppressed minority opinions create tech debt
- Use council templates (see `council-templates.md`) for common decision types

### After council
- Write the decision record to `.planning/decisions/`
- If the decision creates an ADR: also write to `docs/adr/`
- Log council invocation and verdict in AUDIT
- Track the Skeptic's unmitigated risks as action items

## Self-check before task completion
- [ ] Did I verify the decision warranted a council (not a simple choice)?
- [ ] Did I document all dissenting opinions (never suppressed)?
- [ ] Did I write the council verdict to .planning/decisions/?
- [ ] Did I remind the user that council is advisory (user has final say)?
