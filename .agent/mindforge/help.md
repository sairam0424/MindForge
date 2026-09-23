---
description: Show all available MindForge commands.
---

Show all available MindForge commands.

## Pre-check
If `.planning/STATE.md` exists, read it.
If `.planning/PROJECT.md` is missing, treat the project as "Not initialised".

1. Scan every .md file in `.claude/commands/mindforge/`
2. For each file, extract the first non-empty line as the command description
3. Display as a clean table:

| Command                      | Description                                  |
|------------------------------|----------------------------------------------|
| /mindforge:help              | Show all available commands                  |
| /mindforge:init-project      | ...                                          |
| ...                          | ...                                          |

## Sovereign Intelligence (v6.2.0-alpha) — status
- **PQAS**: Post-Quantum Agentic Security is simulated/inactive by default (`pqas_enabled=false`,
  gated behind `experimental.pqc_demo` in `.mindforge/config.json`; see MINDFORGE.md
  `[PQAS_ENFORCED]`). There is no biometric/executive bypass gate. Tier-3 trust uses real Ed25519
  signing, not PQAS.
- **Proactive Homing**: advisory framing around `bin/autonomous/intent-harvester.js` — not a
  verified drift-detection guarantee.
- **Integrity**: `/mindforge:security-scan` does not verify framework signatures via lattice-based
  cryptography — see that command's own Step 1.5 for what it actually checks.

4. After the table, print:
   "Current project: [read PROJECT.md first line, or 'Not initialised']"
   "Current phase:   [read STATE.md current phase, or 'None']"
   "Next step:       [read STATE.md next action]"

5. If CLAUDE.md has not been read this session, remind the user to ensure
   it is loaded as MindForge's system context.
