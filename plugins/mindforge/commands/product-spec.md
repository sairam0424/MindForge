---
description: "Create PRD with user stories and prioritized backlog. Usage: /mindforge:product-spec [feature] [--framework RICE|MoSCoW]"
---

<objective>
Generate a Product Requirements Document with well-defined personas, user journeys, scored user stories, and a prioritized backlog ready for sprint planning. Outputs an actionable PRD with acceptance criteria.
</objective>

<execution_context>
@.mindforge/skills/product-manager/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (feature name or description, optional --framework for prioritization)
Knowledge: PROJECT.md, existing BRDs, market research, competitive analysis, user feedback.
</context>

<gated_question_flow>
> Adapted from the PRP-PRD interactive flow (PRPs-agentic-eng by Wirasm). This
> question-flow runs BEFORE and AROUND the `<process>` below — it augments, it
> does not replace, the personas / RICE / MoSCoW depth. Each gate is an explicit
> STOP: present the questions, then WAIT FOR USER RESPONSE before proceeding.

Flow: `INITIATE -> FOUNDATION -> GROUNDING -> DEEP DIVE -> GROUNDING (technical) -> DECISIONS -> GENERATE`

1. **INITIATE** — If `$ARGUMENTS` is empty, ask "What do you want to build?" If
   provided, restate your understanding and ask the user to confirm/adjust.
   **GATE: wait for the user.**
2. **FOUNDATION** — Ask (all at once): Who has the problem? What is the observable
   pain? Why can't they solve it today (and why do alternatives fail)? Why now?
   How will we know it's solved? **GATE: wait for the user.**
3. **GROUNDING (market + codebase)** — Research market/competitor context; if a
   codebase exists, explore relevant patterns. Summarize findings, ask "Does this
   refine your thinking?" **GATE: brief pause for the user** (may be "continue").
4. **DEEP DIVE** — Ask: one-sentence vision, primary user, Job-to-Be-Done, explicit
   non-users, constraints. **GATE: wait for the user.**
5. **GROUNDING (technical feasibility)** — Trace how similar features are built,
   map integration points, rate feasibility HIGH/MEDIUM/LOW with reasons. Summarize,
   ask for unknown technical constraints. **GATE: brief pause for the user.**
6. **DECISIONS** — Ask: MVP definition, must-have vs nice-to-have, key hypothesis
   ("We believe [capability] will [solve problem] for [users]; we'll know we're
   right when [measurable outcome]"), explicit out-of-scope, open questions.
   **GATE: wait for the user before generating.**
7. **GENERATE** — Only after the DECISIONS gate, run the `<process>` below and
   write the output (see `<output_mapping>`).

**Anti-invention rule (MANDATORY)**: Never fill a section with plausible-sounding
fluff. If information is missing, write **`TBD - needs research`** (and name the
method to resolve it) rather than inventing an answer. Acknowledge uncertainty
honestly; list open questions instead of hiding them.
</gated_question_flow>

<process>
1. **Define personas**: Create 2-4 user personas relevant to the feature:
   - Name, role, and demographic summary
   - Goals and motivations
   - Pain points and frustrations
   - Technical proficiency level
   - Key quote that captures their mindset
   - Usage frequency (daily, weekly, monthly)

2. **Map user journeys**: For each persona, trace the end-to-end journey:
   - Trigger (what initiates the journey)
   - Steps (each action the user takes)
   - Touchpoints (where they interact with the system)
   - Emotions at each step (frustrated, neutral, delighted)
   - Drop-off risk points
   - Success criteria for journey completion

3. **Write user stories**: For each journey step that requires system behavior:
   - Format: "As a [persona], I want to [action] so that [outcome]"
   - Include edge cases as separate stories
   - Tag with epic/theme grouping
   - Estimate complexity (story points: 1, 2, 3, 5, 8, 13)

4. **Score with framework**: Apply the selected prioritization framework:
   - **RICE**: Reach * Impact * Confidence / Effort (score each 1-10)
   - **MoSCoW**: Must have / Should have / Could have / Won't have
   - Document scoring rationale for each story
   - Flag any stories where team disagrees on score

5. **Prioritize backlog**: Rank all stories by framework score:
   - Group into release milestones (MVP, v1.1, v1.2, future)
   - Identify dependencies between stories (must-before relationships)
   - Mark stories that can be parallelized
   - Calculate total effort per milestone

6. **Define acceptance criteria**: For each Must-have story:
   - Given-When-Then scenarios (happy path + error paths)
   - Performance expectations (load time, response time)
   - Accessibility requirements (WCAG level)
   - Cross-browser/device requirements
   - Data validation rules

7. **Output PRD**: Write the complete PRD with sections:
   - Problem Statement (what pain are we solving, for whom, why now)
   - Goals and Non-Goals (explicitly state what we will NOT do)
   - Personas and User Journeys
   - Feature Requirements (prioritized backlog)
   - Technical Constraints and Dependencies
   - Success Metrics (leading and lagging indicators)
   - Release Plan (milestones with dates)
   - **Implementation Phases** (dependency table — see `<output_mapping>`)
   - Open Questions and Risks

8. **Define success metrics**: For the feature overall:
   - Adoption metric (% of target users who try it)
   - Engagement metric (frequency/depth of usage)
   - Retention metric (continued usage after 30 days)
   - Business metric (revenue, cost reduction, NPS impact)
   - Technical metric (error rate, latency, support tickets)

9. **Risk assessment**: Identify risks to successful delivery:
   - Technical risks (feasibility, integration complexity)
   - Market risks (user adoption, competitive response)
   - Resource risks (team availability, skill gaps)
   - Timeline risks (dependencies, scope creep triggers)
   - Mitigation plan for each risk

10. **Stakeholder review package**: Prepare summary for review:
    - One-page executive summary
    - Prioritized feature list with effort estimates
    - Key trade-off decisions requiring input
    - Timeline with confidence intervals
    - Request specific decisions from specific stakeholders
</process>

<output_mapping>
> Adapted from the PRP-PRD Implementation-Phases pattern. The PRD's phase table
> is the hand-off that lets `/mindforge:plan-phase` and `/mindforge:plan-write`
> auto-select the next pending phase.

**Primary output path**: write the generated PRD to `.planning/REQUIREMENTS.md`
(create the `.planning/` directory if it does not exist). This is the file
`/mindforge:execute-phase` and `/mindforge:plan-phase` read from.

**Implementation-Phases dependency table** — include this section in
`.planning/REQUIREMENTS.md`. The `Status` / `Parallel` / `Depends` columns let
downstream commands auto-select the next eligible pending phase (a phase is
eligible when its `Status` is `pending` and every phase in `Depends` is `complete`):

```markdown
## Implementation Phases

<!--
  STATUS:   pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 4" or "-")
  DEPENDS:  phases that must be complete first (e.g., "1, 2" or "-")
-->

| # | Phase | Description | Status | Parallel | Depends |
|---|-------|-------------|--------|----------|---------|
| 1 | {Phase name} | {What this phase delivers} | pending | - | - |
| 2 | {Phase name} | {What this phase delivers} | pending | - | 1 |
| 3 | {Phase name} | {What this phase delivers} | pending | with 4 | 2 |
| 4 | {Phase name} | {What this phase delivers} | pending | with 3 | 2 |
| 5 | {Phase name} | {What this phase delivers} | pending | - | 3, 4 |
```

**Anti-invention rule still applies**: any phase whose scope is not yet known
gets `TBD - needs research` in its Description rather than an invented deliverable.

**Next step to report**: tell the user to run `/mindforge:plan-phase` (or
`/mindforge:plan-write .planning/REQUIREMENTS.md`), which will read this table and
plan the next pending, dependency-satisfied phase.
</output_mapping>
