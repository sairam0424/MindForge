# MindForge Configuration Reference (MINDFORGE.md)

## Location
`MINDFORGE.md` in the project root (beside `package.json`).

## Syntax
- `KEY=value`
- Comments with `#`
- Multiline values with triple quotes

## Model preferences
- `PLANNER_MODEL`
- `EXECUTOR_MODEL`
- `REVIEWER_MODEL`
- `VERIFIER_MODEL`
- `SECURITY_MODEL`
- `DEBUG_MODEL`

Valid values: `claude-opus-4-5`, `claude-sonnet-4-5`, `claude-haiku-4-5`, `inherit`.
Unavailable values fallback to `inherit` with a warning.

## Execution behavior
- `TIER1_AUTO_APPROVE`
- `WAVE_CONFIRMATION_REQUIRED`
- `AUTO_DISCUSS_PHASE`
- `VERIFY_PASS_RATE_WARNING_THRESHOLD` (v1.0.0 uses 0.0–1.0 range)
- `COMPACTION_THRESHOLD_PCT`
- `MAX_TASKS_PER_PHASE`

## Quality standards
- `MIN_TEST_COVERAGE_PCT`
- `MAX_FUNCTION_LINES`
- `MAX_CYCLOMATIC_COMPLEXITY`
- `REQUIRE_ADR_FOR_ALL_DECISIONS`
- `BLOCK_ON_MEDIUM_SECURITY_FINDINGS`

## Skills behavior
- `ALWAYS_LOAD_SKILLS`
- `DISABLED_SKILLS`
- `MAX_FULL_SKILL_INJECTIONS`

## Governance behavior
- `DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY`
- `ANTIPATTERN_SENSITIVITY`
- `BLOCK_ON_HIGH_ANTIPATTERNS`

## Token settings
- `TOKEN_WARN_THRESHOLD`
- `TOKEN_LEAN_MODE`
- `TOKEN_MAX_FILE_LINES`

## Update settings
- `MINDFORGE_AUTO_CHECK_UPDATES` (true/false)

## Non-overridable rules
The following cannot be overridden by MINDFORGE.md:
- Security auto-trigger for auth/payment/PII changes
- Plan-first rule
- Secret detection gate
- AUDIT writing requirement
- Critical security and secret-related quality gates

See `.mindforge/production/token-optimiser.md` and `docs/mindforge-md-reference.md`
for full detail.
