---
name: "mindforge:realtime-analytics"
description: "Design real-time analytics backend. Usage: /mindforge:realtime-analytics [domain] [--engine clickhouse|druid|pinot] [--latency sub-second|seconds]"
argument-hint: "[domain] [--engine clickhouse|druid|pinot] [--latency sub-second|seconds]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive realtime-analytics system architecture with best practices and production-ready patterns.
</objective>

<execution_context>
@.mindforge/skills/real-time-analytics/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/real-time-analytics/`
State: Analyzes requirements, constraints, and scale to generate optimized realtime-analytics architecture.
</context>

<process>
1. **Requirement Analysis**: Analyze domain-specific requirements, performance constraints, and scalability needs.
2. **Architecture Design**: Design system architecture with component interaction patterns and data flow.
3. **Technology Selection**: Evaluate and select appropriate technologies, tools, and frameworks.
4. **Integration Strategy**: Define integration patterns with existing systems and external dependencies.
5. **Optimization Approach**: Implement performance, cost, and resource optimization strategies.
6. **Monitoring Framework**: Design observability, alerting, and debugging mechanisms.
7. **Deployment Planning**: Create deployment strategy with rollback procedures and disaster recovery.
</process>