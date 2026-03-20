# ADR-008: Just-in-time skill loading over session-start loading

**Status:** Accepted
**Date:** 2026-03-20

## Context
When should skills be loaded — at session start (front-loaded) or at task time (JIT)?

## Decision
Just-in-time loading: skills are loaded immediately before the task that needs them.
Skills are not loaded at session start.

## Rationale
Front-loading all skills at session start would:
- Consume 30K+ tokens for 10 skills before any work begins
- Load skills irrelevant to the current task (e.g., loading incident-response
  skills for a UI component task)
- Pollute the agent's context with contradictory guidance from multiple domains

JIT loading means:
- Each task starts with only the relevant skills in context
- Context budget is spent on relevant expertise, not irrelevant policies
- Skills load at the moment they are most useful to the agent

## Consequences
- Skills must be re-loaded for each task (no session-level caching)
- The trigger index is built once at session start (inexpensive: reads frontmatter only)
- Skills that need to be available across multiple tasks should use the
  minimal context injection (trigger + mandatory actions only) to save budget
