# MindForge Skills Engine — Conflict Resolver

## Purpose
Resolve cases where two or more skills at the same tier have overlapping trigger
keywords. Define clear, deterministic resolution rules.

## Types of conflicts

### Type 1 — Same trigger keyword, different skills, same tier
Example: Both `security-review` and `api-design` have `endpoint` as a trigger.
A task with "create an authenticated endpoint" would match both.

**Resolution: Load both.**
Multiple skills addressing the same task from different angles is additive,
not conflicting. The agent benefits from both security review AND API design guidance.
Inject both skill contents (subject to context budget in `loader.md`).

### Type 2 — Same trigger keyword, same skill name, different tiers
Example: Org has a custom `security-review` v2.0 and Core has `security-review` v1.2.
Both trigger on "auth".

**Resolution: Higher tier wins.**
Project (T3) > Org (T2) > Core (T1).
Load the higher-tier version. Do not load both. Org skills intentionally override Core.

### Type 3 — Trigger subset (one skill's triggers are a subset of another's)
Example: `database-patterns` triggers on "query", `api-design` triggers on "query, endpoint".
A task about "database query optimisation" matches both.

**Resolution: Load the more specific skill as primary, secondary as supporting.**
If one skill's triggers are a strict subset of the task's matching keywords:
that skill is more specifically targeted and should be the primary (first in context order).

### Type 4 — Mutual exclusion (skills define themselves as mutually exclusive)
Some skills may define `mutually_exclusive_with` in their frontmatter.
Example: A project has both a `rest-api` and `graphql-api` skill. Loading both
would give contradictory guidance.

```yaml
mutually_exclusive_with: graphql-api
```

**Resolution: Load the skill whose triggers had the most keyword matches.
If tied: load the higher-tier skill. If still tied: ask the user.**

## Conflict log
When any conflict resolution occurs, write to the AUDIT log:
```json
{
  "event": "skill_conflict_resolved",
  "conflict_type": "same_trigger_different_skills",
  "resolution": "loaded_both",
  "skills": ["security-review", "api-design"],
  "trigger": "endpoint"
}
```

## Developer guide: avoiding conflicts
When authoring skills:
- Make trigger keywords as specific as possible
- Avoid generic words like "data", "create", "update" as triggers
- Use domain-specific terms: "argon2" not "hash", "WCAG" not "accessibility" (if you can)
- If your skill should override a core skill: declare it in the same name as the core
  skill and place it in a higher tier — the tier priority system handles the rest
