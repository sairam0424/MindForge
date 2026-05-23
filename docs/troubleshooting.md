# MindForge Troubleshooting (v10.0.1)

This page lists common issues and fast fixes. If you get stuck, start with
`/mindforge:health`.

## 1. Install issues

### Installer exits immediately
**Symptom:** `npx mindforge-cc` returns without installing.
**Fix:** Ensure Node.js 18+.
```bash
node -v
```
Upgrade if below 18.

### Existing CLAUDE.md overwritten
**Symptom:** Custom instructions seem missing.
**Fix:** The installer creates a backup if the old file didn’t include MindForge.
Look for `CLAUDE.md.backup-<timestamp>` and merge your content.

### Commands not showing
**Symptom:** `/mindforge:help` doesn’t list commands.
**Fix:** Verify the install location:
- Claude Code: `~/.claude/commands/mindforge/`
- Antigravity: `~/.gemini/antigravity/mindforge/`
Run `/mindforge:health --repair`.

---

## 2. Health check failures

### CLAUDE.md drift detected
**Fix:**
```
/mindforge:health --repair
```
This restores the canonical MindForge CLAUDE.md.

### Missing .planning files
**Fix:**
```
/mindforge:init-project
```
If you already have a project, run `/mindforge:map-codebase` instead.

---

## 3. Migration / update problems

### Update available but fails to apply
**Fix:** Retry with explicit scope:
```bash
npx mindforge-cc@latest --claude --local --force
```
Then run:
```
/mindforge:migrate --from v9.0.0 --to v10.0.1
```

### Schema mismatch warning on startup
**Fix:**
```
/mindforge:migrate --dry-run
/mindforge:migrate --from vX.Y.Z --to v10.0.1
```

### AUDIT.jsonl parse errors
**Fix:** Migration preserves invalid lines. If a line is corrupt, archive it and
rerun migration. See `.mindforge/audit/AUDIT-SCHEMA.md` for expected format.

---

## 4. CI mode issues

### CI silently skips interactive steps
**Expected:** In CI, MindForge runs non-interactive by design.
**Fix:** Ensure `CI=true` is set only in CI. Locally, unset it.

### CI pipeline fails on Tier 3 changes
**Expected:** Tier 3 changes fail CI by design.
**Fix:** Route Tier 3 changes through approvals.

---

## 5. Plugin issues

### Plugin not loading
**Fix:**
- Run `/mindforge:plugins validate`
- Check `plugin.json` for `mindforge_plugin_api_version: 1.0.0`
- Ensure `min_mindforge_version` is <= your version

### Command name conflicts
**Expected:** Conflicting commands are renamed as `plugin-name-command`.
**Fix:** Use the renamed command shown in output.

---

## 6. Token usage too high
**Fix:**
- Reduce file reads or limit to ranges
- Keep PLAN `<action>` lean (150–400 words)
- Limit full skill injections to 3
- Use `/mindforge:tokens --profile`

---

## 7. Security scan failures
**Fix:**
- Review `.planning/phases/<N>/SECURITY-REVIEW-<N>.md`
- Resolve CRITICAL/HIGH findings first
- Re-run `/mindforge:security-scan --deep --secrets --deps`

---

## 8. Neural Protocol Mesh Issues

### Protocol Step 0 fails to activate
**Symptom:** Commands proceed without activating `_extended` skills.
**Fix:** Run `/mindforge:neural-orchestrator --reset`. Ensure all `_extended` skills are present in `.agent/skills/`.

### Context drift in Parallel Mesh
**Symptom:** Parallel agents making conflicting decisions.
**Fix:** Run `/mindforge:parallel-mesh --sync`. This forces a global state re-synchronization across all active worker identities.

### Workspace isolation failure
**Symptom:** Conflicts between feature branches or dirty worktree.
**Fix:** Run `/mindforge:workspace-isolated --cleanup`. Use `/mindforge:health --repair` if `.git/worktrees/` is corrupt.

---

## 9. Getting help
If the above doesn’t resolve it:
- Review `docs/user-guide.md`
- Check `docs/security/SECURITY.md` for security issues
- Open a GitHub issue or join the Discord: `/mindforge:join-discord`
- **Architecture**: `docs/architecture/V5-ENTERPRISE.md`
- **Commands**: `docs/commands-reference.md`
- **Personas**: `docs/PERSONAS.md`
