# MINDFORGE — Enterprise Agentic Framework

**Enterprise Agentic Framework for Claude Code and Antigravity**

MindForge gives your AI agent the context, structure, and discipline to produce
senior-engineer quality output — consistently, at scale, across your entire team.

```bash
npx mindforge-cc@latest
```

---

## What MindForge solves

AI coding agents degrade over long sessions. Context fills up. Quality drops.
Decisions get forgotten. MindForge solves this with:

- **Context engineering** — structured files that tell the agent exactly what it needs to know
- **Role personas** — 8 specialised agent modes for different cognitive tasks
- **Skill packs** — just-in-time domain knowledge loaded only when needed
- **Atomic execution** — one commit per task, wave-based parallelism, clean git history
- **Verification gates** — nothing ships without automated checks and human sign-off

---

## Quick start

```bash
# Install globally (Claude Code)
npx mindforge-cc --claude --global

# Install in current project only
npx mindforge-cc --claude --local

# Install for Antigravity
npx mindforge-cc --antigravity --local

# Install for both
npx mindforge-cc --all --local
```

Open Claude Code in your project. Run:

```
/mindforge:help
/mindforge:init-project
```

---

## Commands

| Command                         | Description                                   |
|---------------------------------|-----------------------------------------------|
| `/mindforge:help`               | Show all commands and current project status  |
| `/mindforge:init-project`       | Initialise a new project (requirements, scope, state) |
| `/mindforge:plan-phase [N]`     | Plan a phase: discuss → research → create task plans |
| `/mindforge:execute-phase [N]`  | Execute plans with wave-based parallelism     |
| `/mindforge:verify-phase [N]`   | Human acceptance testing + automated checks  |
| `/mindforge:ship [N]`           | Generate changelog, run quality gates, create PR |

---

## How it works

```
/mindforge:init-project
    → Requirements interview
    → Creates PROJECT.md, REQUIREMENTS.md, STATE.md

/mindforge:plan-phase 1
    → Discuss scope and decisions
    → Research domain (parallel subagent)
    → Create atomic XML task plans

/mindforge:execute-phase 1
    → Wave-based parallel execution
    → One commit per task
    → Automated verification

/mindforge:verify-phase 1
    → Human acceptance testing
    → Debug agent on failures
    → UAT sign-off

/mindforge:ship 1
    → Changelog generation
    → Final quality gates
    → PR creation
```

---

## Inspired by

MindForge synthesises the best patterns from:
- **GSD** — wave execution, context engineering, atomic commits
- **BMAD** — role personas, document-driven architecture
- **Superpowers** — skills library, just-in-time knowledge loading
- **GStack** — quality gates, deliberate execution discipline

---

## Licence

MIT
