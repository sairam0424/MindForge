# MINDFORGE.md Configuration Reference

`MINDFORGE.md` acts as the project-level "constitution" for the MindForge framework. It allows teams to override default models, execution behaviors, and quality gates to fit specific project needs.

---

## 0. Syntax and required keys

**Read this first.** As of 11.9.2 `node bin/validate-config.js` and
`mindforge security-scan` can actually fail — before that they reported
`0 settings configured` and exited 0 on any input, so an invalid registry passed silently.

Two syntaxes are accepted:

```text
[PLANNER] = claude-opus-4-7      # bracketed — CANONICAL, what the shipped MINDFORGE.md uses
PLANNER_MODEL=claude-opus-4-7    # plain — legacy, still read, used by examples/starter-project
```

Prefer the bracketed form. A bracketed key must open the line (leading whitespace is allowed)
and be followed by `=`. Prose bullets that merely mention `[KEY]` are not parsed as settings.

**These five keys are REQUIRED.** Validation exits 1 if any is missing:

| Key | Example |
| :--- | :--- |
| `[VERSION]` | `11.9.2` — must match `^\d+\.\d+\.\d+$` |
| `[REACTIVE_MODE]` | `true` |
| `[PLANNER]` | `claude-opus-4-7` |
| `[EXECUTOR]` | `claude-sonnet-4-6` |
| `[MIN_SOUL_SCORE]` | `8` (range 0–10) |

Three more are **recommended** — absent ones produce a warning, not an error:
`[COST_WARN_USD]`, `[COST_HARD_LIMIT_USD]`, `[BLOCK_ON_SECURITY]`.

> `[COST_HARD_LIMIT_USD]` is **declared but not enforced** as of 11.9.2. Do not rely on it as a
> spend control; see the CHANGELOG.

---

## 1. Model Configuration

MindForge uses a tiered model routing system. You can specify exact models for different phases of the lifecycle.

The canonical keys are the short bracketed forms; the `*_MODEL` names are accepted aliases kept
for older configs.

| Key | Alias | Description | Shipped default |
| :--- | :--- | :--- | :--- |
| `[PLANNER]` | `PLANNER_MODEL` | Task decomposition and planning. | `claude-opus-4-7` |
| `[EXECUTOR]` | `EXECUTOR_MODEL` | Code generation and implementation. | `claude-sonnet-4-6` |
| `[REVIEWER]` | `REVIEWER_MODEL` | Code review and PR analysis. | `claude-sonnet-4-6` |
| `[VERIFIER]` | `VERIFIER_MODEL` | Testing and UAT verification. | `claude-sonnet-4-6` |
| `[SECURITY]` | `SECURITY_MODEL` | Sensitive security scanning. | `claude-opus-4-7` |
| `[DEBUG]` | — | Debugging and root-cause analysis. | `claude-opus-4-7` |

**Values are free-form strings** — the schema does not constrain them to a list, so a new model
id works without a framework upgrade. The ids shipped in `MINDFORGE.md` today are
`claude-opus-4-7`, `claude-sonnet-4-6` and `claude-haiku-4-5`; `inherit` selects the
system-wide default. Because the values are unconstrained, a typo is NOT caught by validation —
it falls through to the routing defaults.

---

## 1b. Numeric bounds enforced by validation

Out-of-range values now fail. These were previously documented nowhere a consumer reads.

| Key | Range | Key | Range |
| :--- | :--- | :--- | :--- |
| `MIN_SOUL_SCORE` | 0–10 | `MAX_TASKS_PER_PHASE` | 1–50 |
| `AUTO_SWARM_THRESHOLD` | 0–10 | `MIN_TEST_COVERAGE_PCT` | 0–100 |
| `DYNAMISM_LEVEL` | 1–5 | `MAX_FUNCTION_LINES` | 10–200 |
| `ADS_DEBATE_ROUNDS` | 1–10 | `MAX_CYCLOMATIC_COMPLEXITY` | 3–30 |
| `COMPACTION_THRESHOLD_PCT` | 50–90 | `MAX_FULL_SKILL_INJECTIONS` | 1–10 |
| `DASHBOARD_PORT` | 1024–65535 | `NEXUS_TRACE_RETENTION_DAYS` | 1–365 |
| `BROWSER_PORT` | 1024–65535 | `SHARD_RETAIN_DAYS` | 1–365 |
| `COST_WARN_USD` | 0–10000 | `AI_REVIEW_DAILY_LIMIT` | 0–500 |
| `COST_HARD_LIMIT_USD` | 0–10000 | `CI_MIN_COVERAGE_PCT` | 0–100 |
| `VERIFY_PASS_RATE_WARNING_THRESHOLD` | 0–1 | `DISCUSS_PHASE_REQUIRED_ABOVE_DIFFICULTY` | 1–5 |

If one of these rejects a value you consider legitimate, the bound is wrong — report it rather
than editing your registry to satisfy it.

---

## 2. Autonomous Execution Settings

These settings control the `/mindforge:auto` engine's behavior and performance.

| Key | Description | Default |
| :--- | :--- | :--- |
| `AUTONOMOUS_MODE_ENABLED` | Global toggle for autonomous task execution. | `true` |
| `MAX_TASKS_PER_PHASE` | Limit on task expansion during planning. | `15` |
| `STUCK_DETECTION_TIMEOUT_MS` | Time before an agent is considered "looping" or stuck. | `300000` |
| `STEERING_CHECK_INTERVAL_MS` | How often the engine checks for user guidance. | `5000` |
| `NODE_REPAIR_ENABLED` | If true, the engine attempts to self-heal on failures. | `true` |
| `COMPACTION_THRESHOLD_PCT` | The context usage percentage at which to trigger compaction. | `70` |

---

## 3. Engineering Quality Gates

Define the rules that code must follow to pass the `VERIFY` phase.

| Key | Description | Default |
| :--- | :--- | :--- |
| `MIN_TEST_COVERAGE_PCT` | Required test coverage for any new module. | `80` |
| `MAX_FUNCTION_LINES` | Maximum lines allowed for a single function. | `40` |
| `MAX_CYCLOMATIC_COMPLEXITY` | Maximum complexity score (McCune) allowed. | `10` |
| `BLOCK_ON_MEDIUM_SECURITY` | Fail the gate if any medium security findings exist. | `true` |
| `ANTIPATTERN_SENSITIVITY` | Frequency at which suspicious patterns are flagged. | `0.7` |

---

## 4. Skills & Personalization

Control how skills are discovered and injected.

| Key | Description | Default |
| :--- | :--- | :--- |
| `ALWAYS_LOAD_SKILLS` | List of skill IDs to inject in every session. | `[]` |
| `DISABLED_SKILLS` | List of skills to ignore even if triggers match. | `[]` |
| `MAX_FULL_SKILL_INJECTIONS` | Max number of skills allowed to be fully injected. | `3` |
| `AUTO_CAPTURE_SKILLS` | Automatically suggest new skills from session history. | `true` |

---

## 5. Temporal Configuration (v11.0.0+)

Control reasoning snapshot retention for the Temporal Steering system.

| Key | Description | Default |
| :--- | :--- | :--- |
| `temporal.max_snapshots` | Maximum number of reasoning snapshots retained per session. | `50` |
| `temporal.max_age_days` | Snapshots older than this value (in days) are auto-pruned. | `30` |

---

## 6. Rate Limiting (v11.0.0+)

Configure request rate limits for the dashboard and API endpoints.

| Key | Description | Default |
| :--- | :--- | :--- |
| `rate_limiting.dashboard_rpm` | Maximum requests per minute to dashboard endpoints. | `120` |

---

## 7. Session Configuration (v11.0.0+)

Control session token behaviour for dashboard authentication.

| Key | Description | Default |
| :--- | :--- | :--- |
| `session.token_expiry_hours` | Hours before a dashboard bearer token expires. | `24` |

---

## 8. Wave Execution (v11.0.0+)

Tune parallel wave execution behaviour.

| Key | Description | Default |
| :--- | :--- | :--- |
| `wave_execution.max_concurrency` | Maximum number of tasks executed in parallel within a wave. | `6` |

---

## 9. Non-Overridable Governance

To ensure enterprise safety, several rules **cannot** be disabled via `MINDFORGE.md`:

1. **Security Auto-Trigger:** Any change touching PII/Auth/Payments *will* trigger a security review.
2. **Plan-First Rule:** Every implementation task *must* have a signed-off plan.
3. **Secret Detection:** Commits containing detected secrets will always be blocked.
4. **Audit Writing:** All significant framework actions *will* be recorded to `.planning/AUDIT.jsonl`.
5. **Critical Security Blocks:** High/Critical findings *will* block the `SHIP` command.

> [!WARNING]
> Attempting to disable these rules in your configuration will result in a silent enforcement of the defaults. See [ADR-013](../adr/ADR-013-immutable-governance.md) for architectural details.
