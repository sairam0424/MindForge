---
description: "Run explicit schema migrations for .planning/ files."
---

# MindForge — Migrate Command
# Usage: /mindforge:migrate [--from X.Y.Z] [--to X.Y.Z] [--dry-run]

## Purpose
Run explicit schema migrations for .planning/ files.
Normally triggered automatically by /mindforge:update.
Use this command manually when: auto-migration failed, manual version jump, recovery.

## Flow

### Auto-detect migration need
Prints the resolved target directory first (`Target: <path>`) — this tool resolves purely from the
current working directory, so confirm it before trusting anything after.
Read `schema_version` from HANDOFF.json.
Compare against current `package.json` version.
Determine migration path.
If schema_version is missing and no `--from` is given: warns and skips rather than silently
guessing — this is the most common failure mode right after an update, since the local install is
already the new version by the time a manual recovery run happens. Pass `--from` explicitly in that
case.

### Dry-run mode (--dry-run)
Show: the resolved target directory, and which migrations would run.
Make NO changes to any file.

### Backup first
Before any changes: create `.planning/migration-backup-[timestamp]/`
Verify backup integrity (file count, non-empty).
If backup fails: ABORT. Explain disk space issue.
Scoped to the schema files this tool itself owns (HANDOFF.json, STATE.md, AUDIT.jsonl,
MINDFORGE.md) — never the memory JSONL files v9-unified-memory reads, which are read-only inputs
and get no backup/restore of their own for that reason.

### Execute migrations
Run `node bin/migrations/migrate.js`.
Show progress for each migration.
If any migration fails: auto-restore from backup.

### Verify
Suggests running `/mindforge:health` after migration — not run automatically. Check its output
manually if the migration touched anything you're unsure about.
Preserve backup until user is satisfied — they must delete it manually.

## Manual version override
`/mindforge:migrate --from 0.1.0 --to 1.0.0` — forces migration between specified versions.
Use with care: intended for recovery scenarios where HANDOFF.json schema_version is wrong.

## AUDIT entry
