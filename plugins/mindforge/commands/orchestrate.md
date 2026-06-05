---
description: "Design multi-agent orchestration pattern for a task. Usage: /mindforge:orchestrate [task] [--pattern supervisor|pipeline|debate|consensus|mapreduce]"
---

<objective>
Design and implement a multi-agent orchestration pattern for a complex task, defining agent roles, handoff protocols, failure propagation, and coordination mechanisms.
</objective>

<execution_context>
@.mindforge/skills/agent-orchestration-patterns/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (task description, optional --pattern supervisor|pipeline|debate|consensus|mapreduce)
Knowledge: Available agent patterns, existing personas, swarm templates, coordination protocols.
</context>

<process>
1. **Assess if multi-agent needed**: Evaluate single-agent vs multi-agent:
   - Does the task require multiple distinct skill domains?
   - Would sequential processing create unacceptable latency?
   - Does the task benefit from adversarial validation?
   - Is the task decomposable into independent subtasks?
   - Would a single agent exceed context window constraints?
   - If single-agent suffices, recommend that and stop

2. **Select pattern from matrix**: Choose orchestration pattern:
   - `supervisor`: Central coordinator delegates to specialists, aggregates results. Best for: heterogeneous subtasks with dependencies
   - `pipeline`: Sequential handoff between stages. Best for: transformation chains (draft→review→edit→publish)
   - `debate`: Multiple agents argue positions, judge synthesizes. Best for: architectural decisions, trade-off analysis
   - `consensus`: All agents propose, vote on best approach. Best for: code review, quality assessment
   - `mapreduce`: Fan-out identical tasks, merge results. Best for: parallel search, batch processing
   - Document why the selected pattern fits this specific task

3. **Define agent roles**: For each agent in the pattern:
   - Role name and persona reference (from personas registry)
   - Specific responsibility and decision authority
   - Input contract (what it receives, in what format)
   - Output contract (what it produces, schema)
   - Knowledge requirements (which skills/context it needs)
   - Trust tier (1=autonomous, 2=review, 3=HITL approval)

4. **Design handoff protocol**: Define JSON contracts for agent communication:
   - Message envelope schema (from, to, type, payload, correlation_id)
   - State passing mechanism (full state vs delta vs reference)
   - Acknowledgment requirements (fire-and-forget vs confirmed delivery)
   - Timeout per handoff (prevent infinite waits)
   - Schema validation at each boundary (reject malformed handoffs)
   - Context budget per agent (prevent token overflow)

5. **Define failure propagation**: For each failure mode:
   - Agent timeout → retry with backoff, then escalate to supervisor
   - Agent error → log, attempt recovery, propagate if unrecoverable
   - Consensus failure → add tiebreaker agent or escalate to human
   - Cascade failure → circuit breaker pattern, fail fast
   - Partial completion → checkpoint state, enable resume
   - Define maximum retry count and escalation path

6. **Implement coordination**: Build the orchestration logic:
   - Supervisor: task queue, assignment logic, result aggregation
   - Pipeline: stage transitions, backpressure handling, error short-circuit
   - Debate: round management, argument collection, verdict synthesis
   - Consensus: proposal collection, voting mechanism, quorum rules
   - MapReduce: work partitioning, parallel dispatch, merge strategy
   - Add observability (trace each agent invocation, measure latency)

7. **Test the orchestration**: Validate the design:
   - Happy path: all agents succeed, results merge correctly
   - Partial failure: one agent fails, system recovers gracefully
   - Timeout: slow agent detected and handled within SLA
   - Conflict: agents disagree, resolution mechanism activates
   - Load: pattern scales with task size (10x input, linear cost)
   - Output: orchestration spec with diagram and runnable configuration
</process>
