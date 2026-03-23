# MindForge v2 — Marketplace Command
# Usage: /mindforge:marketplace [search|featured|trending|install|publish]
# Version: v2.0.0-alpha.6

## Purpose
Discover, evaluate, and install community-published MindForge skills from the
marketplace — a curated layer on top of the npm registry.

The marketplace is the shortcut: instead of learning from documentation yourself,
install skills that the community has already created, validated, and battle-tested.

## Sub-commands

### search [query]
Find skills relevant to your tech stack or domain.
```
/mindforge:marketplace search "prisma"
/mindforge:marketplace search "stripe payment processing"
/mindforge:marketplace search "HIPAA compliance"
/mindforge:marketplace search "graphql api"
```

Output:
```
🔍 Marketplace search: "prisma" (6 results)

  1. prisma-advanced (v1.2.3)
     Advanced Prisma patterns: relations, migrations, performance, cursor pagination
     847 installs this week

  2. prisma-schema (v1.0.1)
     Prisma schema design: models, relations, enums, cascade rules
     234 installs this week

  3. prisma-testing (v1.0.0)
     Testing Prisma with Jest: database seeding, teardown, transaction rollback
     156 installs this week

Install: /mindforge:marketplace install prisma-advanced
```

### featured
Show curated featured skills by category.
```
/mindforge:marketplace featured
```

Output:
```
🏪 MindForge Community Skills — Featured

  Database:
    db-postgres-advanced v2.1.0  — Advanced PostgreSQL patterns, indexes, partitioning
    db-prisma-advanced   v1.2.0  — Prisma relations, migrations, query optimisation
    db-drizzle           v1.0.0  — Drizzle ORM type-safe patterns

  API:
    api-graphql v1.4.0  — GraphQL schema, resolvers, N+1 prevention
    api-rest    v2.0.0  — REST API design, versioning, error schemas

  Compliance:
    fintech-pci-compliance  v1.1.0 — PCI DSS Level 1 safeguards
    healthtech-hipaa        v1.0.1 — HIPAA Security Rule for PHI
    [more...]
```

### trending
Show most-installed skills this month.
```
/mindforge:marketplace trending
```

### install [name] [--tier project|org]
Install a marketplace skill.
```
/mindforge:marketplace install prisma-advanced
/mindforge:marketplace install mindforge-skill-api-graphql --tier org
/mindforge:marketplace install fintech-pci-compliance --tier project
```

Short names work (without `mindforge-skill-` prefix).
Delegates to `/mindforge:install-skill` for actual installation.
Shows quality score and session_quality_lift before installing.

### publish [skill-dir]
Publish a skill to the community marketplace.
```
/mindforge:marketplace publish .mindforge/skills/my-skill/
```

Requirements:
- Quality score ≥ 80/100
- No injection patterns
- Has complete version history
- Has author contact (GitHub issues URL)

## Skill quality display format

```
📊 Skill: prisma-advanced v1.2.3
   Quality score: 94/100 (Excellent)
   ★★★★★ Session quality lift: +8.2 points (over 1,247 sessions)
   847 installs/week | Published by: @prisma-community

   Top trigger keywords: "prisma schema", "@relation", "prisma migrate",
                          "prisma generate", "onDelete", "cursor pagination"

   [Install] [Preview SKILL.md] [View on npm]
```

## AUDIT entry
```json
{
  "event": "marketplace_action",
  "action": "search|install|publish",
  "query": "[search query if search]",
  "skill_name": "[name if install/publish]",
  "quality_score": 94
}
```
