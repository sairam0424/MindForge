---
name: documentation
version: 1.0.0
triggers: README, docs, documentation, changelog, CHANGELOG, runbook, guide,
          getting started, API docs, comment, JSDoc, docstring, explain, describe
---

# Skill — Documentation

## When this skill activates
Any task involving writing or updating documentation, comments, or guides.
Switch to `tech-writer.md` persona when this skill activates.

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
