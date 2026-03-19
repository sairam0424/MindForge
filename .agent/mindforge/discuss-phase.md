# MindForge — Discuss Phase Command
# Usage: /mindforge:discuss-phase [N] [--batch] [--auto]
# Captures implementation decisions before planning begins.
# Run this BEFORE /mindforge:plan-phase for complex phases.

## Purpose
Planning without discussion produces generic plans.
Discussion captures YOUR decisions — layout preferences, library choices,
UX specifics, edge cases you've already thought through — so the planner
builds what you actually want, not what seems reasonable.

## When to use
- Any phase with UI/UX components (visual decisions need capturing)
- Any phase with multiple valid implementation approaches
- Any phase where you already have opinions on the approach
- Any phase touching external services (your preferences on APIs matter)
- Skip for trivial phases (e.g., "add one field to an existing form")

## Step 1 — Analyse the phase scope

Read:
- ROADMAP.md for the phase description
- REQUIREMENTS.md for the requirements in this phase
- ARCHITECTURE.md for relevant architectural context

Identify the phase's primary domain:
- **Visual/UI** → ask about layout, interactions, states, empty states, animations
- **API/Backend** → ask about response format, error handling, auth approach, versioning
- **Data/Database** → ask about schema design, migration strategy, data volume expectations
- **Integration** → ask about third-party API choices, error recovery, retry strategy
- **Infrastructure** → ask about deployment strategy, scaling approach, observability

## Step 2 — Structured discussion

Ask questions ONE AT A TIME. Wait for the full answer before asking the next.
Do not batch questions (unless `--batch` flag is provided).

### Visual/UI phases — ask about:
1. "Walk me through what a user sees on this screen from top to bottom."
2. "What does the empty state look like? (nothing loaded yet / no results / error)"
3. "Any animations or transitions you're picturing? Or keep it static?"
4. "On mobile — stacks vertically or anything different?"
5. "Any edge cases? (very long text, images that fail to load, loading states)"

### API/Backend phases — ask about:
1. "What's the intended consumer? Internal frontend / external developers / both?"
2. "For errors — do you want detailed error objects with field-level info or simple messages?"
3. "Rate limiting needed on any of these endpoints?"
4. "Any background processing involved, or all synchronous?"
5. "Versioning approach? /v1/ prefix or header-based?"

### Data/Database phases — ask about:
1. "What's the expected data volume? Thousands / millions / billions of rows?"
2. "Any fields that need full-text search vs. exact match?"
3. "Soft delete or hard delete for user-facing records?"
4. "Any fields that change frequently vs. infrequently? (affects indexing strategy)"
5. "Data retention requirements? When can records be deleted?"

### Integration phases — ask about:
1. "Have you already chosen the third-party service / API? If so, which?"
2. "What should happen if the third-party service is down? Queue / fail / fallback?"
3. "Webhooks or polling for receiving updates?"
4. "Any rate limits you know about on their end?"
5. "Testing approach? Do they have a sandbox environment?"

## --batch mode
If `--batch` flag is provided: group related questions and present them together.
Appropriate when the user wants faster intake and is familiar with MindForge.

Example batch:
```
Visual decisions for Phase 2:
  1. Layout: card grid / table / list?
  2. Empty state: illustration / simple message / hide section?
  3. Loading: skeleton / spinner / none?
  4. Mobile: same layout / stacked / hidden?
Answer 1-4:
```

## --auto mode
If `--auto` flag is provided: skip the discussion entirely.
The planner will make reasonable defaults for all decisions.
Use when: the phase is straightforward and you trust the planner's judgment.
Warn: "Skipping discussion. Planner will make implementation decisions.
       Results may not match your vision exactly."

## Step 3 — Write CONTEXT.md

After discussion, write `.planning/phases/[N]/CONTEXT.md`:

```markdown
# Phase [N] Implementation Context
# Captured: [ISO-8601]
# Discussion mode: [interactive / batch / auto]

## Phase description
[From ROADMAP.md]

## Implementation decisions (captured from discussion)

### [Domain: Visual / API / Data / Integration / etc.]

**Decision:** [What was decided]
**Rationale:** [Why — from user's words]
**Implications for planning:**
  - [What the planner should do because of this decision]
  - [Specific library or pattern to use]
  - [What to avoid]

[Repeat for each significant decision]

## Open questions (unresolved during discussion)
- [Question 1]: [Status — decide during planning / decide during execution]

## User's explicit preferences
[Verbatim or near-verbatim quotes from the discussion that capture specific intent]

## Defaults accepted (decisions the user deferred to the planner)
- [Area]: planner's choice
```

## Step 4 — Confirm and guide

Show the user a summary of what was captured:

"✅ Phase [N] discussion complete. [N] decisions captured.

  Key decisions:
  - [Decision 1 summary]
  - [Decision 2 summary]
  - [Decision 3 summary]

  See full context: .planning/phases/[N]/CONTEXT.md

  Next step: Run /mindforge:plan-phase [N] to create implementation plans
  using these decisions."
