# MindForge Persona Customisation

## Overview
MindForge personas are shared and versioned. To tailor them for a specific
project or phase, use the override system rather than editing the core persona
files. Overrides are additive and safe to maintain across upgrades.

## Where overrides live
- Project overrides: `.mindforge/personas/overrides/[persona].md`
- Phase overrides: `.planning/phases/[N]/persona-overrides/[persona].md`

Priority order:
1. Phase override
2. Project override
3. Core persona

## Override format
Overrides extend, modify, or remove sections from the base persona.
Use the following directives:

- `## Additional [section]` — append content to the base persona section
- `## Modified [section]` — replace the base persona section
- `## Removed [section]` — remove the base persona section
- `KEY: VALUE` — override specific parameters (e.g., `MAX_FUNCTION_LINES: 60`)

## Example override

```markdown
# Developer Persona Override — Payments Service
# Scope: project
# Author: Jane Doe
# Created: 2026-03-20

## Additional coding standards
- All payment flows must be idempotent.
- All monetary values use integer cents.

## Modified conventions
# Override: "Functions ≤ 40 lines" → allow 60 lines for orchestrators.
MAX_FUNCTION_LINES: 60

## Project-specific forbidden patterns
- Never call Stripe directly from controllers — use PaymentService only.
```

## Best practices
- Keep overrides minimal and specific.
- Prefer new personas only when the cognitive mode is fundamentally different.
- Document why an override exists so future maintainers understand its intent.
- Review overrides at the end of each phase; prune what is no longer relevant.

## Validation checklist
- [ ] Override file is scoped correctly (project vs. phase)
- [ ] Sections are clearly labeled (Additional / Modified / Removed)
- [ ] Conflicts are resolved (phase overrides win)
- [ ] Overrides do not contradict SECURITY.md
