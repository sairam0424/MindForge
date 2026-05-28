# MindForge Upgrade Guide

This guide covers upgrades across all major MindForge versions.

---

## Upgrading from v10.x to v11.0.0

### Prerequisites
- Node.js >= 18.0.0
- MindForge v10.7.0 (run intermediate upgrades first if on older v10.x)

### Migration Steps

1. **Run the migration script:**
   ```bash
   node bin/migrations/10.7.0-to-11.0.0.js
   ```

2. **Update your code for breaking changes:**

   - If you catch `verifyZKProof` throws:
     ```javascript
     // Before (v10.x):
     try { quantumCrypto.verifyZKProof(proof, id); } catch { /* denied */ }

     // After (v11.0.0):
     const result = quantumCrypto.verifyZKProof(proof, id);
     if (!result.verified) { /* denied */ }
     ```

   - If you use `signPQ` return value as a string:
     ```javascript
     // Before (v10.x):
     const signature = quantumCrypto.signPQ(data, key);

     // After (v11.0.0):
     const { signature } = quantumCrypto.signPQ(data, key);
     ```

   - If you call `captureState` or `rollbackTo`:
     ```javascript
     // Before (v10.x):
     const dir = TemporalHub.captureState(id, meta);

     // After (v11.0.0):
     const dir = await TemporalHub.captureState(id, meta);
     ```

3. **Update SDK consumers:**
   ```bash
   npm update mindforge-sdk@11.0.0
   ```

4. **Verify:**
   ```bash
   npm test
   node bin/validate-config.js
   ```

### New Configuration Sections

After migration, `.mindforge/config.json` will have:
```json
{
  "temporal": { "max_snapshots": 50, "max_age_days": 7 },
  "rate_limiting": { "dashboard_rpm": 100 },
  "session": { "token_expiry_hours": 24 },
  "wave_execution": { "max_concurrency": 3 }
}
```

### Rollback

If issues arise:
```bash
cp .mindforge/config.json.v10-backup .mindforge/config.json
git checkout v10.7.0 -- bin/ sdk/
```

---

## General Upgrade Steps

### 1. Check version
```bash
node -e "console.log(require('./package.json').version)"
```

### 2. Update MindForge
```
/mindforge:update
/mindforge:update --apply
```

If the update fails, run:
```bash
npx mindforge-cc@latest --claude --local --force
```

### 3. Migrate schema files

#### v0.6.0 to v1.0.0
```
/mindforge:migrate --from v0.6.0 --to v1.0.0
```

#### v1.0.0 to v2.0.0
```
/mindforge:migrate --from v1.0.0 --to v2.0.0
```
MindForge v2 uses an **additive-only** migration strategy. Existing data is never deleted; only new fields (like `runtime`, `agent_id`, and `model_group`) are backfilled into your `AUDIT.jsonl` and `token-usage.jsonl` files.

### 4. Verify
```
/mindforge:health
/mindforge:status
```

### 5. Known breaking changes

#### v1.0.0
- `VERIFY_PASS_RATE_WARNING_THRESHOLD` now uses 0.0–1.0 (was 0–100)
- `AUDIT.jsonl` now requires `session_id` (auto-backfilled)
- `HANDOFF.json` now requires `plugin_api_version`

#### v2.0.0
- **Multi-Runtime Entry Points**: If installing for Cursor or Copilot, ensure you use the correct `--local` flag to generate `.cursorrules` or `copilot-instructions.md`.
- **Preambles**: Non-slash runtimes now have a mandatory preamble in their entry files.

### 6. Rollback
If anything goes wrong, restore the migration backup:
```
ls .planning/migration-backup-*
cp .planning/migration-backup-<timestamp>/* .planning/
```

Then re-run `/mindforge:migrate --dry-run`.

---

## v9.0.0 to v10.0.1

### What changed

| Area | Change | User action |
| :--- | :--- | :--- |
| **Database engine** | `better-sqlite3` replaced by `sql.js` (pure WASM) | None — transparent to consumers. Native build tools are no longer required. |
| **SDK memory module** | Rewritten for sql.js compatibility | If you consume `@mindforge/sdk`, update to v10.0.1 |
| **Dashboard auth** | Now requires a bearer token | Token is printed at startup. Pass it in the `Authorization` header. |
| **VectorHub API** | Factory function `createVectorHub()` is the preferred entry point | The backward-compatible proxy still works; no immediate action needed. |
| **Removed commands** | `sync-jira` and `sync-confluence` removed | These were never functional. Remove any references from your scripts. |
| **Package description** | Updated to reflect v10 branding | Informational only. |

### Upgrade steps

```bash
# 1. Update the framework
npx mindforge-cc --claude --local --force

# 2. Migrate schema files (additive-only, safe)
/mindforge:migrate --from v9.0.0 --to v10.0.1

# 3. Verify
/mindforge:health
```

### Notes for SDK consumers

If you use `@mindforge/sdk` directly (e.g., for custom integrations):

- The memory module has been rewritten. Update your SDK dependency to `^10.0.1`.
- Prefer `createVectorHub()` over direct instantiation. The legacy constructor proxy remains for backward compatibility but may be removed in a future major version.

### Notes for CI pipelines

- You no longer need `python`, `make`, or `gcc` in your CI images — `better-sqlite3` native compilation is gone.
- Ensure your Node version matrix includes 18, 20, and 22.
- Use `npm ci` for deterministic installs.
