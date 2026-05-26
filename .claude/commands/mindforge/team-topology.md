---
description: "Design team structure with interaction modes. Usage: /mindforge:team-topology [teams] [--type stream-aligned|platform|enabling] [--load-assess]"
---

<objective>
Design or evaluate team structures using Team Topologies principles, assessing cognitive load, defining team types and interaction modes, and planning transitions to reduce delivery bottlenecks.
</objective>

<execution_context>
@.mindforge/skills/team-topology-design/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (team names or org scope, optional --type, optional --load-assess)
Knowledge: Current org chart, service ownership map, deployment frequency per team, incident escalation patterns.
</context>

<process>
1. **Inventory Current Teams**: Map all existing teams, their members, owned services/domains, and current responsibilities. Identify any shared ownership or unclear boundaries.
2. **Assess Cognitive Load Per Team**: For each team, evaluate: number of services owned, technology diversity, domain complexity, on-call burden, and cross-team dependencies. Flag teams exceeding sustainable load.
3. **Identify Overloaded Teams**: Teams with cognitive load score > 7/10 are candidates for splitting. Teams with < 3/10 may be candidates for merging or expanding scope.
4. **Recommend Team Type**: Classify each team as stream-aligned (delivers end-to-end value), platform (provides self-service capabilities), enabling (helps others adopt new skills), or complicated-subsystem (manages complex domain requiring specialists).
5. **Define Team Boundaries**: Draw clear boundaries using domain-driven design bounded contexts. Each team should own a coherent domain with minimal cross-cutting concerns.
6. **Specify Interaction Modes**: For each team pair that interacts, define the mode: collaboration (working closely together, time-limited), X-as-a-service (clear API contract), or facilitating (helping another team learn).
7. **Identify Team APIs**: Define what each team exposes to others: service contracts, documentation, support channels, SLAs. Platform teams need explicit self-service interfaces.
8. **Plan Transition**: If restructuring is needed, create a phased migration plan with intermediate states, communication plan, and success metrics. Avoid big-bang reorgs.
</process>
