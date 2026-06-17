---
name: "mindforge:agent-design"
description: "Design autonomous agent architecture. Usage: /mindforge:agent-design [agent] [--loop react|plan-execute|reflexion] [--tools number]"
argument-hint: "[agent] [--loop react|plan-execute|reflexion] [--tools number]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive agent-design system architecture.
</objective>

<execution_context>
@.mindforge/skills/autonomous-agents/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/autonomous-agents/`
State: Analyzes requirements and constraints to generate agent-design architecture.
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
