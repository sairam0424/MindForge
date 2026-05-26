---
name: mindforge:feature-store
description: "Design ML feature store. Usage: /mindforge:feature-store [domain] [--store feast|tecton|vertex] [--type batch|realtime|both]"
argument-hint: "[domain] [--store feast|tecton|vertex] [--type batch|realtime|both]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive feature-store system architecture.
</objective>

<execution_context>
@.mindforge/skills/ml-feature-store/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/ml-feature-store/`
State: Analyzes requirements and constraints to generate feature-store architecture.
</context>

<process>
1. **Requirement Analysis**: Analyze domain-specific requirements and constraints.
2. **Architecture Design**: Design scalable system architecture with best practices.
3. **Component Selection**: Select appropriate technologies and tools for implementation.
4. **Integration Strategy**: Define integration patterns with existing systems.
5. **Optimization Approach**: Implement performance and cost optimization strategies.
6. **Monitoring Framework**: Design observability and alerting mechanisms.
7. **Deployment Planning**: Create deployment strategy with rollback procedures.
</process>
