---
description: Run explicit schema migrations for .planning/ files.
---
# MindForge — Migrate Command
# Usage: /mindforge:migrate [--from X.Y.Z] [--to X.Y.Z] [--dry-run] [--force]

## Purpose
Run explicit schema migrations for .planning/ files.
Normally triggered automatically by /mindforge:update.
Use this command manually when: auto-migration failed, manual version jump, recovery.

## Flow

### Auto-detect migration need
Read `schema_version` from HANDOFF.json.
Compare against current `package.json` version.
Determine migration path.

### Dry-run mode (--dry-run)
Show: which migrations would run, what each changes.
Show: breaking changes for the migration path.
Make NO changes to any file.

### Backup first
Before any changes: create `.planning/migration-backup-[timestamp]/`
Verify backup integrity (file count, non-empty).
If backup fails: ABORT. Explain disk space issue.

### Execute migrations
Run `node bin/migrations/migrate.js`.
Show progress for each migration.
If any migration fails: auto-restore from backup.

### Verify
Run /mindforge:health after migration.
If health errors: report with specific fix instructions.
Preserve backup until user is satisfied — they must delete it manually.

## Manual version override
`/mindforge:migrate --from 0.1.0 --to 1.0.0` — forces migration between specified versions.
Use with care: intended for recovery scenarios where HANDOFF.json schema_version is wrong.

## AUDIT entry
