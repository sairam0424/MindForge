# Cost Tracking — Token Ledger Specification

## Purpose
Append-only ledger recording all token usage for analytics, budgeting, and optimization.

## Storage

- Location: `.mindforge/metrics/token-ledger.jsonl`
- Format: JSON Lines (one entry per model interaction)
- Rotation: Archive entries older than 30 days to `.mindforge/metrics/archive/`
- Retention: Archives kept for 90 days, then deleted

## Entry Format

Each line in the ledger is a complete JSON object:

```json
{
  "id": "txn-[uuid]",
  "timestamp": "2026-05-25T10:30:00Z",
  "session_id": "session-abc123",
  "task_id": "task-def456",
  "phase": "execute",
  "model": "claude-sonnet-4-6",
  "tier": "standard",
  "routing_reason": "difficulty_score_5_multi_file",
  "tokens": {
    "input": 12500,
    "output": 3200,
    "cached_input": 8000,
    "total": 15700
  },
  "cost_usd": 0.085,
  "budget_remaining": {
    "session": 4.915,
    "project_weekly": 49.915
  },
  "task_type": "implementation",
  "files_touched": 3,
  "skills_loaded": ["code-quality", "testing-standards"],
  "outcome": "success"
}
```

## Reporting Queries

The `/mindforge:cost-report` command reads this ledger to produce:

### By Model
```
Model           | Calls | Tokens    | Cost    | % of Total
----------------|-------|-----------|---------|----------
claude-sonnet   | 45    | 580,000   | $4.50   | 62%
claude-opus     | 8     | 210,000   | $8.25   | 28%
claude-haiku    | 120   | 350,000   | $0.75   | 10%
```

### By Task Type
```
Type            | Avg Cost | Avg Tokens | Count
----------------|----------|------------|------
implementation  | $0.42    | 18,500     | 23
code-review     | $0.15    | 8,200      | 15
debugging       | $0.85    | 32,000     | 8
```

### Efficiency Metrics
- Cache hit rate: % of input tokens served from cache
- Routing accuracy: % of tasks where tier matched actual complexity
- Over-spend rate: % of tasks that exceeded their estimated budget

## Integration

- Written to by the budget-enforcer after every model interaction
- Read by `/mindforge:cost-report` command
- Summarized weekly into `.mindforge/metrics/weekly-cost-summary.json`
- Referenced by AgRevOps dashboard for ROI tracking
