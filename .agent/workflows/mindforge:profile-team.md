---
description: Generate and maintain team/developer profiles for response personalization.
---
# MindForge — Profile Team Command
# Usage: /mindforge:profile-team [--refresh] [--developer email] [--questionnaire]

Generate and maintain team/developer profiles for response personalization.

## Data sources
1. Declared questionnaire preferences
2. Inferred patterns from AUDIT + git history + metrics
3. Defaults from org conventions

## Outputs
- `.mindforge/team/TEAM-PROFILE.md`
- `.mindforge/team/profiles/PROFILE-[dev-id].md`

## Modes
- `--refresh`: inference-only update
- `--developer`: target one developer profile
- `--questionnaire`: prompt preference questions before writing

## AUDIT
```json
{ "event": "team_profile_updated", "developers_profiled": 1, "method": "inferred" }
```
