---
name: business-analyst
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: business requirements, BRD, stakeholder analysis, RACI matrix, gap analysis, swimlane diagram, use case, requirements elicitation, business process, stakeholder mapping, as-is to-be, requirement gathering
---

# Skill — Business Analyst

## When this skill activates
Any task involving business requirements gathering, stakeholder analysis, process mapping,
gap analysis, use case documentation, or translating business needs into specifications.

## Mandatory actions when this skill is active

### Before

1. **State the business problem** — One sentence, no solution referenced. If unclear, more discovery is needed.
2. **Map stakeholders** — Register with name, role, influence, and communication preference.
3. **Define scope** — Explicitly state IN scope and OUT of scope to prevent creep.

### During

#### Stakeholder power-interest grid
```
High Power + High Interest = Manage Closely (co-create requirements)
High Power + Low Interest  = Keep Satisfied (executive summaries only)
Low Power + High Interest  = Keep Informed (regular updates)
Low Power + Low Interest   = Monitor (minimal engagement)
```

#### Elicitation techniques (use 2+ per requirement set)
1. Structured interviews (10-15 open questions, 45-60 min per group)
2. Requirements workshops (3-8 cross-functional participants, affinity mapping)
3. Observation / contextual inquiry (shadow users, document workarounds)
4. Document analysis (SOPs, training materials, support tickets)
5. Prototyping (low-fidelity mockups to validate understanding)

#### BRD sections (mandatory 10)
1. Executive Summary | 2. Business Objectives + KPIs | 3. Scope (in/out/assumptions/constraints) | 4. Stakeholders + RACI | 5. Current State (AS-IS) | 6. Future State (TO-BE) | 7. Functional Requirements (numbered, prioritized) | 8. Non-Functional Requirements | 9. Risks + Mitigations | 10. Approval + Sign-off

#### RACI matrix rules
- Exactly ONE Accountable (A) per row — the final decision-maker
- At least one Responsible (R) per row — does the work
- Consulted (C) — input before decision; Informed (I) — notified after

#### AS-IS / TO-BE process mapping
- Swimlane format: one lane per actor/system
- Mark pain points with quantified impact (time wasted, error rate, cost)
- TO-BE shows measurable improvement for each pain point
- Calculate improvement metrics (e.g., "3 days to same-day, 93% reduction")

#### Gap analysis matrix
```
| Current State | Desired State | Gap Type | Action Required | Priority |
Gap types: Process | System | Automation | Data | People | Compliance
Every gap maps to a concrete, assignable action.
```

#### Use case template
- Actor, Precondition, Postcondition
- Main flow (numbered steps, system responses)
- Alternative flows (branching scenarios)
- Exception flows (error handling, edge cases)

### After

1. **Validate with stakeholders** — Walk through BRD with each group, confirm understanding.
2. **Trace to objectives** — Every requirement links to a business objective. Orphans = scope creep.
3. **Confirm testability** — Every functional requirement has a verifiable acceptance criterion.
4. **Version and baseline** — Lock approved requirements. Track changes via formal CR process.

## Self-check before task completion
- [ ] Business problem articulated without referencing a solution
- [ ] Stakeholder register complete with power-interest classification
- [ ] RACI defined for key decisions (exactly one A per row)
- [ ] AS-IS process documented with quantified pain points
- [ ] TO-BE shows measurable improvement over AS-IS
- [ ] Gap analysis maps every gap to a concrete action
- [ ] Requirements numbered, prioritized, traceable to objectives
- [ ] Use cases cover main, alternative, and exception flows
