---
name: autonomous-agent-harness
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: autonomous harness, persistent agent, background agent, scheduled execution, agent cron, task queue agent, self-monitoring agent, persistent memory agent, long-running agent, agent daemon, agent lifecycle, always-on agent
---

# Skill — Autonomous Agent Harness

## When this skill activates

When designing, implementing, or operating agents that persist beyond single
conversation sessions. Use when building infrastructure for agents that run on
schedules, maintain state across invocations, process task queues, self-monitor
their health, or operate as background daemons.

This skill covers the architecture layer between "single-shot agent conversation"
and "production autonomous system" — the harness that manages lifecycle, memory,
scheduling, and self-regulation.

## Mandatory actions when this skill is active

### Before designing the harness

1. **Define the autonomy level:**

   | Level | Description | Human oversight | Example |
   |-------|-------------|-----------------|---------|
   | L1 — Scheduled | Runs on cron, reports results | Review output post-run | Daily code review bot |
   | L2 — Reactive | Triggers on events, acts within bounds | Alert on anomaly | PR auto-labeler |
   | L3 — Proactive | Identifies tasks, proposes actions | Approve before execute | Dependency updater |
   | L4 — Autonomous | Full loop with self-correction | Exception-only review | Incident responder |

2. **Identify persistence requirements:**
   - What state must survive between sessions? (task history, learned patterns, config)
   - What is the acceptable data loss window? (none, last hour, last day)
   - What is the memory format? (markdown files, SQLite, MCP server, JSON)
   - How large will accumulated state grow over time?

3. **Define boundaries and kill switches:**
   - Maximum actions per invocation (prevent runaway loops)
   - Maximum cost per session (token budget ceiling)
   - Forbidden actions list (no force-push, no production deploys without approval)
   - Human escalation triggers (confidence < threshold, high-impact decisions)
   - Emergency stop mechanism (file-based kill switch, API endpoint)

### During harness implementation

**Core architecture components:**

```
+------------------+     +------------------+     +------------------+
|   Scheduler      |---->|   Task Queue     |---->|   Agent Core     |
|  (cron/events)   |     |  (FIFO+priority) |     |  (LLM session)   |
+------------------+     +------------------+     +------------------+
                                                         |
                         +------------------+            |
                         |  Self-Monitor    |<-----------+
                         |  (health/budget) |            |
                         +------------------+            v
                                                  +------------------+
                         +------------------+     |  Persistent      |
                         |  Kill Switch     |     |  Memory          |
                         |  (emergency stop)|     |  (MCP/markdown)  |
                         +------------------+     +------------------+
```

**1. Persistent Memory System:**
```
.agent-harness/
  memory/
    knowledge-base.md      # Accumulated learnings and patterns
    task-history.jsonl     # Every task executed with outcome
    config.json            # Runtime configuration
    state.json             # Current operational state
  queues/
    pending.jsonl          # Tasks awaiting execution
    in-progress.jsonl      # Currently executing tasks
    completed.jsonl        # Finished tasks (rotate after 30 days)
    dead-letter.jsonl      # Failed tasks after max retries
```

- Knowledge base uses markdown for human-readable, agent-writable state
- Task history is append-only JSONL for auditability
- State file tracks: last run time, current task, health metrics, budget remaining
- Integration with MindForge memory: read from `.mindforge/memory/`, write learnings back

**2. Scheduled Execution:**
```json
{
  "schedules": [
    {
      "name": "daily-review",
      "cron": "0 9 * * 1-5",
      "task": "review-open-prs",
      "timeout_minutes": 30,
      "max_retries": 2
    },
    {
      "name": "continuous-monitor",
      "interval_minutes": 15,
      "task": "check-deployments",
      "timeout_minutes": 5,
      "max_retries": 1
    }
  ]
}
```

- Cron expressions for periodic tasks
- Interval-based polling for monitoring
- Event-triggered execution (webhook, file watcher, git hook)
- Each schedule entry defines timeout and retry policy independently

**3. Task Queue:**
```json
{
  "id": "task-uuid",
  "created_at": "ISO-8601",
  "priority": 1,
  "type": "review-pr",
  "payload": { "pr_number": 42, "repo": "org/project" },
  "status": "pending",
  "attempts": 0,
  "max_attempts": 3,
  "timeout_seconds": 1800,
  "dead_letter_after": 3
}
```

- FIFO within same priority level; higher priority preempts
- Retry with exponential backoff: 1min, 5min, 25min
- Dead letter queue for tasks that exceed max attempts
- Idempotency keys prevent duplicate execution

**4. Self-Monitoring:**
```json
{
  "health": {
    "last_heartbeat": "ISO-8601",
    "consecutive_failures": 0,
    "token_budget_remaining": 45000,
    "token_budget_period": "daily",
    "drift_score": 0.12,
    "uptime_minutes": 1440
  },
  "alerts": [
    {
      "condition": "consecutive_failures > 3",
      "action": "pause_and_notify"
    },
    {
      "condition": "token_budget_remaining < 5000",
      "action": "enter_low_power_mode"
    },
    {
      "condition": "drift_score > 0.5",
      "action": "request_human_review"
    }
  ]
}
```

- Heartbeat every execution cycle (detect stalls)
- Token budget tracking with low-power mode (reduce scope, not stop)
- Drift detection: compare recent outputs to baseline patterns
- Alert escalation: log → notify → pause → kill

**5. Lifecycle Management:**

```
STARTUP → RUNNING → IDLE → WAKE → RUNNING → ... → SHUTDOWN
   |         |                                         ^
   |         +------- ERROR -----> RECOVERING ---------+
   |                                    |
   +--- BLOCKED (kill switch) ----------+
```

- **Startup:** Load config, validate memory integrity, check kill switch, announce ready
- **Running:** Process task queue, update heartbeat, track budget
- **Idle:** No pending tasks, reduce polling frequency, maintain heartbeat
- **Wake:** New task arrived or schedule triggered, resume full operation
- **Recovering:** After error, attempt self-repair, reload state, retry last task
- **Shutdown:** Graceful — complete current task, flush state, log final report
- **Blocked:** Kill switch active — cease all operations, preserve state, await unblock

### After harness deployment

1. **Operational verification:**
   - Run a canary task through the full pipeline (schedule → queue → execute → report)
   - Verify memory persistence across restarts
   - Test kill switch responsiveness (must halt within 1 execution cycle)
   - Confirm dead letter queue captures failed tasks correctly
   - Validate budget tracking accuracy

2. **Monitoring setup:**
   - Dashboard showing: queue depth, success rate, token spend, last heartbeat
   - Alerts for: stall (no heartbeat in 2x interval), budget exhaustion, error spike
   - Weekly summary: tasks completed, failures, cost, learnings accumulated

3. **Maintenance cadence:**
   - Daily: review dead letter queue, check for stale tasks
   - Weekly: rotate completed task log, prune knowledge base, verify budget projections
   - Monthly: review drift trends, update boundaries, assess autonomy level appropriateness

## Self-check before task completion

Before marking an autonomous harness task done:

- [ ] Did I define the autonomy level and appropriate human oversight?
- [ ] Did I implement all 5 core components (memory, scheduler, queue, monitor, lifecycle)?
- [ ] Did I define explicit boundaries (max actions, budget ceiling, forbidden actions)?
- [ ] Did I implement a kill switch that halts within one execution cycle?
- [ ] Did I set up retry logic with dead letter queue for failed tasks?
- [ ] Did I configure self-monitoring with escalating alert thresholds?
- [ ] Did I test the full lifecycle (startup through shutdown)?
- [ ] Did I integrate with MindForge's existing memory and autonomous engine?
