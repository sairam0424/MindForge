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
- **Enterprise governance** — approvals, audit queries, milestones, and safe integrations

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
| `/mindforge:audit`              | Query audit history by phase, event, date, severity |
| `/mindforge:milestone`          | Group phases into milestones and track health |
| `/mindforge:complete-milestone` | Archive a milestone and prepare release metadata |
| `/mindforge:approve`            | Process Tier 2 / Tier 3 approvals and emergency overrides |
| `/mindforge:sync-jira`          | Sync phases and plans to Jira |
| `/mindforge:sync-confluence`    | Publish approved docs to Confluence |

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

## How the wave engine works

MindForge's execution engine is not sequential. It analyses task dependencies and
runs independent tasks in parallel — each with its own isolated 200K-token context.

```
/mindforge:plan-phase 1
    → Creates 5 task plans with dependency declarations

/mindforge:execute-phase 1
    → Parser builds dependency graph
    → Groups into waves: [01,02] → [03,04] → [05]
    → Wave 1: Plans 01 and 02 run in parallel (independent)
    → Wave 2: Plans 03 and 04 run in parallel (both depend on Wave 1 only)
    → Wave 3: Plan 05 runs (depends on both Wave 2 plans)
    → Full test suite runs between each wave
    → Automated verification after all waves complete
```

This produces consistently higher quality than sequential execution: each subagent
has a full, clean context window focused entirely on its specific task.

## Long sessions and context compaction

MindForge monitors context window usage. At 70%:
1. Current state is committed to git
2. `STATE.md` and `HANDOFF.json` are updated with full session context
3. Work resumes in a fresh context window with clean working memory

Sessions never degrade. Every session starts fresh with complete state awareness.

## Audit trail

Every agent action is logged to `.planning/AUDIT.jsonl`:
- Task starts and completions with commit SHAs
- Security findings with OWASP classification
- Context compaction events
- Quality gate failures

Query the audit log:
```bash
# What happened in phase 1?
grep '\"phase\":1' .planning/AUDIT.jsonl | jq .

# Any security findings?
grep '\"event\":\"security_finding\"' .planning/AUDIT.jsonl | jq '{severity,finding,file}'

# Today's activity
grep \"$(date -u +%Y-%m-%d)\" .planning/AUDIT.jsonl | jq .event
```

Day 4 also adds archive rotation guidance and governance-aware audit querying
 via `/mindforge:audit`.

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
