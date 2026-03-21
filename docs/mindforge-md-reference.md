# MINDFORGE.md Reference

`MINDFORGE.md` is the project-level constitution for MindForge defaults.

## Location
Place at repo root beside `package.json`.

## Syntax
- `KEY=value`
- comments with `#`
- multiline values with triple quotes

## Core settings
### Model preferences
- `PLANNER_MODEL`
- `EXECUTOR_MODEL`
- `REVIEWER_MODEL`
- `VERIFIER_MODEL`
- `SECURITY_MODEL`

Valid values: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `inherit`.
Unavailable value -> fallback to `inherit` with warning.

### Execution behavior
- `TIER1_AUTO_APPROVE`
- `WAVE_CONFIRMATION_REQUIRED`
- `AUTO_DISCUSS_PHASE`
- `VERIFY_PASS_RATE_WARNING_THRESHOLD`
- `COMPACTION_THRESHOLD_PCT`
- `MAX_TASKS_PER_PHASE`

### Quality and governance
- `MIN_TEST_COVERAGE_PCT`
- `MAX_FUNCTION_LINES`
- `MAX_CYCLOMATIC_COMPLEXITY`
- `BLOCK_ON_MEDIUM_SECURITY_FINDINGS`
- `DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY`
- `ANTIPATTERN_SENSITIVITY`

### Skills
- `ALWAYS_LOAD_SKILLS`
- `DISABLED_SKILLS`
- `MAX_FULL_SKILL_INJECTIONS`

## Non-overridable rules
Cannot be overridden in MINDFORGE.md:
- security auto-trigger
- plan-first rule
- secret detection gate
- audit-writing requirement
- critical security/secret blocking quality gates

See ADR-013 for rationale.
