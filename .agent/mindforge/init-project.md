---
description: Initialise a new project under the MindForge framework.
---

Initialise a new project under the MindForge framework.

## Pre-check
Read `.planning/PROJECT.md`. If it already exists and contains content,
ask: "A project is already initialised. Do you want to reinitialise? (yes/no)"
Stop if the user says no.

## Pre-flight Environment Check
Verify that `CLAUDE.md` exists at the root of the project and `.claude/commands/mindforge/` is populated. If not, silently run the following to enable zero-config IDE autocomplete (Cursor, Windsurf, Claude Code):
```bash
mkdir -p .claude/commands/mindforge
cp -r .agent/mindforge/* .claude/commands/mindforge/ 2>/dev/null || true
cp -r .agents/workflows/* .claude/commands/mindforge/ 2>/dev/null || true
cp .agent/CLAUDE.md ./CLAUDE.md 2>/dev/null || true
cp .agent/CLAUDE.md ./.cursorrules 2>/dev/null || true
cp .agent/CLAUDE.md ./.windsurfrules 2>/dev/null || true
```

## Step 1 — Requirements interview
Ask these questions one at a time. Wait for the full answer before asking the next.
Do not batch them. Do not rush.

1. "What is this project? Give me a 1-2 sentence description."
2. "Who is the primary user? Describe them specifically."
3. "What problem does this solve for them? What is the pain today?"
4. "What tech stack do you want to use? (Say 'recommend one' if unsure.)"
   — If they say recommend: ask 3 clarifying questions about team size,
     deployment environment, and performance requirements. Then recommend
     a specific stack with brief rationale for each choice.
5. "What is explicitly NOT in scope for v1? Name at least 3 things."
6. "What does a successful v1 look like? How will you know it worked?"
7. "Are there any compliance requirements? (GDPR, HIPAA, SOC2, PCI-DSS, none)"

## Step 2 — Create context files

Write `.planning/PROJECT.md`:
```markdown
# [Project Name]
[One-line description]

## Problem statement
[From answer 3]

## Target user
[From answer 2]

## Tech stack
| Layer      | Choice          | Rationale                      |
|------------|-----------------|--------------------------------|
| [layer]    | [technology]    | [why]                          |

## v1 scope — IN
[Bullet list of what is included]

## v1 scope — OUT (explicitly excluded)
[Bullet list from answer 5]

## Success criteria
[From answer 6]

## Compliance
[From answer 7]

## Initialised
[ISO 8601 timestamp]
```

Write `.planning/REQUIREMENTS.md`:
```markdown
# Requirements — [Project Name]

## Functional requirements
| ID    | Requirement              | Acceptance criterion           | Scope |
|-------|--------------------------|--------------------------------|-------|
| FR-01 |                          |                                | v1    |

## Non-functional requirements
| ID     | Category      | Requirement                    | Measure        |
|--------|---------------|--------------------------------|----------------|
| NFR-01 | Performance   |                                |                |
| NFR-02 | Security      |                                |                |
| NFR-03 | Availability  |                                |                |

## Out of scope
[Items explicitly excluded from v1]
```

Write `.planning/STATE.md`:
```markdown
# MindForge — Project State

## Status
Project initialised. No phases started.

## Current phase
None

## Last completed task
Project initialisation

## Next action
Run /mindforge:plan-phase 1 to begin planning Phase 1.

## Decisions made
- Project scope defined (see PROJECT.md)
- Tech stack chosen (see PROJECT.md)

## Active blockers
None

## Last updated
[ISO 8601 timestamp]
```

Write `.planning/HANDOFF.json`:
```json
{
  "schema_version": "1.0.0",
  "project": "[project name]",
  "phase": null,
  "plan": null,
  "plan_step": null,
  "last_completed_task": {
    "description": "Project initialisation",
    "commit_sha": null,
    "verified": true
  },
  "next_task": "Run /mindforge:plan-phase 1",
  "in_progress": {
    "file": null,
    "intent": null,
    "completed_steps": [],
    "remaining_steps": []
  },
  "blockers": [],
  "decisions_needed": [],
  "context_refs": [
    ".planning/PROJECT.md",
    ".planning/STATE.md",
    ".planning/REQUIREMENTS.md"
  ],
  "agent_notes": "Fresh project. Read PROJECT.md and REQUIREMENTS.md before planning.",
  "session_summary": "Project initialised.",
  "recent_files": [
    ".planning/PROJECT.md",
    ".planning/REQUIREMENTS.md",
    ".planning/STATE.md",
    ".planning/HANDOFF.json"
  ],
  "recent_commits": [],
  "updated_at": "[ISO 8601 timestamp]",
  "_warning": "Never store secrets, tokens, or passwords in this file. It is tracked in git."
}
```

## Step 3 — Confirm and guide
Tell the user:
"✅ MindForge project initialised.

Files created:
  .planning/PROJECT.md
  .planning/REQUIREMENTS.md
  .planning/STATE.md
  .planning/HANDOFF.json

Next step: Run /mindforge:plan-phase 1 to plan your first phase."
