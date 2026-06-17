---
name: mindforge:delegate
description: "Task decomposition and delegation planning. Usage: /mindforge:delegate [project] [--team-size number] [--timeline weeks]"
argument-hint: "[project] [--team-size number] [--timeline weeks]"
allowed-tools:
  - list_dir
  - view_file
---

<objective>
Decompose complex projects into parallelizable workstreams with clear ownership, dependencies, and handoff protocols. Maximizes team throughput while minimizing coordination overhead.
</objective>

<execution_context>
@.mindforge/skills/delegation-patterns/SKILL.md
</execution_context>

<context>
Skills Directory: `.mindforge/skills/delegation-patterns/`
State: Analyzes project scope, team capabilities, and dependencies to generate delegation plan with task assignment matrix, communication protocols, and risk mitigation strategies.
</context>

<process>
1. **Project Decomposition**: Break project into 5-12 work packages. Each package should be independently testable, have clear success criteria, and take 1-2 weeks for one person. Identify vertical slices (e.g., "user auth flow end-to-end") over horizontal layers ("build all APIs").

2. **Dependency Mapping**: Create DAG of dependencies between work packages. Identify critical path (longest dependency chain). Flag packages with >3 dependencies as integration risk. Prioritize breaking dependency cycles (shared interfaces, feature flags, contract testing).

3. **Team Capability Matrix**: Map team members to (skill, seniority, availability). Senior backend (80h), mid frontend (40h part-time), junior fullstack (80h). Match work packages to capability gaps. Flag packages requiring skills not present in team (consultant needed).

4. **Parallelization Strategy**: Assign independent packages to parallel tracks. Track 1 (auth + API) → Person A. Track 2 (UI + state) → Person B. Track 3 (infra + observability) → Person C. Synchronize at integration milestones (sprint boundaries).

5. **Handoff Protocol**: Define deliverable artifacts per package (code + tests + docs + runbook). Specify acceptance criteria (test coverage ≥80%, latency <200ms, accessibility AA). Set review process (PR template, required reviewers, CI gates). Schedule integration sync (twice per sprint).

6. **Risk Mitigation**: Identify single points of failure (one person knows payments). Cross-train on high-risk packages. Set up knowledge transfer sessions. Document critical paths in runbook. Define escalation paths for blockers (TL → EM → Product).

7. **Communication Cadence**: Daily async standup (written updates in Slack). Twice-weekly sync for blockers (30min). Weekly integration demo (show working feature). End-of-sprint retro (what slowed us down). Use DACI for decisions (Driver, Approver, Contributors, Informed).
</process>
