# MINDFORGE.md — Project Constitution

## NON-OVERRIDABLE RULES (read-only — these cannot be changed in MINDFORGE.md)

The following CLAUDE.md behaviors are governance primitives and cannot be
disabled or overridden by MINDFORGE.md:

- Security auto-trigger for auth/payment/PII changes
- Plan-first rule (no implementation without a PLAN)
- Secret detection gate
- AUDIT writing requirement
- Critical security and secret-related quality gates

Any attempted override is ignored and logged.

## Parsing rule for multiline values
Values wrapped in triple quotes are parsed as a verbatim multi-line string from
the first `"""` to the next `"""`.

## Model validation
If a configured model is unavailable, fallback to `inherit` and warn.

## Project identity
NAME=MindForge
VERSION=2.0.0
DESCRIPTION=Enterprise agentic framework with Multi-Model Intelligence Layer
MINDFORGE_VERSION_REQUIRED=2.0.0

## Model preferences
PLANNER_MODEL=claude-opus-4-5
EXECUTOR_MODEL=claude-sonnet-4-5
REVIEWER_MODEL=claude-sonnet-4-5
VERIFIER_MODEL=claude-sonnet-4-5
SECURITY_MODEL=claude-opus-4-5
DEBUG_MODEL=claude-opus-4-5
RESEARCH_MODEL=gemini-1.5-pro
QA_MODEL=claude-4-5-sonnet
QUICK_MODEL=claude-4-5-haiku

## Cost Management
MODEL_COST_WARN_USD=1.00
MODEL_COST_HARD_LIMIT_USD=10.00
MODEL_PREFER_CHEAP_BELOW_DIFFICULTY=2.0
REQUIRE_CROSS_REVIEW=false

## Execution behavior
TIER1_AUTO_APPROVE=true
WAVE_CONFIRMATION_REQUIRED=false
AUTO_DISCUSS_PHASE=false
VERIFY_PASS_RATE_WARNING_THRESHOLD=0.75
COMPACTION_THRESHOLD_PCT=70
MAX_TASKS_PER_PHASE=15

## Quality standards
MIN_TEST_COVERAGE_PCT=80
MAX_FUNCTION_LINES=40
MAX_CYCLOMATIC_COMPLEXITY=10
REQUIRE_ADR_FOR_ALL_DECISIONS=false
BLOCK_ON_MEDIUM_SECURITY_FINDINGS=false

## Skills behavior
ALWAYS_LOAD_SKILLS=security-review
DISABLED_SKILLS=
MAX_FULL_SKILL_INJECTIONS=3

## Governance
DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY=3.5
ANTIPATTERN_SENSITIVITY=standard
BLOCK_ON_HIGH_ANTIPATTERNS=false

## Autonomous mode settings
AUTO_MODE_DEFAULT_TIMEOUT_MINUTES=120
AUTO_PUSH_ON_WAVE_COMPLETE=false
AUTO_NODE_REPAIR_BUDGET=2
AUTO_PLAN_AMBIGUITY_THRESHOLD=3.5
SLACK_WEBHOOK_URL=

## Browser Runtime
BROWSER_PORT=7338
BROWSER_HEADLESS=true
DEV_SERVER_URL=http://localhost:3000
AUTO_RUN_QA_AFTER_UI_WAVES=true
BROWSER_IDLE_TIMEOUT_MINUTES=30

## Project-specific agent instructions
ADDITIONAL_AGENT_INSTRUCTIONS="""
- Check packages/shared before creating utilities.
- Backend middleware semantics follow Fastify conventions.
- Keep dependency direction one-way from frontend to backend APIs.
- Prefer date-fns for date manipulation.
"""

## Project-specific forbidden patterns
PROJECT_FORBIDDEN_PATTERNS="""
- No direct DB access from frontend packages
- No synchronous I/O in API handlers
- No console.log in API services
- No TODO comments in committed code
"""

## Self-Building Skills
AUTO_CAPTURE_SKILLS=false
AUTO_CAPTURE_MIN_PATTERN_COUNT=2
AUTO_CAPTURE_MIN_CONFIDENCE=0.75
LEARN_MODEL=inherit
MARKETPLACE_REGISTRY=https://registry.mindforge.dev/v1
MARKETPLACE_DAILY_FETCH_LIMIT=50
SKILL_QUALITY_MIN_SCORE=60
