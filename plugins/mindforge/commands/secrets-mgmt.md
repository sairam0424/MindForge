---
name: "mindforge:secrets-mgmt"
description: "Design secrets management platform. Usage: /mindforge:secrets-mgmt [scope] [--tool vault|aws-sm|doppler] [--rotation auto|manual]"
argument-hint: "[scope] [--tool vault|aws-sm|doppler] [--rotation auto|manual]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive secrets-mgmt system architecture with best practices and production-ready patterns.
</objective>

<execution_context>
@.mindforge/skills/secrets-platform/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/secrets-platform/`
State: Analyzes requirements, constraints, and scale to generate optimized secrets-mgmt architecture.
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