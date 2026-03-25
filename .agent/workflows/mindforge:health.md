---
description: Run all seven health-engine categories from .mindforge/intelligence/health-engine.md.
---
# MindForge — Health Command
# Usage: /mindforge:health [--repair] [--category C] [--verbose]

Run all seven health-engine categories from `.mindforge/intelligence/health-engine.md`.

## Output
- category status summary
- errors (must fix)
- warnings (should fix)
- informational signals

## Flags
- `--repair`: apply safe auto-repair only
- `--category`: one of `installation|context|skills|personas|state|integrations|security`
- `--verbose`: include passing checks and exact inspected values

## AUDIT
Append:
```json
{ "event": "health_check_completed", "errors": 0, "warnings": 0, "repaired": 0 }
```
