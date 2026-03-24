# MindForge Skills Authoring Guide

## What is a skill?
A skill is a self-contained folder containing a `SKILL.md` file that gives
the MindForge agent domain-specific expertise for a specific type of task.

Skills are loaded just-in-time: MindForge discovers them by matching trigger
keywords against the task description. They inject the right knowledge at the
right moment without cluttering the context with irrelevant information.

## When to write a skill
Write a new skill when:
- A specific domain requires knowledge beyond the agent's defaults
- The same guidance needs to be applied consistently across many tasks
- Your team has standards that aren't captured in CONVENTIONS.md
- An existing core skill doesn't match your organisation's approach

## Automated Skill Generation (New in v2)
MindForge can now generate skills automatically. Instead of writing `SKILL.md` from scratch, use the intelligent learning engine:

### 1. Learn from Documentation
```bash
/mindforge:learn https://react.dev/learn "react-best-practices"
```
The agent will research the URL, extract high-value engineering patterns, and generate a high-quality `SKILL.md` with examples and triggers.

### 2. Learn from Project History
```bash
/mindforge:learn ./src/modules/auth "auth-patterns"
```
This analyzes your codebase and session history to capture project-specific expertise.

### 3. Community Marketplace
```bash
/mindforge:marketplace search "performance"
/mindforge:marketplace install mindforge-skill-latency-optimizer
```
Discover and install verified skills from the MindForge community.

## Skill file structure

```
.mindforge/skills/[skill-name]/
    SKILL.md          ← required
    examples/         ← optional: sample inputs and outputs
    resources/        ← optional: reference documents the skill uses
    scripts/          ← optional: helper scripts the skill can run
```

## SKILL.md template

```markdown
---
name: [skill-name-in-kebab-case]
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable | beta | alpha
triggers: [comma-separated list of trigger keywords]
mutually_exclusive_with:   # optional: skill names that conflict with this one
breaking_changes:
  # Record breaking changes here when bumping MAJOR version
changelog:
  - "1.0.0: Initial release"
---

# Skill — [Human-readable skill name]

## When this skill activates
[One paragraph: what task types trigger this skill, and why it helps]

## Mandatory actions when this skill is active

### Before writing any code / Before starting any task
[Steps the agent MUST take before beginning — written as an ordered list]

### During [implementation / review / analysis]
[Standards and patterns the agent must follow — be specific]

### After [implementation / review / analysis]
[Verification steps, output requirements — be specific]

## [Domain-specific section 1]
[Detailed guidance, code examples, patterns]

## [Domain-specific section 2]
[Detailed guidance, code examples, patterns]

## Self-check before task completion
- [ ] [Checkable item 1]
- [ ] [Checkable item 2]
- [ ] [Checkable item 3]

## Output
[What files or artifacts this skill produces, with exact paths]
```

## Writing good trigger keywords
- Specific beats generic: `argon2` beats `hash`
- Include common misspellings and abbreviations: `optimise, optimize`
- Include acronyms and their expansions: `a11y, accessibility, WCAG, wcag`
- Include library names: `Prisma, Drizzle, SQLAlchemy` for database-patterns
- Aim for 10-30 triggers per skill
- Avoid single-letter words and extremely common words (the, be, is, to)

## Security notice for skill authors

MindForge skills are injected directly into AI agent contexts. A skill file
with adversarial content could manipulate agent behaviour.

MindForge includes an injection guard that blocks skills containing known
manipulation patterns. However, all skill authors — especially for Tier 2
and Tier 3 skills — should:

1. Never include instructions that override or disable safety behaviours
2. Keep skill files in version control with a clear audit trail
3. Review skill changes in code review before merging
4. Restrict who can write to `.mindforge/personas/overrides/` and
   `.mindforge/org/skills/` directories

## Registering your skill
After creating SKILL.md:
```bash
/mindforge:skills add .mindforge/skills/[your-skill-name]
# Choose tier: 2 (org) or 3 (project)
# Commit the manifest update
```

### Quality Scoring
All skills (automated or manual) are passed through the **7-Dimension Scorer**. To manually score a skill:
```bash
/mindforge:skills validate .mindforge/skills/[your-skill]
```
A minimum score of **60** is required for registration.

## Tier guidance

| Tier | Use when | Location |
|---|---|---|
| 1 (Core) | Universal best practices — all projects | `.mindforge/skills/` |
| 2 (Org) | Your org's standards — all projects | `.mindforge/org/skills/` or separate repo |
| 3 (Project) | This project specifically | `.mindforge/skills/project/` |

## Version your skill
Every change to mandatory actions or trigger keywords = MINOR version bump.
Every removal of triggers or outputs = MAJOR version bump.
Typo fixes = PATCH version bump.

Update both the SKILL.md frontmatter AND the MANIFEST.md entry.
