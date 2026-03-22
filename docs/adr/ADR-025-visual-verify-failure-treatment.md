# ADR-025: <verify-visual> Failure Treatment

## Status
Accepted

## Context
Visual verification is a critical part of the UI development lifecycle in MindForge v2. Failures in visual verification often indicate broken layouts or missing components that standard unit/integration tests might miss.

## Decision
Failures within a `<verify-visual>` block in a PLAN file will be treated as fatal errors, equivalent to a `<verify>` (shell command) failure.

1. The wave executor will stop immediately if a visual verification fails.
2. The user will be notified of the specific failure (e.g., "Element not visible").
3. Subsequent waves or phase-level verification will not proceed until the failure is resolved.

## Consequences
- High confidence in UI integrity.
- Prevents "broken" UI states from being committed to the codebase.
- May slightly increase development time if visual selectors are brittle.
