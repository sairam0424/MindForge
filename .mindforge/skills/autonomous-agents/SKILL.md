---
name: autonomous-agents
version: 1.0.0
min_mindforge_version: 10.5.0
status: stable
triggers: autonomous agent design, agent loop architecture, tool use orchestration, AI planning system, agent self-correction, agentic workflow, agent reasoning loop, multi-agent collaboration, agent task decomposition, agent goal pursuit, agent reflection pattern, autonomous decision making
compose:
  - agent-orchestration-patterns
---

# Autonomous Agents & Reasoning Loops

## When this skill activates

This skill activates when building autonomous agents that pursue goals independently, implement planning and reasoning loops, use tools dynamically, self-correct errors, or coordinate across multiple agents. It applies to systems where AI must operate with minimal human intervention across multi-step tasks.

## Mandatory actions when this skill is active

### Before writing any code

1. **Define agent scope and boundaries** — Specify what the agent can do (available tools, permitted actions) and cannot do (restricted tools, human approval required). Define goal structure: explicit goals (user-provided task), implicit goals (system constraints, safety rules), and emergent goals (agent-discovered subgoals). Unbounded agents are dangerous.
2. **Design the reasoning loop** — Choose loop architecture: ReAct (Reasoning + Acting), Plan-Act-Reflect, or Chain-of-Thought with Tool Use. Define loop termination conditions: goal achieved, max iterations reached (prevent infinite loops), error threshold exceeded, or human intervention requested. Document loop explicitly.
3. **Select tool inventory** — Identify tools the agent can use: APIs (web search, database queries), code execution (sandboxed interpreters), file operations (read/write), external services (send email, create tickets). For each tool, define input schema, output schema, error modes, and safety constraints (rate limits, authorization).
4. **Establish self-correction mechanisms** — Agents make mistakes (hallucinations, tool errors, reasoning failures). Design self-correction: validation (check outputs against constraints), reflection (analyze failures and adjust strategy), and retry logic (re-attempt with modified approach). Define max retry count to prevent infinite loops.

### During implementation

- **Implement explicit planning phase** — Before acting, the agent should decompose the goal into subtasks (task decomposition), estimate feasibility, and select tools. Plan structure: {goal, subtasks: [{action, tool, expected_outcome}], constraints, success_criteria}. Plans must be inspectable and modifiable by humans.
- **Design tool calling with error handling** — Wrap every tool call in try-catch with explicit error handling: retry on transient errors (network failures, rate limits), escalate on permanent errors (invalid credentials, malformed inputs), and degrade gracefully (skip optional steps, use fallback tools). Log all tool calls with inputs, outputs, and errors.
- **Build reflection and self-critique loops** — After each action or subtask completion, the agent should reflect: "Did this action achieve the expected outcome? If not, why? What should I try next?" Use structured reflection prompts: {action_taken, expected_outcome, actual_outcome, error_analysis, next_action}. Reflection improves multi-step task success rates by 20-40%.
- **Implement goal-state tracking** — Maintain explicit state: current goal, progress toward goal (% complete, subtasks finished), blockers (errors, missing information), and next planned action. State must be serializable and resumable (agent can pause and resume later). Use structured state representations (JSON, database records).
- **Design safety constraints** — Prevent harmful actions via pre-execution checks: validate tool inputs against safety rules (no file deletion without confirmation, no email to external addresses without review), enforce rate limits (max N API calls per minute), and require human approval for high-risk actions (financial transactions, data deletion).
- **Implement multi-agent coordination** — When multiple agents collaborate, define communication protocols: message passing (agents send structured messages), shared state (agents read/write common store), or supervisor coordination (central agent dispatches tasks). Avoid race conditions and deadlocks: use locks, optimistic concurrency, or single-writer patterns.

### After implementation

- **Validate goal completion accuracy** — Test the agent on a suite of goals with known correct solutions. Measure success rate (% of goals fully achieved), partial success rate (% of goals partially achieved), and failure modes (why did the agent fail?). Target: >80% success rate for well-defined goals.
- **Measure loop efficiency** — Track iterations per goal (how many reasoning steps until completion). More iterations = higher cost and latency. Target: <10 iterations for most tasks. If higher, improve planning quality or provide better tools.
- **Test self-correction effectiveness** — Simulate tool errors (API returns invalid data, file not found, timeout) and validate that the agent recovers gracefully. Measure recovery rate (% of errors successfully handled without human intervention). Target: >70% recovery rate.
- **Audit for infinite loops and runaway costs** — Test with adversarial goals designed to trigger infinite loops (unsolvable tasks, circular dependencies). Validate that termination conditions activate (max iterations, timeout, error threshold). Monitor token usage and cost per goal in production.

## Self-check before task completion

- [ ] Agent scope is defined with explicit permitted and restricted tools
- [ ] Goal structure includes explicit (user-provided), implicit (system constraints), and emergent goals
- [ ] Reasoning loop architecture (ReAct/Plan-Act-Reflect/CoT+Tools) is selected and documented
- [ ] Loop termination conditions prevent infinite loops (max iterations, timeout, error threshold)
- [ ] Tool inventory is documented with input/output schemas and error modes per tool
- [ ] Self-correction mechanisms include validation, reflection, and retry logic with max retry limits
- [ ] Planning phase decomposes goals into subtasks with feasibility estimates
- [ ] Tool calls are wrapped with error handling (retry transient, escalate permanent, degrade gracefully)
- [ ] Reflection loops analyze action outcomes and adjust strategy ({action, expected, actual, error_analysis, next})
- [ ] Goal-state tracking maintains serializable, resumable state (progress, blockers, next action)
- [ ] Safety constraints validate tool inputs pre-execution and enforce rate limits
- [ ] Multi-agent coordination uses message passing, shared state, or supervisor patterns without race conditions
- [ ] Goal completion accuracy is validated at >80% success rate on test suite
- [ ] Loop efficiency is measured (target <10 iterations per task)
- [ ] Self-correction effectiveness is tested with simulated tool errors (target >70% recovery rate)
- [ ] Infinite loop prevention is validated with adversarial goals and termination condition testing
