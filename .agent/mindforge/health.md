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

## Sovereign Intelligence Checks (v6.2.0-alpha)
These are file-presence checks only, not functional verification — PQAS is simulated/inactive by
default (`pqas_enabled=false` in `.mindforge/config.json`; see MINDFORGE.md `[PQAS_ENFORCED]`).
- **PQAS file present**: Check `bin/governance/quantum-crypto.js` exists (the module itself has no
  CLI entrypoint and performs no framework-signature verification)
- **Homing file present**: Check `bin/autonomous/intent-harvester.js` exists
- **Self-Healer file present**: Check `bin/autonomous/mesh-self-healer.js` exists
- **Policy check**: Read `bin/governance/policy-engine.js` for illegal bypass additions

## Flags
- `--repair`: apply safe auto-repair only
- `--category`: one of `installation|context|skills|personas|state|integrations|security`
- `--verbose`: include passing checks and exact inspected values

## AUDIT
Append:
```json
{ "event": "health_check_completed", "errors": 0, "warnings": 0, "repaired": 0 }
```
