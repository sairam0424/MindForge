# Cost Tracking — Budget Enforcer

## Purpose
Monitor and enforce token budgets across sessions, preventing runaway costs
while maintaining quality standards.

## Budget Hierarchy

```
Organization budget (monthly)
  └── Project budget (weekly)
       └── Session budget (per-session)
            └── Task budget (per-task)
```

## Default Budgets (configurable in config.json)

| Scope | Default | Hard Limit |
|-------|---------|-----------|
| Session | $5.00 | $20.00 |
| Task | $1.00 | $5.00 |
| Project (weekly) | $50.00 | $200.00 |

## Enforcement Rules

### Pre-Task Check
Before each task starts:
1. Estimate tokens required (based on task type + file count)
2. Compare estimate against remaining budget at all levels
3. If estimate > remaining at ANY level: warn user with breakdown
4. If hard limit reached at ANY level: block execution, require override

### During-Task Monitoring
- Track actual tokens consumed per model call
- Running total visible via `/mindforge:cost-report`
- If task exceeds its estimate by 2x: pause and report

### Post-Task Accounting
After each task completes:
1. Record actual tokens: input, output, cached, by model
2. Update all budget levels (session, project)
3. Compare actual vs estimated (for future estimation accuracy)

## Token Counting

For each model interaction, record:
```json
{
  "timestamp": "ISO-8601",
  "task_id": "task-uuid",
  "model": "claude-sonnet-4-6",
  "tokens_input": 12500,
  "tokens_output": 3200,
  "tokens_cached": 8000,
  "estimated_cost_usd": 0.085,
  "routing_tier": "standard",
  "routing_reason": "difficulty_score_5"
}
```

## Optimization Recommendations

The enforcer generates recommendations when patterns indicate waste:
- "Task X used opus but produced a simple edit → suggest standard tier"
- "80% of tokens were re-sent context → suggest compaction"
- "3 consecutive tasks hit the same files → suggest batching"

These appear in `/mindforge:cost-report` output.
