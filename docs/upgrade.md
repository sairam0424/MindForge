# MindForge Upgrade Guide (v2.0.0)

This guide covers upgrades from v0.6.0 to v2.0.0.

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

### v0.6.0 to v1.0.0
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

### v1.0.0 to v2.0.0
```
/mindforge:migrate --from v1.0.0 --to v2.0.0
```
MindForge v2 uses an **additive-only** migration strategy. Existing data is never deleted; only new fields (like `runtime`, `agent_id`, and `model_group`) are backfilled into your `AUDIT.jsonl` and `token-usage.jsonl` files.

## 4. Verify
```
/mindforge:health
/mindforge:status
```

## 5. Known breaking changes

### v1.0.0
- `VERIFY_PASS_RATE_WARNING_THRESHOLD` now uses 0.0–1.0 (was 0–100)
- `AUDIT.jsonl` now requires `session_id` (auto-backfilled)
- `HANDOFF.json` now requires `plugin_api_version`

### v2.0.0
- **Multi-Runtime Entry Points**: If installing for Cursor or Copilot, ensure you use the correct `--local` flag to generate `.cursorrules` or `copilot-instructions.md`.
- **Preambles**: Non-slash runtimes now have a mandatory preamble in their entry files.

## 6. Rollback
If anything goes wrong, restore the migration backup:
```
ls .planning/migration-backup-*
cp .planning/migration-backup-<timestamp>/* .planning/
```

Then re-run `/mindforge:migrate --dry-run`.
