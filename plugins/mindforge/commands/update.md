---
description: "Check for and apply MindForge framework updates in a safe, scope-preserving way."
---

# MindForge — Update Command
# Usage: /mindforge:update [--apply] [--force] [--check] [--skip-changelog]

## Purpose
Check for and apply MindForge framework updates in a safe, scope-preserving way.

## Execution flow

### 1. Version check
Execute `bin/updater/self-update.js` `checkAndUpdate()`.
Always show: current version, latest version, update type (major/minor/patch).

### 2. Changelog display (unless --skip-changelog)
Fetch and display the relevant CHANGELOG.md section.
For major updates: prefix with ⚠️ BREAKING CHANGES notice.
Limit display to 3,000 characters — link to full CHANGELOG for the rest.

### 3. Confirmation gate (unless --apply)
Without --apply: show update info, stop. Do not modify any files.
Message: "To apply this update: /mindforge:update --apply"

### 4. Apply (with --apply)
a. Detect original install scope (local vs global, claude vs antigravity)
b. Read schema_version from HANDOFF.json (captures current version BEFORE update)
c. Run `npx mindforge-cc@[latest] --[runtime] --[scope]`
d. Run migration: `node bin/migrations/migrate.js` with captured schema_version
e. Run /mindforge:health to verify update succeeded

### 5. Post-update health check
If health errors: surface them immediately with specific fix instructions.
Common post-update issue: CLAUDE.md and .agent/CLAUDE.md drifted → auto-repair.

## Error scenarios and recovery

| Error | Recovery |
|---|---|
| npm registry unreachable | Message: "Check internet. Manual: npm info mindforge-cc version" |
| Update download fails | Retry once, then suggest manual: `npx mindforge-cc@latest` |
| Migration fails | Restored from backup automatically. Run /mindforge:migrate manually. |
| Install scope detection fails | Prompt user: "Is your install global or local?" |

## AUDIT entry
