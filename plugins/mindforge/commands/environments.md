---
name: "mindforge:environments"
description: "Design environment management system. Usage: /mindforge:environments [scope] [--type preview|ephemeral|staging] [--lifecycle hours|days|permanent]"
argument-hint: "[scope] [--type preview|ephemeral|staging] [--lifecycle hours|days|permanent]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive environments system architecture with best practices and production-ready patterns.
</objective>

<execution_context>
@.mindforge/skills/environment-management/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/environment-management/`
State: Analyzes requirements, constraints, and scale to generate optimized environments architecture.
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