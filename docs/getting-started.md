# MindForge — Getting Started

This guide gets you from zero to a working MindForge project in under five minutes.

## Install

```bash
# Claude Code (global)
npx mindforge-cc --claude --global

# Project-local install
npx mindforge-cc --claude --local
```

## Initialise your project

Open Claude Code in your repository and run:

```
/mindforge:help
/mindforge:init-project
```

The init command creates your core planning files:
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/HANDOFF.json`

## Next steps

1. Plan Phase 1: `/mindforge:plan-phase 1`
2. Execute Phase 1: `/mindforge:execute-phase 1`
3. Verify Phase 1: `/mindforge:verify-phase 1`
4. Ship Phase 1: `/mindforge:ship 1`

