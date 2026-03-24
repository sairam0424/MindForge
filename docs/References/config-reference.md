# MINDFORGE.md Configuration Reference

`MINDFORGE.md` acts as the project-level "constitution" for the MindForge framework. It allows teams to override default models, execution behaviors, and quality gates to fit specific project needs.

---

## 1. Model Configuration

MindForge uses a tiered model routing system. You can specify exact models for different phases of the lifecycle.

| Key | Description | Default |
| :--- | :--- | :--- |
| `PLANNER_MODEL` | Model used for task decomposition and planning. | `claude-sonnet-4-5` |
| `EXECUTOR_MODEL` | Model used for code generation and implementation. | `claude-sonnet-4-5` |
| `REVIEWER_MODEL` | Model used for code review and PR analysis. | `claude-opus-4-alpha` |
| `VERIFIER_MODEL` | Model used for testing and UAT verification. | `claude-sonnet-4-5` |
| `SECURITY_MODEL` | Model used for sensitive security scanning. | `claude-opus-4-alpha` |

**Supported Values:**

- `claude-opus-4-alpha` (High intelligence, slow, expensive)
- `claude-sonnet-4-5` (Balanced, recommended)
- `claude-haiku-4-5` (Fast, logical, best for trivial tasks)
- `inherit` (Use the system-wide default)

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

## 5. Non-Overridable Governance

To ensure enterprise safety, several rules **cannot** be disabled via `MINDFORGE.md`:

1. **Security Auto-Trigger:** Any change touching PII/Auth/Payments *will* trigger a security review.
2. **Plan-First Rule:** Every implementation task *must* have a signed-off plan.
3. **Secret Detection:** Commits containing detected secrets will always be blocked.
4. **Audit Writing:** All significant framework actions *will* be recorded to `.planning/AUDIT.jsonl`.
5. **Critical Security Blocks:** High/Critical findings *will* block the `SHIP` command.

> [!WARNING]
> Attempting to disable these rules in your configuration will result in a silent enforcement of the defaults. See [ADR-013](../adr/ADR-013-immutable-governance.md) for architectural details.
