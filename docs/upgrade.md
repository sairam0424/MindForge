# MindForge Upgrade Guide (v1.0.0)

This guide covers upgrades from v0.6.0 to v1.0.0.

## 1. Check version
```bash
node -e "console.log(require('./package.json').version)"
```

## 2. Update MindForge
```
/mindforge:update
/mindforge:update --apply
```

If the update fails, run:
```bash
npx mindforge-cc@latest --claude --local --force
```

## 3. Migrate schema files
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

## 4. Verify
```
/mindforge:health
/mindforge:status
```

## 5. Known breaking changes
- `VERIFY_PASS_RATE_WARNING_THRESHOLD` now uses 0.0–1.0 (was 0–100)
- `AUDIT.jsonl` now requires `session_id` (auto-backfilled)
- `HANDOFF.json` now requires `plugin_api_version`

## 6. Rollback
If anything goes wrong, restore the migration backup:
```
ls .planning/migration-backup-*
cp .planning/migration-backup-<timestamp>/* .planning/
```

Then re-run `/mindforge:migrate --dry-run`.
