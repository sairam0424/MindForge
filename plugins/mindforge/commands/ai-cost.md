---
name: "mindforge:ai-cost"
description: "Optimize AI/ML infrastructure costs. Usage: /mindforge:ai-cost [system] [--budget monthly] [--optimize latency|cost|quality]"
argument-hint: "[system] [--budget monthly] [--optimize latency|cost|quality]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Design comprehensive ai-cost system architecture.
</objective>

<execution_context>
@.mindforge/skills/ai-cost-management/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/ai-cost-management/`
State: Analyzes requirements and constraints to generate ai-cost architecture.
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
