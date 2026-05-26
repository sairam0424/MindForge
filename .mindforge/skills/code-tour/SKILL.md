---
name: code-tour
version: 1.0.0
min_mindforge_version: 10.0.6
status: stable
triggers: code tour, codebase walkthrough, interactive tour, reading path, annotated guide, code exploration guide, progressive tour, guided exploration, architecture tour, code narrative, file tour, source walkthrough
---

# Skill — Code Tour

## When this skill activates

When generating guided explorations of a codebase to help someone understand its
architecture, data flow, or implementation patterns. Use when onboarding new team
members, documenting complex subsystems, or creating learning paths through
unfamiliar code.

A code tour is NOT a README or API reference — it is a narrative journey through
source files in a deliberate order, with annotations explaining the "why" at each
stop, building understanding progressively.

## Mandatory actions when this skill is active

### Before generating the tour

1. **Determine tour scope and audience:**
   - Who is this tour for? (new hire, external contributor, senior dev in new area)
   - What should they understand after completing the tour?
   - What prior knowledge can be assumed?
   - Scope: full system overview vs focused subsystem deep-dive

2. **Map the dependency graph:**
   - Identify the entry point(s) — `main`, `index`, `app`, CLI handler
   - Trace first-level imports from the entry point
   - Identify core modules vs utility/helper modules
   - Note circular dependencies or surprising coupling

3. **Select a tour strategy:**

   | Strategy | Best for | Approach |
   |----------|----------|----------|
   | Entry-point-first | Full system overview | Start at main, trace outward |
   | Data-flow | APIs, pipelines | Follow a request from ingress to response |
   | Layer-by-layer | Layered architecture | Config → Entry → Core → Utils → Edge |
   | Feature-slice | Specific feature | All files involved in one user story |
   | Dependency-graph | Library/framework | Follow import tree breadth-first |

4. **Plan the stop sequence:**
   - 8-15 stops is ideal (fewer feels shallow, more causes fatigue)
   - Each stop should build on the previous one
   - Alternate between "big picture" and "zoom in" stops
   - End with a synthesis stop that ties everything together

### During tour generation

**Stop format (mandatory for each stop):**

```markdown
## Stop N: [Descriptive Title]

**File:** `src/path/to/file.ts` (lines 42-87)

**Why this file matters:**
[1-2 sentences on this file's role in the system]

**What to notice:**
- [Key pattern, design decision, or technique used here]
- [Relationship to previous stop]
- [Any non-obvious behavior or convention]

**Key code:**
```[language]
// The critical section, with inline annotations
function handleRequest(ctx: Context) {
  // Notice: middleware chain is resolved here, not at registration time
  const pipeline = ctx.middleware.resolve();
  // ...
}
```

**Checkpoint:** After this stop, you should understand:
- [Concrete understanding goal 1]
- [Concrete understanding goal 2]
```

**Progressive complexity rules:**
- Stop 1-3: Configuration, entry points, "what runs when the app starts"
- Stop 4-7: Core business logic, primary data flow, key abstractions
- Stop 8-10: Edge cases, error handling, performance-critical paths
- Stop 11+: Advanced patterns, extension points, testing infrastructure

**Annotation principles:**
- Explain WHY this code exists, not WHAT it does (the code shows what)
- Highlight design decisions: "This uses X pattern because..."
- Call out conventions: "All handlers in this project follow this shape..."
- Note historical context if relevant: "This was refactored from X because..."
- Flag potential confusion points: "This looks like X but is actually Y because..."

**Connecting stops:**
- Each stop after the first must reference how it relates to previous stops
- Use phrases like: "Remember the middleware we saw in Stop 3? This is where..."
- Draw the thread of data/control flow between stops explicitly
- If stops are non-linear, explain why you're jumping to this location

### After tour generation

1. **Add a tour summary:**
   ```markdown
   ## Tour Summary

   **Total stops:** N
   **Estimated reading time:** ~X minutes
   **Key takeaways:**
   1. [Most important architectural insight]
   2. [Critical pattern used throughout]
   3. [Key design decision and its rationale]

   **Suggested next tours:**
   - [Related subsystem that builds on this understanding]
   - [Deeper dive into one area touched here]
   ```

2. **Verify tour coherence:**
   - Read through all stops sequentially — does the narrative flow?
   - Does each checkpoint build on the previous one?
   - Would the target audience actually understand this?
   - Are file paths and line numbers accurate and current?

3. **Output format:**
   - Single markdown file: `TOUR-[name].md` in the project root or `docs/tours/`
   - Include a table of contents with links to each stop
   - If the tour references specific commits or versions, note the git ref

## Self-check before task completion

Before marking a code tour task done:

- [ ] Did I identify the target audience and their prior knowledge level?
- [ ] Did I select an appropriate tour strategy for the scope?
- [ ] Does the tour have 8-15 stops with progressive complexity?
- [ ] Does every stop include: file path, why it matters, what to notice, checkpoint?
- [ ] Does the narrative flow logically from one stop to the next?
- [ ] Are file paths and line references accurate to the current codebase?
- [ ] Did I include a summary with key takeaways and suggested next tours?
- [ ] Would the target audience actually learn what they need from this tour?
