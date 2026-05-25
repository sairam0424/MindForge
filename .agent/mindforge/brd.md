---
description: "Generate Business Requirements Document with stakeholder analysis. Usage: /mindforge:brd [project] [--stakeholders list]"
---

<objective>
Produce a comprehensive Business Requirements Document (BRD) that captures stakeholder needs, maps current-state vs future-state, performs gap analysis, and delivers actionable requirements traceable to business outcomes.
</objective>

<execution_context>
@.mindforge/skills/business-analyst/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (project name or description, optional --stakeholders comma-separated list)
Knowledge: PROJECT.md context, existing PRDs, domain research, organizational goals.
</context>

<process>
1. **Identify stakeholders**: Enumerate all stakeholders for the project. For each, capture:
   - Name/role
   - Department or domain
   - Level of authority (decision-maker, influencer, contributor, informed)
   - Primary concerns and success metrics
   - Communication preference and frequency

2. **Build power-interest grid**: Plot stakeholders on a 2x2 matrix:
   - High Power / High Interest → Manage closely (key players)
   - High Power / Low Interest → Keep satisfied
   - Low Power / High Interest → Keep informed
   - Low Power / Low Interest → Monitor
   Derive engagement strategy per quadrant.

3. **Elicit requirements**: For each key stakeholder group, extract:
   - Business objectives (what outcome do they need?)
   - Functional requirements (what must the system do?)
   - Non-functional requirements (performance, security, compliance, accessibility)
   - Constraints (budget, timeline, technology, regulatory)
   - Assumptions and dependencies

4. **Draft BRD (10 sections)**:
   - 1. Executive Summary
   - 2. Business Objectives and Success Criteria
   - 3. Stakeholder Analysis (power-interest grid)
   - 4. Scope (in-scope, out-of-scope, future phases)
   - 5. Functional Requirements (numbered, prioritized)
   - 6. Non-Functional Requirements (measurable targets)
   - 7. Business Rules and Constraints
   - 8. AS-IS Process Model
   - 9. TO-BE Process Model
   - 10. Risk Register and Mitigation Plan

5. **Map AS-IS state**: Document the current process:
   - Process flow (steps, actors, systems involved)
   - Pain points and inefficiencies
   - Current metrics and baselines
   - Technology landscape in use today
   - Compliance obligations already met

6. **Map TO-BE state**: Document the desired future process:
   - Improved process flow
   - Eliminated pain points
   - Target metrics (with specific improvement percentages)
   - New technology components
   - New compliance requirements addressed

7. **Gap analysis**: For each AS-IS vs TO-BE delta:
   - Gap description
   - Impact if not addressed (quantified where possible)
   - Effort estimate (T-shirt size: S/M/L/XL)
   - Priority (Must/Should/Could/Won't — MoSCoW)
   - Dependencies on other gaps

8. **Define acceptance criteria**: For each functional requirement, write testable acceptance criteria using Given-When-Then format. Ensure each criterion is:
   - Specific (no ambiguity)
   - Measurable (pass/fail deterministic)
   - Traceable to a business objective

9. **Validate with stakeholders**: Present the BRD summary to stakeholders:
   - Highlight key trade-offs and decisions needed
   - Flag any conflicting requirements between stakeholder groups
   - Propose resolution options for conflicts
   - Request sign-off on scope and priorities

10. **Output BRD**: Write the final document to `.planning/BRD-[project-slug].md` with:
    - Version number and date
    - Approval signatures section
    - Change log
    - Traceability matrix (requirement → objective → stakeholder)
    - Appendices (glossary, acronyms, reference documents)
</process>
