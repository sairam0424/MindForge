---
description: Design systems with appropriate complexity - no more, no less.
---
# 🏗️ /mindforge:architecture

<instruction>
Architect robust systems with clear boundaries, explicit trade-offs, and justified complexity using the MindForge System Architecture framework.
</instruction>

<context>
Follow the architectural governance defined in [.agent/skills/mindforge-system-architecture/SKILL.md](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-system-architecture/SKILL.md).
</context>

<rules>
- **Justify Complexity**: Every architectural addition must solve a documented problem.
- **Define Boundaries**: Ensure clear separation of concerns between services/modules.
- **Traceability**: All decisions must be mapped to project requirements.
- **Scale-Awareness**: Design for the next order of magnitude, but implement for the current one.
</rules>

<process>
1.  **Constraint Analysis**: Clarify scale, team size, and system lifespan.
2.  **Domain Mapping**: Identify core entities and their relationships.
3.  **Data Flow Design**: Map end-to-end flows and state transitions.
4.  **Complexity Audit**: Run the [Scaling Checklist](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-system-architecture/scaling-checklist.md) to eliminate over-engineering.
5.  **Trade-off Matrix**: Document selected approach vs. alternatives with pros/cons.
</process>

<supporting_documents>
- [Architecture Examples](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-system-architecture/examples.md)
- [Complexity Checklist](file:///Users/sairamugge/Desktop/MindForge/.agent/skills/mindforge-system-architecture/scaling-checklist.md)
</supporting_documents>

<output_format>
Produce an `ARCHITECTURE.md` draft or update containing:
- Executive Summary
- Component/Service Diagram (Mermaid)
- Data Flow Overview
- Trade-off Analysis
</output_format>
