# MindForge v2 — Browser Session Manager

## Principles
1. **Persistence**: Cookies and localStorage must survive between MindForge waves.
2. **Isolation**: Named sessions (admin, user, guest) prevent state leaking.
3. **Security**: Session files are GITIGNORED. Never commit auth tokens.

## Methods

### 1. Sequential Manual Logins
Agent navigates to /login, types credentials, and calls `/session/save name`.

### 2. External Import
Import cookies from your real browser (Chrome, Arc, Brave, Edge).
`/mindforge:browse --import-session admin --from chrome`

### 3. Programmatic (CI)
Sessions can be pre-seeded by writing `.mindforge/browser/sessions/name.json` directly from CI secrets.
