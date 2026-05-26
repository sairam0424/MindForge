---
name: mindforge:agent-deploy
description: "Deploy and monitor AI agents in production. Usage: /mindforge:agent-deploy [agent] [--strategy canary|shadow|blue-green] [--monitor]"
argument-hint: "[agent] [--strategy canary|shadow|blue-green] [--monitor]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Deploy AI agents to production with version pinning, progressive rollout strategies, and comprehensive monitoring that captures both operational metrics and output quality signals.
</objective>

<execution_context>
@.mindforge/skills/ai-agent-deployment/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/ai-agent-deployment/`
State: Manages agent lifecycle from staging validation through progressive production rollout with quality-aware monitoring.
</context>

<process>
1. **Pin Agent Version**: Lock the complete agent configuration — model version, system prompt hash, tool definitions, and parameter settings. Create an immutable deployment artifact with a unique version identifier.
2. **Select Deployment Strategy**: Choose between canary (gradual traffic shift), shadow (parallel execution without serving), or blue-green (instant cutover with rollback). Base decision on risk tolerance and observability maturity.
3. **Deploy to Staging**: Push the pinned agent version to a staging environment that mirrors production data patterns. Run automated acceptance tests covering core use cases and edge cases.
4. **Run Shadow Test**: Execute the new agent version in parallel with the current production agent on real traffic. Compare outputs without serving new agent responses. Measure quality delta and identify regressions.
5. **Canary to 5% Traffic**: Route a small percentage of production traffic to the new agent version. Monitor error rates, latency, token consumption, and output quality metrics during the canary window.
6. **Monitor Production Signals**: Track operational metrics (latency p50/p95/p99, token usage, error rate, timeout rate) and quality metrics (user satisfaction, task completion, hallucination rate, tool call success rate).
7. **Promote or Rollback**: Define automated promotion criteria (error rate < threshold, quality score >= baseline). If criteria are not met within the canary window, automatically rollback to the previous version.
8. **Configure Health Probes**: Set up liveness and readiness probes that verify the agent can successfully complete a representative task. Include model availability checks and tool connectivity verification.
9. **Set Up Alerting**: Configure alerts for anomalous behavior — latency spikes, token budget overruns, error rate increases, quality score drops. Route alerts based on severity to appropriate on-call channels.
10. **Document Rollback Procedure**: Produce a runbook covering manual rollback steps, traffic drain procedure, and post-incident analysis checklist for agent deployment failures.
</process>
