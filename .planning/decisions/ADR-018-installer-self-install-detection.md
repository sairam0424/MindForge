# ADR-018: Installer detects and handles self-install scenario

**Status:** Accepted | **Date:** v1.0.0 | **Day:** 7

## Context
Running `npx mindforge-cc --claude --local` inside the MindForge repo itself
would copy `.mindforge/` to `.mindforge/` (source = destination).

## Decision
Detect self-install by checking `package.json.name === 'mindforge-cc'`.
If self-install: skip framework file copies. Only install commands.

## Rationale
Core team runs the installer locally for testing frequently.
Silent no-op with a clear warning is better than a cryptic error or accidental self-overwrite.
