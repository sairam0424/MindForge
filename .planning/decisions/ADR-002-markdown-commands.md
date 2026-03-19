# ADR-002: Use Markdown files for slash commands (not TypeScript)

**Status:** Accepted
**Date:** 2026-03-20
**Deciders:** MindForge core team

## Context
MindForge slash commands could be implemented as:
A) Markdown instruction files (what we chose)
B) TypeScript/JavaScript executable scripts
C) A mix of both

## Decision
Markdown instruction files for all commands.

## Options considered

### Option A — Markdown instruction files (chosen)
Pros:
- Readable and editable without a build step
- Can be updated directly by modifying text — no recompile
- Agents can read and follow them natively
- Community can contribute without TypeScript knowledge
- Work identically across all runtimes (Claude Code, Antigravity, OpenCode)

Cons:
- No type safety for command logic
- Cannot run unit tests on individual steps
- Edge case handling is described in prose, not enforced in code

### Option B — TypeScript scripts
Pros: Type safety, unit testable, programmatic edge case handling
Cons: Build step required, runtime-specific, harder to contribute to,
      loses the "human-readable instructions" quality that makes them good agent prompts

### Option C — Mix
Assessed as worst of both: complexity of both without full benefit of either.

## Rationale
MindForge commands are agent prompts, not programs. Their primary consumer is
an AI agent reading natural language. Markdown is the best format for that use case.
Logic enforcement happens through agent quality gates, not code compilation.

## Consequences
Command edge cases must be described carefully in prose.
A future "command validator" tool could parse and verify command files statically.
