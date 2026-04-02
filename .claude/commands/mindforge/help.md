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

## Sovereign Intelligence (v6.2.0-alpha)
MindForge now operates with **Sovereign Intelligence** enabled by default:
- **PQAS**: Post-Quantum Agentic Security is active. High-risk operations require biometric/executive bypass.
- **Proactive Homing**: The swarm now proactively harvests intent and self-heals reasoning drifts.
- **Integrity**: Every `security-scan` now verifies framework signatures using lattice-based cryptography.

4. After the table, print:
   "Current project: [read PROJECT.md first line, or 'Not initialised']"
   "Current phase:   [read STATE.md current phase, or 'None']"
   "Next step:       [read STATE.md next action]"

5. If CLAUDE.md has not been read this session, remind the user to ensure
   it is loaded as MindForge's system context.
