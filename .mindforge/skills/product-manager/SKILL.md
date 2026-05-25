---
name: product-manager
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: user story, PRD, product requirements, backlog prioritization, RICE score, MoSCoW, jobs to be done, feature scoring, sprint planning, product backlog, acceptance criteria, user journey
---

# Skill — Product Manager

## When this skill activates
Any task involving product requirements, user story writing, backlog prioritization,
feature scoring, sprint planning, PRD creation, or user journey mapping.

## Mandatory actions when this skill is active

### Before

1. **Define the problem** — Articulate the user problem with evidence (tickets, data, interviews). No solutions yet.
2. **Identify personas** — 1-3 specific personas with context, goals, and frustrations.
3. **State success metrics** — Define how to measure success BEFORE designing the solution.

### During

#### PRD structure (6 mandatory sections)
1. **Problem Statement** — data-backed, who has it, how we know
2. **User Personas** — context, goal, frustration per persona
3. **Requirements** — functional (numbered, prioritized) + non-functional (perf, a11y)
4. **Success Metrics** — current baseline, target, measurement method per metric
5. **Scope + Timeline** — phases with explicit out-of-scope items
6. **Risks + Mitigations** — risk, probability, impact, mitigation plan

#### User story format
```
As a [persona], I want [action] so that [outcome/value].

Rules:
  - One story = one testable behavior
  - Always include "so that" (forces value articulation)
  - Completable in one sprint (split if larger)
  - Every story has acceptance criteria attached
```

#### Acceptance criteria (Given/When/Then)
```gherkin
Scenario: [descriptive name]
  Given [precondition/context]
  When [action taken]
  Then [observable outcome]
  And [additional assertions]
```
Cover: happy path, edge cases, error states, boundary conditions.

#### RICE scoring
```
Score = (Reach * Impact * Confidence) / Effort
  Reach: users affected per quarter
  Impact: 3=massive, 2=high, 1=medium, 0.5=low, 0.25=minimal
  Confidence: 100%=high, 80%=medium, 50%=low
  Effort: person-weeks
```
Show the math. Rank by score. Communicate rationale for top picks.

#### MoSCoW prioritization
- Must Have: non-negotiable for launch (failure without these)
- Should Have: expected, but launch survives without them
- Could Have: nice-to-have if time permits
- Won't Have: explicitly deferred (prevents scope creep)

#### Jobs-to-be-Done framework
```
Interview structure (45-60 min):
  1. First Thought — trigger that started the search
  2. Passive Looking — alternatives considered
  3. Active Looking — event that forced action NOW
  4. Decision — why this solution, what almost stopped them
  5. Satisfaction — does it deliver, what would cause switching

Output: "When [situation], I want to [motivation], so I can [outcome]."
```

#### User journey mapping
```
Stages: Awareness → Consideration → Setup → First Value → Expansion
Per stage: Actions, Touchpoints, Emotions, Pain Points, Opportunities, Metrics
```
Identify the critical drop-off points and design interventions for each.

### After

1. **Validate with users** — Show PRD to 2-3 target users. Confirm problem resonates.
2. **Engineering feasibility** — Tech lead confirms effort estimates and constraints.
3. **Stakeholder sign-off** — Explicit agreement on v1 scope vs deferred.
4. **Define done** — What must be true (metrics hit, not just code deployed).

## Self-check before task completion
- [ ] Problem statement evidence-backed (data, quotes, ticket volume)
- [ ] Personas specific with context, goals, and frustrations
- [ ] Success metrics have baseline, target, and measurement method
- [ ] Stories follow "As a... I want... So that..." with acceptance criteria
- [ ] Backlog prioritized with visible math (RICE/MoSCoW/WSJF)
- [ ] Scope states what is OUT as well as IN
- [ ] User journey maps full experience from awareness to expansion
- [ ] Engineering validated feasibility and effort
