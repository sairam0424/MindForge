# ADR-026: Browser Session Persistence and Security

## Status
Accepted

## Context
MindForge v2 persists browser sessions (cookies, localStorage) to allow for seamless multi-phase development without re-authentication.

## Decision
1. Session files will be stored in `.mindforge/browser/sessions/`.
2. All files in this directory will be explicitly ignored by Git to prevent leaking sensitive credentials (auth tokens).
3. Session files are JSON-formatted and map directly to Playwright's state format.

## Implementation
- Update `.gitignore` to include `.mindforge/browser/sessions/`.
- `session-manager.js` will handle the logic for atomic file writes and reads.

## Consequences
- Security: Credentials are kept local to the developer's machine.
- Dev Experience: Sessions persist across restarts of the tool or the daemon.
