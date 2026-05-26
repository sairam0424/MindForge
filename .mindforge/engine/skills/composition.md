# MindForge Skills Engine — Composition System

## Purpose
Enable skills to declaratively depend on and invoke other skills via a `compose:` 
field in YAML frontmatter. This allows complex skills to build on simpler foundations
without duplicating content.

## Schema Addition

Skills may include an optional `compose:` field in their YAML frontmatter:

```yaml
---
name: verification-loop
version: 1.0.0
min_mindforge_version: 10.0.3
status: stable
triggers: verification, quality gate, build check
compose:
  - security-review
---
```

## Composition Rules

### Resolution
1. When a skill with `compose:` is loaded, the loader resolves each referenced skill name against MANIFEST.md
2. Referenced skills are loaded as **summarized content** (not full injection) — see loader.md Step 5 summarisation format
3. The composing (parent) skill is always injected in full; composed (child) skills are summarized

### Depth Limit
- Maximum composition depth: **2 levels**
- A composed skill's own `compose:` dependencies are NOT resolved (no transitive loading)
- Rationale: prevents context explosion and keeps token budget predictable

### Cycle Detection
- Before resolving compositions, check for circular references
- If skill A composes B and B composes A: log a WARNING, skip the circular reference, load only the directly-requested skill
- Circular detection is checked at load time, not at registration time

### Token Budget Impact
- Each composed skill adds ~150 tokens (summary format only)
- A skill composing 3 others adds ~450 tokens overhead
- This counts against the standard context budget (see loader.md budget table)

### Conflict Resolution
- If a composed skill is ALSO matched by trigger (i.e., it would have been loaded independently):
  load it in FULL (not summarized), since it matched on its own merit
- The composing skill still counts it as satisfied

### Validation at Registration
When a skill is registered via MANIFEST.md:
1. Check that all skills listed in `compose:` exist in the manifest
2. If a referenced skill doesn't exist: log a WARNING (not an error) and register anyway
3. Missing composed skills are simply not loaded at runtime (graceful degradation)

## Audit Logging

When composition is resolved, add to the task's AUDIT entry:
```json
{
  "skills_composed": [
    { "parent": "verification-loop", "child": "security-review", "mode": "summarized" }
  ]
}
```

## Examples

### Skill that composes one dependency
```yaml
---
name: threat-modeling
compose:
  - security-review
---
```
Result: threat-modeling loaded in full + security-review loaded as summary.

### Skill where composed dependency also triggers independently
Task: "Review auth threat model for the payment API"
- Triggers match: threat-modeling (via "threat model") AND security-review (via "auth", "payment")
- Both load in FULL (security-review matched independently, composition is moot)
