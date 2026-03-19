---
name: documentation
version: 1.0.0
min_mindforge_version: 0.1.0
status: stable
triggers: README, docs, documentation, changelog, CHANGELOG, runbook, guide,
          getting started, API docs, comment, JSDoc, docstring, explain, describe
---

# Skill — Documentation

## When this skill activates
Any task involving writing or updating documentation, comments, or guides.
Switch to `tech-writer.md` persona when this skill activates.

## Mandatory actions when this skill is active

### Before writing documentation
1. Identify the target audience and their goal.
2. Gather the exact commands or steps to reproduce the task.

### During writing
- Use clear headings and short paragraphs.
- Provide working examples where possible.
- Avoid assumptions about prior knowledge.

### After writing
- Verify examples and commands are correct.
- Ensure the document is linked from README or relevant index.

## README.md structure (for every project)
```markdown
# Project Name

One sentence that says exactly what this does.

## Quick start
[Fewest possible steps to get from zero to first value — under 5 minutes]

## Installation
[Step by step — no assumed knowledge]

## Usage
[The most common use case with a working code example]

## Commands / API reference
[Link to docs/commands-reference.md or inline if short]

## Configuration
[All environment variables with type, default, and description]

## Contributing
[How to run tests, branch naming, PR process]

## Licence
```

## Code comment standards
- Comment WHY, not WHAT. The code shows what. Comments explain intent.
- ✅ `// We use bcrypt cost 14 here because this is the admin auth path — speed is not critical`
- ❌ `// Hash the password`
- Remove TODO comments before committing to main. Create a ticket instead.
- Every exported function needs a JSDoc/docstring with: description, params, return, throws.

## JSDoc template
```typescript
/**
 * Verifies a JWT access token and returns the decoded payload.
 *
 * @param token - The raw JWT string from the Authorization header
 * @returns Decoded token payload containing userId and role
 * @throws {TokenExpiredError} If the token has passed its expiry time
 * @throws {InvalidTokenError} If the token signature is invalid
 */
export function verifyAccessToken(token: string): TokenPayload { ... }
```

## Changelog discipline
Every user-visible change must appear in CHANGELOG.md before release.
Format follows Keep a Changelog (keepachangelog.com).
Categories: Added, Changed, Deprecated, Removed, Fixed, Security.

## Self-check before task completion

Before marking a task done when this skill was active:

- [ ] Did I read the full SKILL.md before starting? (Not just the triggers)
- [ ] Did I activate the corresponding persona file?
- [ ] Did I apply every mandatory action in this skill, not just the ones
  I remembered off the top of my head?
- [ ] If this skill produced an output file (review, security report, etc.),
  has that file been written to the correct path?
