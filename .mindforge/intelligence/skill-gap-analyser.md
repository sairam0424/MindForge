# MindForge Intelligence — Skill Gap Analyser

## Purpose
Identify required/recommended skills for a phase, compare with installed
skills, and report gaps before planning.

## Run points
1. `/mindforge:plan-phase` start
2. `/mindforge:discuss-phase`
3. `/mindforge:health`

## Analysis flow
1. Extract work signals from roadmap/context/requirements/architecture.
2. Map work categories to required/recommended skills.
3. Validate skills in manifest + filesystem + status.
4. Report missing/deprecated required skills and mitigation options.

## Category -> skill mapping
- UI/UX -> accessibility (required), performance (recommended)
- Database changes -> database-patterns (required), data-privacy (if PII)
- API endpoints -> api-design (required), security-review (if auth)
- Auth/payments/PII -> security-review (required), data-privacy (required for PII)
- Performance work -> performance (required)
- New feature -> testing-standards (required), documentation (recommended)

## Gap definition
A required skill is a gap if:
- not present in MANIFEST
- manifest path missing
- marked deprecated with no replacement

## Output
Produce `Skill Gap Analysis` section with:
- required skills table
- recommended skills table
- explicit gap count and options

## Health mode
In `/mindforge:health`, include org-level recommendation list using recent
phase patterns and missing capability frequencies.
