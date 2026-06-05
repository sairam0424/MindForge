---
description: "Convert any knowledge source into a reusable, validated, committed MindForge SKILL.md."
---

# MindForge v2 — Learn Command
# Usage: /mindforge:learn [url|path|--session|npm:package] [--name skill-name] [--tier project|org|core]
# Version: v2.0.0-alpha.6

## Purpose
Convert any knowledge source into a reusable, validated, committed MindForge SKILL.md.
Feed Claude your documentation and it writes down what it learned — for every future session.

## The insight
Every developer on your team already knows how Prisma works, how your internal API
conventions are structured, how your CI pipeline behaves. That knowledge lives in their
heads and in documentation. `/mindforge:learn` captures it permanently as skills that
load automatically whenever relevant work begins.

## Usage examples

### Learn from external documentation
```
/mindforge:learn https://docs.prisma.io/concepts/components/prisma-schema
/mindforge:learn https://stripe.com/docs/webhooks
/mindforge:learn https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
```
→ Fetches the page (with SSRF protection)
→ Uses Gemini 2.5 Pro (1M context) for large docs, claude-sonnet-4-6 for smaller ones
→ Extracts 10 patterns + 15-25 trigger keywords
→ Writes SKILL.md + scores it + presents for approval

### Learn from local documentation
```
/mindforge:learn ./docs/api-conventions.md
/mindforge:learn ./docs/internal/
/mindforge:learn ./CONTRIBUTING.md
```
→ Reads local files directly (no model call for reading, only for analysis)
→ Perfect for: internal API docs, team conventions, onboarding guides

### Learn from npm package docs
```
/mindforge:learn npm:zod
/mindforge:learn context7:zod
/mindforge:learn npm:drizzle-orm
/mindforge:learn context7:drizzle-orm
```
→ Fetches README from npm registry or real-time docs from Context7
→ Extracts patterns from the package documentation

### Learn from current session
```
/mindforge:learn --session
```
→ Analyses SUMMARY files from the most recent phase
→ Finds patterns that appeared across 2+ tasks
→ Generates up to 3 skills from what was learned (focused: quality over quantity)
→ Does NOT repeat patterns already in the knowledge base

## Flags

### --name [skill-name]
Override the auto-generated skill name (kebab-case).
Default: inferred from the URL domain/path or file name.
Example: `/mindforge:learn ./docs/prisma-patterns.md --name prisma-advanced`

### --tier [project|org|core]
Where to install the skill (default: project).
- project: only loads in this project (T3)
- org: loads in all projects using this org config (T2)
- core: loads everywhere (T1 — use sparingly)

### --model [model-id]
Override the model used for analysis.
Default: RESEARCH_MODEL for large content (>50K chars), EXECUTOR_MODEL for small.

## Output format

```
📚 Learning from: https://docs.prisma.io/...

  🔍 Fetching content...            done (148K chars)
  🧠 Extracting patterns (gemini-2.5-pro)...
  Step 1/3 — Extracting patterns... done (10 patterns)
  Step 2/3 — Generating triggers... done (22 triggers)
  Step 3/3 — Writing SKILL.md...    done

📊 Skill Quality Score: 84/100 (Good — can register + publish)
  trigger_coverage   : 26/30   ✅
  mandatory_actions  : 21/25   ✅
  code_examples      : 17/20   ✅
  self_check         : 12/15   ✅
  injection_safe     : 10/10   ✅
  no_placeholders    : 9/10    ✅
  version_history    : 8/10    ⚠️

Preview (top 3 patterns):
  1. [CRITICAL] Always define explicit cascade behaviour
     "Set onDelete on every @relation — never rely on database defaults"
  2. [HIGH] Use compound indexes for cursor pagination
     "Always index (createdAt, id) together for reliable cursor pagination"
  3. [HIGH] Never use String for UUID fields in Prisma schema
     "Use @id @default(uuid()) with the String type — Prisma handles this"

Triggers (22): prisma schema, schema.prisma, @relation, prisma migrate,
               @id @default, prisma.findMany, prisma generate, model definition...

Skill file: .mindforge/skills/prisma-schema/SKILL.md

[ y ] Register in project tier and commit
[ n ] Discard
[ e ] Edit SKILL.md before registering
[ p ] Register AND publish to community marketplace (score ≥ 80 ✅)
```

## After registration

```
✅ Skill registered: prisma-schema (T3 Project)

  Will auto-load when tasks contain:
    "prisma schema", "schema.prisma", "@relation", "prisma migrate"...

  Committed: feat(skills): learn prisma-schema from docs.prisma.io

  Next: /mindforge:skills info prisma-schema
```

## Integration with auto-capture
When `AUTO_CAPTURE_SKILLS=true` in MINDFORGE.md:
`/mindforge:learn --session` is called automatically after each phase completion.
The prompt is shown; if no patterns found, it exits silently (no noise).

## AUDIT entry
```json
{
  "event": "skill_learned",
  "source_type": "url|local|session|npm",
  "source": "[url or path]",
  "skill_name": "prisma-schema",
  "quality_score": 84,
  "pattern_count": 10,
  "trigger_count": 22,
  "tier": "project",
  "cost_usd": 0.31
}
```
