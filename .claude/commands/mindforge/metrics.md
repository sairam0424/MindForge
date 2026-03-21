# MindForge — Metrics Command
# Usage: /mindforge:metrics [--phase N] [--window short|medium|long] [--export path]

Display session and phase quality trends with early warning signals.

## Data sources
- `.mindforge/metrics/session-quality.jsonl`
- `.mindforge/metrics/phase-metrics.jsonl`
- `.mindforge/metrics/skill-usage.jsonl`
- `.mindforge/metrics/compaction-quality.jsonl`
- `.planning/AUDIT.jsonl` for correlation

## Dashboard sections
- session quality trend
- verify pass/security/failure/compaction summary
- skill usage distribution
- early warnings + recommendations

## AUDIT
```json
{ "event": "metrics_viewed", "window": "short", "early_warnings": 0 }
```
