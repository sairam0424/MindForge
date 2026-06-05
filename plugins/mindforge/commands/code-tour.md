---
description: "Generate guided codebase walkthrough with annotated reading path. Usage: /mindforge:code-tour [path] [--depth shallow|deep] [--output TOUR.md]"
---

<objective>
Create a progressive, annotated codebase walkthrough that guides a new developer through the system in the optimal reading order — from entry points through hot paths to edge cases.
</objective>

<execution_context>
@.mindforge/skills/code-tour/SKILL.md
@.mindforge/skills/codebase-onboarding/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (target path or area, optional --depth shallow|deep, optional --output filename)
Knowledge: ARCHITECTURE.md, CONVENTIONS.md, module structure, dependency graph.
</context>

<process>
1. **Identify entry points**: Locate the system's primary entry points:
   - Application bootstrap (main.ts, index.ts, app.py, server.go)
   - Route/controller registration
   - Configuration loading sequence
   - Dependency injection container setup
   - For libraries: public API surface (exports from index)

2. **Trace hot paths**: Starting from entry points, trace the most important execution paths:
   - The "happy path" for the core use case
   - Request lifecycle (middleware → handler → service → repository → response)
   - Data flow from input to persistence
   - Event/message processing pipeline (if event-driven)
   - Mark each file touched with its role in the path

3. **Build progressive reading order**: Organize files into a numbered tour sequence:
   - Level 1: Entry points and configuration (understand how it starts)
   - Level 2: Core domain models and types (understand what it models)
   - Level 3: Service layer and business logic (understand what it does)
   - Level 4: Infrastructure and adapters (understand how it connects)
   - Level 5: Tests and edge cases (understand how it's verified)
   - Each level builds on knowledge from the previous level

4. **Annotate each stop**: For every file in the tour, provide:
   - **Stop number and title** (e.g., "Stop 3: User Authentication Service")
   - **Why this file matters** (1-2 sentences on its role in the system)
   - **Key sections to focus on** (specific line ranges or function names)
   - **Patterns to notice** (design patterns, conventions, architectural decisions)
   - **Connections** (what calls this, what this calls — upstream/downstream)

5. **Add understanding checkpoints**: After every 3-5 stops, insert a checkpoint:
   - Summary of what the reader should now understand
   - Questions to test comprehension ("Can you explain why X uses Y?")
   - Mental model diagram (ASCII box-and-arrow showing relationships learned so far)
   - Common misconceptions to avoid at this stage

6. **Document architecture decisions in context**: At relevant tour stops, explain:
   - Why this approach was chosen over alternatives
   - Historical context if visible from git blame or comments
   - Trade-offs accepted and their implications
   - When this decision should be revisited

7. **Handle depth modes**:
   - `--depth shallow`: Entry points + core domain + one hot path (10-15 stops)
   - `--depth deep`: Full system trace including infrastructure, error handling, and edge cases (25-40 stops)
   - Default: moderate depth covering all layers with representative examples (15-25 stops)

8. **Cross-reference with tests**: For each major component in the tour:
   - Point to the relevant test file
   - Highlight which behaviors are tested vs untested
   - Note any test patterns that reveal intended usage

9. **Write TOUR.md**: Output the complete tour document:
   - Table of contents with all stops
   - Prerequisites (tools, environment, background knowledge)
   - Estimated reading time per section
   - Numbered stops with full annotations
   - Checkpoints between sections
   - "Where to go next" section for deeper exploration
   - Glossary of project-specific terms

10. **Generate companion commands**: Produce helper commands:
    - Script to open all tour files in editor in order
    - Grep patterns to find related code not in the tour
    - Links to relevant external documentation
    - Suggested follow-up tours for specific subsystems
</process>
