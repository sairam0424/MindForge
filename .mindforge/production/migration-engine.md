# MindForge Production — Migration Engine

## Purpose
Provide a safe, repeatable path for upgrading `.planning/` state files across
MindForge versions without losing data or breaking governance.

The migration engine is the authoritative source for state schema upgrades:
- `HANDOFF.json`
- `STATE.md`
- `AUDIT.jsonl`
- `MINDFORGE.md` (only when format changes are required)

## Entry points
- CLI: `node bin/migrations/migrate.js --from <version> --to <version>`
- Command: `/mindforge:migrate [--from vX.Y.Z] [--to vA.B.C] [--dry-run]`
- Update flow: `/mindforge:update --apply` (auto-runs migration)

## Version chain
Migrations are applied in order using `bin/migrations/schema-versions.js`.
Supported range:
- `0.1.0` -> `0.5.0`
- `0.5.0` -> `0.6.0`
- `0.6.0` -> `1.0.0`

## Backup and recovery
Before any migration:
1. Create `.planning/backup-<timestamp>/`
2. Copy `HANDOFF.json`, `STATE.md`, `AUDIT.jsonl`, `MINDFORGE.md` if present
3. Abort if backup fails

If migration fails:
- Restore files from backup
- Surface error with next steps

## Schema version source of truth
`HANDOFF.json.schema_version` is the authoritative indicator of state schema.
If missing, the current package version is used as a fallback.

## Safety rules
- Never mutate or delete `.planning/` files on `--dry-run`
- If a file is missing, skip it (do not create new state files)
- Preserve unknown fields for forward compatibility

## CI behavior
- In CI, migrations should be non-interactive
- Backup directories may be auto-deleted after successful migration
  to avoid disk accumulation in shared runners

## Troubleshooting
- If a migration fails, run `/mindforge:migrate --dry-run` to inspect plan
- If `AUDIT.jsonl` has invalid lines, they are preserved (not modified)
- If `MINDFORGE.md` value conversion fails, the file is left unchanged
