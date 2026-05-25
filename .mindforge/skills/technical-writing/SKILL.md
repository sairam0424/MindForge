---
name: technical-writing
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: technical writing methodology, ADR authoring guide, RFC structure template, design document framework, runbook authoring standard, api documentation methodology, technical document structure, documentation methodology, document template design, tech spec writing guide, architecture document format, writing quality framework
---

# Skill — Technical Writing

## When this skill activates
Any task involving authoring ADRs, RFCs, design documents, runbooks, API documentation,
or establishing documentation standards and templates.

## Mandatory actions when this skill is active

### Before writing
1. Identify the document type (ADR, RFC, design doc, runbook, API doc).
2. Identify the audience (developers, ops, product, executives).
3. Determine what decision or action the reader needs to take after reading.

### During writing
- Front-load the conclusion (busy readers skim — give them the answer first).
- One idea per section, one point per paragraph.
- Use examples — never say "consider using X" without showing the code/config.
- Write for the reader who has zero context about this system.
- Use active voice and concrete nouns.

### After writing
- Read the document as if you have never seen this codebase.
- Verify every claim is backed by a code reference or data point.
- Check that a reader can take action based solely on this document.

## Document types and templates

### ADR (Architecture Decision Record)
```markdown
# ADR-NNN: [Short Descriptive Title]

- **Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX
- **Date**: YYYY-MM-DD
- **Deciders**: [Names]

## Context
[What forces are at play? What problem triggered this decision?]

## Decision
[What did we decide? State it clearly in one sentence, then elaborate.]

## Options Considered
### Option A: [Name]
- Pros: ...
- Cons: ...

### Option B: [Name]
- Pros: ...
- Cons: ...

## Consequences
- [What becomes easier?]
- [What becomes harder?]
- [What new risks are introduced?]
```
Rules: One page max. Immutable once accepted (create new ADR to supersede). Record the "why" so future engineers don't revert to failed paths.

### RFC (Request for Comments)
```markdown
# RFC: [Title]

- **Author**: [Name]
- **Status**: Draft | Under Review | Accepted | Rejected
- **Date**: YYYY-MM-DD
- **Reviewers**: [Names]

## Summary
[2-3 sentences: what is this and why does it matter?]

## Motivation
[Why are we doing this? What problem does it solve? Include data if possible.]

## Detailed Design
[The meat — how does it work? Include diagrams, code samples, data models.]

## Drawbacks
[Why might we NOT do this? Be honest.]

## Alternatives Considered
[What else did we evaluate? Why were they rejected?]

## Open Questions
[What don't we know yet? What needs more investigation?]

## Rollout Plan
[How do we ship this incrementally? What's the rollback strategy?]
```
Rules: Seek feedback before implementation. Time-box review (1-2 weeks). Address all open questions before accepting.

### Design Document
```markdown
# Design: [Feature/System Name]

- **Author**: [Name]
- **Date**: YYYY-MM-DD
- **Status**: Draft | Approved | Implemented

## Problem Statement
[What problem are we solving? For whom? What's the impact of not solving it?]

## Background
[What context does the reader need? Prior art, related systems, constraints.]

## Goals and Non-Goals
### Goals
- [Measurable outcome 1]
- [Measurable outcome 2]

### Non-Goals
- [Explicitly out of scope item 1]

## Design
[Architecture, data model, API contracts, sequence diagrams]

## Alternatives Considered
[What else was evaluated? Why was it rejected?]

## Security / Privacy Considerations
[Data handling, auth, PII, encryption]

## Timeline
[Milestones with dates]
```

### Runbook
```markdown
# Runbook: [Incident/Procedure Name]

- **Last Updated**: YYYY-MM-DD
- **Owner**: [Team/Person]
- **Severity**: P1 | P2 | P3

## Trigger
[When should someone use this runbook? What alert fires?]

## Diagnosis
1. [Step 1 — check this metric/log]
2. [Step 2 — verify this service status]
3. [Step 3 — confirm scope of impact]

## Mitigation
1. [Step 1 — immediate action to stop bleeding]
2. [Step 2 — apply fix]
3. [Step 3 — verify fix applied]

## Escalation
- If Step 2 fails: page [Team/Person]
- If impact > [threshold]: declare incident via [process]

## Verification
- [ ] [How to confirm the issue is resolved]
- [ ] [Metric returns to baseline]

## Post-Incident
- [ ] Update this runbook if steps were wrong
- [ ] File ticket for permanent fix
```

### API Documentation
```markdown
## POST /api/v1/todos

Create a new todo item.

### Request
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| title | string | yes | Todo title (1-200 chars) |
| priority | enum | no | low, medium, high (default: medium) |

### Response (201 Created)
```json
{
  "id": "abc123",
  "title": "Buy groceries",
  "priority": "medium",
  "created_at": "2025-01-15T10:30:00Z"
}
```

### Errors
| Status | Code | Description |
|--------|------|-------------|
| 400 | VALIDATION_ERROR | Title is required or exceeds 200 chars |
| 401 | UNAUTHORIZED | Missing or invalid auth token |
| 429 | RATE_LIMITED | Exceeded 100 requests/minute |
```

## Writing principles

### Front-Load the Important Bits
- Lead with the conclusion/recommendation, then explain.
- The first sentence of every section should tell the reader whether to keep reading.
- If someone reads only the headings, they should get 80% of the message.

### Write for Zero Context
- Define acronyms on first use.
- Link to related documents rather than assuming knowledge.
- Include "Background" sections for non-obvious domain knowledge.

### Examples Over Abstractions
- Bad: "Use parameterized queries to prevent injection."
- Good: "Use parameterized queries: `db.query('SELECT * FROM users WHERE id = $1', [userId])`"

### Active Voice
- Bad: "The configuration file should be updated."
- Good: "Update the configuration file."

### Concrete Nouns
- Bad: "The system processes the data appropriately."
- Good: "The ingestion service validates JSON payloads against the schema."

## Anti-patterns to avoid
- Writing documentation after the fact (write during implementation).
- Documents with no audience or action defined.
- "See code for details" (the reader came to the doc to NOT read all the code).
- Undated documents with no owner (will rot immediately).
- ADRs that only list the chosen option (record alternatives and their trade-offs).

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Document type correctly identified and template applied?
- [ ] Audience defined — who reads this and what action do they take?
- [ ] Conclusion/recommendation front-loaded?
- [ ] Every claim backed by example, code reference, or data?
- [ ] A reader with zero context can understand and act on this?
- [ ] Document has owner and date?
