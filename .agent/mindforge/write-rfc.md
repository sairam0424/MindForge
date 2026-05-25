---
description: "Author technical RFC or design document. Usage: /mindforge:write-rfc [title] [--template rfc|adr|design-doc|runbook]"
---

<objective>
Author a structured technical RFC or design document using the appropriate template, written for a cold reader with code examples and clear trade-off analysis.
</objective>

<execution_context>
@.mindforge/skills/technical-writing/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (document title, optional --template rfc|adr|design-doc|runbook)
Knowledge: Current architecture, existing RFCs/ADRs, team conventions, technical constraints.
</context>

<process>
1. **Select template**: Based on --template flag or document purpose:
   - **RFC**: Full proposal for significant system changes (new service, protocol change, major refactor)
   - **ADR**: Concise architectural decision record (single decision with context and consequences)
   - **Design Doc**: Detailed technical design for a feature (implementation-focused)
   - **Runbook**: Operational procedure for handling incidents or maintenance tasks
   - Each template has a defined structure — never deviate from it

2. **Fill structure**: Populate the selected template:
   - **RFC structure**: Title → Status (Draft/Proposed/Accepted/Rejected) → Summary (2-3 sentences) → Motivation (why now, what problem) → Detailed Design (how it works) → Drawbacks (honest downsides) → Alternatives Considered (what else was evaluated) → Open Questions (unresolved decisions) → References
   - **ADR structure**: Title → Date → Status → Context (forces at play) → Decision (what we chose) → Consequences (positive, negative, neutral)
   - **Design Doc structure**: Title → Authors → Reviewers → Summary → Background → Goals/Non-Goals → Design → Implementation Plan → Testing Strategy → Rollout Plan → Monitoring → Open Questions
   - **Runbook structure**: Title → When to Use → Prerequisites → Steps (numbered, exact commands) → Verification → Rollback → Escalation → Post-Incident

3. **Write for cold reader**: Ensure accessibility:
   - Define all acronyms on first use
   - Provide context before technical details (why before how)
   - Use diagrams to explain complex flows (ASCII art or description)
   - Link to relevant existing documentation (don't repeat, reference)
   - Write in active voice, present tense
   - One idea per paragraph, one decision per section
   - Assume the reader has general engineering knowledge but no project-specific context

4. **Add code examples**: Include concrete implementations:
   - Minimal working examples (not pseudocode — real, runnable code)
   - API usage examples showing request and response
   - Configuration snippets with comments explaining each field
   - Error handling examples (not just happy path)
   - Before/after comparisons for migration-type changes
   - Keep examples short (< 30 lines) — link to full implementation if longer

5. **Review completeness**: Validate the document:
   - Does the Summary stand alone? (reader should understand the proposal from Summary only)
   - Are all trade-offs honestly stated? (no strawman alternatives)
   - Are success criteria defined? (how do we know this worked?)
   - Are failure modes addressed? (what if this goes wrong?)
   - Is the scope clear? (what is explicitly NOT covered?)
   - Are dependencies identified? (what must exist before this can proceed?)
   - Is there a timeline? (when should this be decided/implemented?)

6. **Submit for feedback**: Prepare for review:
   - Identify reviewers (domain experts, stakeholders, implementers)
   - Highlight open questions that need input
   - Set review deadline (1 week for RFC, 3 days for ADR)
   - Define approval criteria (who must approve, what constitutes consensus)
   - Output the complete document in the appropriate location (.planning/rfcs/ or .planning/decisions/)
</process>
