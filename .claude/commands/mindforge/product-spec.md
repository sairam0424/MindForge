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
