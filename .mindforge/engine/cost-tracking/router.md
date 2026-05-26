# Cost Tracking — Model Router

## Purpose
Select the optimal model for each task based on complexity scoring, token budget,
and cost-performance tradeoffs. Routes tasks to the cheapest model that can handle them.

## Model Tiers

| Tier | Model | Cost/1M tokens (est.) | Use When |
|------|-------|----------------------|----------|
| simple | claude-haiku-4-5 | $0.25/$1.25 | Single-file edits, formatting, simple lookups, file reads |
| standard | claude-sonnet-4-6 | $3/$15 | Multi-file implementation, code review, 90% of daily tasks |
| complex | claude-opus-4-7 | $15/$75 | Architecture decisions, security audits, debugging hard problems |
| research | gemini-2.5-pro | ~$1.25/$10 | External research, web search synthesis, long-context analysis |
| consult | gpt-4o | ~$2.50/$10 | Second opinions, alternative perspectives, validation |

## Routing Decision Matrix

The router uses the difficulty score from `.mindforge/intelligence/difficulty-scorer.md`:

| Difficulty Score | Files Touched | Recommended Tier |
|-----------------|---------------|-----------------|
| 1-3 | 1 file | simple |
| 3-6 | 1-3 files | standard |
| 6-8 | 3-7 files | complex |
| 8-10 | 7+ files OR architectural | complex |
| Any (research needed) | N/A | research |

## Override Rules

These always override the matrix:
- Security-sensitive tasks (auth/payment/PII): minimum **standard** tier
- Architectural decisions (ADRs, new systems): minimum **complex** tier  
- Simple file reads/exploration: always **simple** tier regardless of score
- Multi-LLM consult requests: use **consult** + **research** tiers

## Routing Protocol

1. Receive task description and file list
2. Run difficulty scorer → get score 1-10
3. Map score to tier via decision matrix
4. Apply override rules
5. Check budget: if remaining budget < estimated cost, downgrade one tier with WARNING
6. Log routing decision to token-ledger.jsonl
7. Return selected model ID

## Budget Guard

If the session's cumulative cost exceeds thresholds from MINDFORGE.md:
- `[COST_WARN_USD]` → Log warning, continue
- `[COST_HARD_LIMIT_USD]` → HALT, require user confirmation to continue

## Downgrade Protocol

When budget is tight but task is critical:
1. Attempt at lower tier first (standard instead of complex)
2. If result quality is insufficient (verification fails): escalate to correct tier
3. Log the escalation with reason in AUDIT
