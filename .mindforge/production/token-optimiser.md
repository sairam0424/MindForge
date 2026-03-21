# MindForge Production — Token Usage Optimiser

## Purpose
Measure, profile, and systematically reduce Claude API token consumption.
Token efficiency impacts both cost and session quality — a session that
exhausts its context on large file reads has less capacity for reasoning.

## Token consumption model

### Where tokens are spent in a typical MindForge session

| Component | Typical estimate | Notes |
|---|---|---|
| Session startup (CLAUDE.md + ORG.md + PROJECT.md + STATE.md) | 4,000–9,000 | Fixed per session |
| Each skill injected (full) | 2,500–6,000 | Depends on skill complexity |
| Each skill injected (summary) | 300–600 | When > 3 skills loaded |
| PLAN file per task | 400–1,800 | Lean plans save 800+ tokens |
| File reading per task | 1,500–50,000 | Biggest variable cost |
| Agent reasoning + response | 1,500–8,000 | |
| Verify step + output | 400–1,500 | |

**Note:** These are estimates based on typical MindForge projects.
Actual values depend on file sizes, code complexity, and model verbosity.
Run `/mindforge:tokens` to see measured estimates for your project.

### Token efficiency threshold

| Efficiency | Meaning | Action |
|---|---|---|
| > 45% | Excellent — agent spending time on reasoning and output | No action |
| 35–45% | Good — healthy balance | No action |
| 20–35% | Acceptable — room to optimise | Review high-cost sessions |
| < 20% | Poor — most tokens spent on reading, not reasoning | Apply optimisations below |

## Token usage logging

Token profiles are written to `.planning/token-usage.jsonl`.
All values are **estimates** (not measured) unless otherwise noted.
Every entry must include `measured: false` to avoid confusion.

### Estimation rules
- `code_reading_tokens` = sum of file sizes read / 4
  (Average 4 characters per token is a reasonable proxy for code.)
- `plan_tokens` = PLAN file size / 4
- `summary_tokens` = SUMMARY file size / 4
- `useful_output_tokens` = sum of SUMMARY file sizes / 4
  (SUMMARY files are the best proxy for verified output.)

### Example entry
```json
{
  "timestamp": "2026-03-22T08:10:00.000Z",
  "phase": 1,
  "plan": "02",
  "measured": false,
  "token_estimates": {
    "startup": 6200,
    "code_reading": 18400,
    "plan": 900,
    "summary": 600,
    "agent_output": 4200,
    "total": 30300
  },
  "useful_output_tokens": 600,
  "efficiency": 0.20,
  "flags": []
}
```
