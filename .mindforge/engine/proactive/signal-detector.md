# Proactive Skill Suggestion — Signal Detector

## Purpose
Detect contextual signals that indicate a skill should be suggested to the agent,
even if the user hasn't explicitly mentioned trigger keywords.

## Signal Categories

### 1. File Signals
Detect skills based on files being opened, modified, or referenced:

| File Pattern | Suggested Skill | Confidence |
|-------------|----------------|-----------|
| `*.test.*`, `*.spec.*`, `__tests__/` | testing-anti-patterns | 0.75 |
| `ONBOARDING*`, new git clone detected | codebase-onboarding | 0.9 |
| `CLEANUP-REPORT*`, post-merge diff | de-sloppify | 0.8 |
| `.mindforge/evals/` | eval-harness | 0.85 |
| `RFC-*.md`, `SPEC-*.md` | rfc-pipeline | 0.8 |
| `auth*`, `login*`, `payment*` | defense-in-depth | 0.75 |
| `THREAT-MODEL-*` | threat-modeling | 0.85 |
| `COUNCIL-*` in decisions/ | council | 0.8 |

### 2. Error Signals
Detect skills based on error patterns in build/test output:

| Error Pattern | Suggested Skill | Confidence |
|--------------|----------------|-----------|
| Mock-related test failures (3+) | testing-anti-patterns | 0.8 |
| Type errors in test files | testing-anti-patterns | 0.7 |
| Security scan findings (medium+) | defense-in-depth | 0.85 |
| Build failures after merge | verification-loop | 0.9 |
| Token budget warnings | cost-aware-routing | 0.8 |

### 3. Task Signals
Detect skills based on task description or conversation patterns:

| Task Pattern | Suggested Skill | Confidence |
|-------------|----------------|-----------|
| "review", "check", "verify" + completed work | santa-method | 0.75 |
| "score", "grade", "evaluate" | eval-harness | 0.8 |
| "cleanup", "polish", "finalize" | de-sloppify | 0.85 |
| "new project", "unfamiliar", "first time" | codebase-onboarding | 0.9 |
| "plan", "decompose", "break down spec" | rfc-pipeline | 0.8 |
| "quality", "how good", "assess" | quality-audit | 0.8 |

## Signal Processing Rules

1. **Single signal sufficiency** — One signal above threshold is enough to suggest
2. **Signal stacking** — Multiple signals for the same skill boost confidence: `combined = 1 - ((1 - s1) * (1 - s2))`
3. **No interruption** — Suggestions queue silently; presented only at natural breakpoints
4. **Context freshness** — File signals expire after 5 minutes of inactivity on that file
5. **Session memory** — Track which skills were already loaded this session; don't re-suggest

## Integration with Loader

The signal detector works ALONGSIDE the trigger-based loader, not replacing it:
- **Loader** = reactive (matches on explicit trigger keywords in task description)
- **Signal detector** = proactive (observes context and suggests before explicit mention)

If the loader has already loaded a skill, the signal detector suppresses its suggestion for that skill.
