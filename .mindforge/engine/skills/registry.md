# MindForge Skills Engine — Registry

## Purpose
The skills registry tracks every available skill pack across all three tiers,
their versions, trigger keywords, compatibility requirements, and source locations.
The registry is the first thing the skills loader reads.

## Registry file location
`.mindforge/org/skills/MANIFEST.md` — org-level manifest (shared via git)

## Manifest format

The MANIFEST.md uses a structured table format readable by both humans and agents:

```markdown
# MindForge Skills Manifest
# Version: 1.0.0
# MindForge compatibility: >=0.1.0
# Last updated: [ISO-8601]

## Core Skills (Tier 1 — maintained by MindForge)

| Name | Version | Status | Min MindForge | Triggers (excerpt) |
|---|---|---|---|---|
| security-review | 1.0.0 | stable | 0.1.0 | auth, password, token, JWT |
| code-quality | 1.0.0 | stable | 0.1.0 | refactor, review, lint |
| api-design | 1.0.0 | stable | 0.1.0 | API, endpoint, REST |
| testing-standards | 1.0.0 | stable | 0.1.0 | test, spec, coverage |
| documentation | 1.0.0 | stable | 0.1.0 | README, docs, changelog |
| performance | 1.0.0 | stable | 0.3.0 | performance, latency, cache |
| accessibility | 1.0.0 | stable | 0.3.0 | a11y, aria, wcag, screen reader |
| data-privacy | 1.0.0 | stable | 0.3.0 | GDPR, PII, consent, retention |
| incident-response | 1.0.0 | stable | 0.3.0 | incident, outage, postmortem |
| database-patterns | 1.0.0 | stable | 0.3.0 | query, index, migration, N+1 |

## Org Skills (Tier 2 — maintained by your organisation)

| Name | Version | Status | Min MindForge | Triggers (excerpt) |
|---|---|---|---|---|
| [org-skill-name] | 1.0.0 | stable | 0.1.0 | [trigger keywords] |

## Project Skills (Tier 3 — maintained per project)

| Name | Version | Status | Min MindForge | Triggers (excerpt) |
|---|---|---|---|---|
| [project-skill-name] | 1.0.0 | stable | 0.1.0 | [trigger keywords] |
```

## Registry operations

### Scan and build registry (run at session start)
1. Read `.mindforge/org/skills/MANIFEST.md`
2. For each skill in the manifest, verify its SKILL.md file exists at the expected path
3. If a skill in the manifest has no corresponding file: mark as `missing`
4. If a SKILL.md file exists but is not in the manifest: mark as `unregistered`
5. Build the in-session registry: a flat list of all valid skills with their metadata

### Registry health check
Run as part of `/mindforge:health`:
- All manifest entries have corresponding SKILL.md files ✅ / ❌ missing
- All SKILL.md files have valid frontmatter (name, version, triggers) ✅ / ❌ invalid
- No trigger keyword conflicts between skills at the same tier ✅ / ⚠️ conflict
- All skill versions are valid semver strings ✅ / ❌ invalid

### Adding a skill to the registry
1. Create the skill directory and SKILL.md (content per the authoring guide)
2. Validate the SKILL.md frontmatter is complete and correct
3. Add an entry to MANIFEST.md in the correct tier section
4. Commit: `feat(skills): add [skill-name] v[version]`

### Removing a skill from the registry
1. Mark the skill as `deprecated` in MANIFEST.md (do not delete the entry)
2. Add a `deprecated_at` and `replacement` field to the SKILL.md frontmatter
3. After 2 sprints of deprecation: delete the skill directory and manifest entry
4. Never hard-delete a skill that might still be referenced in existing PLAN files

## Tier priority for conflict resolution
When two skills at different tiers have overlapping trigger keywords:
Priority order: Project (Tier 3) > Org (Tier 2) > Core (Tier 1)

The higher-priority tier's skill is loaded. The lower-priority skill is not loaded.
This allows org and project skills to override core skill behaviour intentionally.

When two skills at the SAME tier have conflicting trigger keywords:
See `conflict-resolver.md`.
