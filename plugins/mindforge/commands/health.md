---
description: "Run all seven health-engine categories from .mindforge/intelligence/health-engine.md."
---

# MindForge — Health Command
# Usage: /mindforge:health [--repair] [--category C] [--verbose]

Run all seven health-engine categories from `.mindforge/intelligence/health-engine.md`.

## Output
- category status summary
- errors (must fix)
- warnings (should fix)
- informational signals

## Sovereign Intelligence Checks (v6.2.0-alpha)
- **PQAS Verification**: Check `bin/governance/quantum-crypto.js` presence
- **Homing Verification**: Check `bin/autonomous/intent-harvester.js` presence
- **Self-Healer Verification**: Check `bin/autonomous/mesh-self-healer.js` presence
- **Policy Check**: Verify `bin/governance/policy-engine.js` is Sovereign-configured

## Flags
- `--repair`: apply safe auto-repair only
- `--category`: one of `installation|context|skills|personas|state|integrations|security`
- `--verbose`: include passing checks and exact inspected values

## AUDIT
Append:
```json
{ "event": "health_check_completed", "errors": 0, "warnings": 0, "repaired": 0 }
```
