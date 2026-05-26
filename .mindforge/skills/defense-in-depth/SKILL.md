---
name: defense-in-depth
version: 1.0.0
min_mindforge_version: 10.0.4
status: stable
triggers: defense in depth, layered validation, entry point guard, business logic guard, environment guard, debug instrumentation, validation layer, multi-layer security, input boundary, trust boundary guard, defensive coding, guard clause pattern
compose:
  - security-review
---

# Skill — Defense in Depth

## When this skill activates

Any task that introduces or modifies code handling external input, enforcing
business rules, managing environment-specific behavior, or adding observability.
Activate whenever you are building anything that crosses a trust boundary or
touches validation logic at any layer of the stack.

## Mandatory actions when this skill is active

Four independent validation layers must be applied. Each layer is autonomous:
failure or absence in one layer does NOT exempt the others.

### Layer 1 — Entry Point Validation

Apply at the API boundary (route handler, CLI argument parser, event handler):

- Schema validation using a strict schema library (Zod, Joi, Pydantic, etc.)
- Type coercion with explicit rules (string-to-number only where defined)
- Reject invalid input immediately with a 400-level response
- Never pass unvalidated input deeper into the system
- Strip unknown fields; never allow arbitrary pass-through

### Layer 2 — Business Logic Guards

Apply inside domain/service layer functions:

- Assert domain invariants (e.g., balance >= 0, state transitions are valid)
- State machine guards: verify current state allows the requested transition
- Authorization assertions: re-check permissions at the service boundary
- Fail loudly with descriptive errors when invariants are violated
- Never rely solely on entry point validation; business logic must self-protect

### Layer 3 — Environment Guards

Apply environment-specific behavior through configuration, not conditionals:

- **Production**: strict mode, no debug endpoints exposed, minimal error detail
  in responses, all logging structured and shipped to aggregator
- **Staging**: production-like but with extended logging and feature flags
- **Test**: relaxed logging, verbose error output, mock services allowed
- Guard debug endpoints behind environment checks (never reachable in prod)
- Validate required environment variables at startup; crash early if missing

### Layer 4 — Debug Instrumentation

Apply observability that aids debugging without compromising security:

- Structured logging with consistent fields (timestamp, traceId, userId, action)
- Trace IDs propagated through all layers (generate at entry point, pass down)
- Development assertions (enabled in test/dev, compiled out or disabled in prod)
- Never log secrets, tokens, passwords, or full request bodies in production
- Include enough context to reproduce issues from logs alone

## Independence principle

Each layer must function correctly even if the others are absent. This means:

- Business logic must not assume entry point already validated
- Environment guards must not assume instrumentation is active
- Instrumentation must not assume any specific validation has occurred
- Entry point validation must not assume business logic will catch overflows

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I validate at the entry point (schema, types, rejection of invalid)?
- [ ] Did I add business logic guards (invariants, state checks, auth assertions)?
- [ ] Did I implement environment guards (prod strict, test relaxed, no debug in prod)?
- [ ] Did I include debug instrumentation (structured logs, trace IDs, assertions)?
- [ ] Are all four layers independent (no layer relies on another for correctness)?
- [ ] Did I verify that secrets are never exposed in any logging layer?
