# MindForge Troubleshooting (v11.9.3)

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
**Fix:** Ensure all `_extended` skills are present in `.agent/skills/`, then start a fresh session so the
skill loader re-reads them. There is no orchestrator reset command.

### Context drift in Parallel Mesh
**Symptom:** Parallel agents making conflicting decisions.
**Fix:** Re-synchronise by re-reading `.planning/HANDOFF.json` and `.planning/auto-state.json` before the
next wave — the mesh protocol is described in `.mindforge/engine/wave-executor.md`. It is a protocol you
follow, not a command.

### Workspace isolation failure
**Symptom:** Conflicts between feature branches or dirty worktree.
**Fix:** Run `/mindforge:workspace` to inspect worktree state. Use `/mindforge:health --repair` if
`.git/worktrees/` is corrupt.

---

## 9. Getting help
If the above doesn’t resolve it:
- Review `docs/user-guide.md`
- Check `docs/security/SECURITY.md` for security issues
- Open a GitHub issue: https://github.com/sairam0424/MindForge/issues
- **Architecture**: `docs/architecture/V5-ENTERPRISE.md`
- **Commands**: `docs/commands-reference.md`
- **Personas**: `docs/PERSONAS.md`

## Agent spawn returns immediately with no action
`spawn` mode in `bin/spawn-agent.js` exits with an error in v1.0. Real agent dispatch requires Claude Code slash commands. Use `/mindforge:auto` or `/mindforge:next` to dispatch agents.

## `importFromBrowser` crashes
Browser cookie import from native browser profiles is not implemented in v1.0. Use `saveSession`/`loadSession` instead. Check `sessionManager.capabilities.importFromBrowser` before calling.

## Tests fail when run from a parent directory
All tests must be run from the MindForge project root: `cd /path/to/MindForge && npm test`. Running from the parent workspace will produce false failures.

---

## Agent spawn returns immediately with no action

**Symptom:** `node bin/spawn-agent.js spawn architect` exits 1 with "Agent spawn dispatch not implemented in v1.0."

**Cause:** Spawn dispatch is a v1.0 stub — real agent dispatch requires Claude Code slash commands.

**Fix:** Use `/mindforge:auto` or `/mindforge:next` from Claude Code instead.

---

## `importFromBrowser` crashes with "not implemented"

**Symptom:** Calling `importFromBrowser(source)` throws unconditionally.

**Cause:** Native browser cookie DB import was removed when `better-sqlite3` was replaced with sql.js/WASM.

**Fix:** Use `saveSession`/`loadSession` instead. Check `sessionManager.capabilities.importFromBrowser` (returns `false`) before calling.

---

## Tests fail when run from parent directory

**Symptom:** ~52 false test failures when running `npm test` from `Not-Humans-World/` parent.

**Cause:** Test files use relative paths anchored to the MindForge project root.

**Fix:** Always run from the MindForge root: `cd /path/to/MindForge && npm test`

---

## `node bin/mindforge-cli.js validate-config` prints "Unknown command"

**Symptom:** The CLI does not recognize `validate-config` as a subcommand.

**Cause:** `validate-config` is exposed as a standalone binary, not a CLI subcommand.

**Fix:** Run `node bin/validate-config.js` directly.

---

## ZTAI Tier-3 warning appears unexpectedly

**Symptom:** `[ZTAI] WARNING: Tier-3 trust using simulated in-process key storage` appears on commands like `pr-review`.

**Cause:** Tier-3 trust uses in-process key simulation in v11.9.0. This is expected and safe — `SECURITY_TIER_3_SIMULATED = true` is the documented behavior.

**Fix:** No action required. See `SECURITY.md` for full disclosure. This is not a security vulnerability.

---

## `node bin/mindforge-cli.js --version` exits 1 (older installs)

**Symptom:** `--version` flag reports "Unknown command" on installs older than v11.9.0.

**Fix:** Upgrade: `npx mindforge-cc@latest --claude --local`

---

## Hooks are installed but nothing is blocked

**Symptom:** The hook scripts are present under `.claude/hooks/`, but a command that should be denied
— say `git commit --no-verify` — runs normally.

Hooks have two separate failure modes: **not registered** (no config names them) and **registered but
not live** (the config exists, the harness has not applied it). Check them in that order.

**1. Was registration attempted, and what did it decide?** The installer prints one line for every
outcome, and writes a receipt:

```
cat .mindforge/hook-registration.json
```

`registered: false` there carries the reason. Registration is deliberately narrow: Claude Code only,
`--local` only, non-Windows. A self-install inside a MindForge checkout also declines, because that
repo maintains its own tracked config.

**2. Restart the harness.** Claude Code snapshots hooks at session start, so a registration performed
during an open session is not live in it. This is the single most common cause.

**3. Confirm the project is trusted.** User-tier and project-tier settings are applied independently:
`~/.claude/settings.json` is the user tier and applies to every session, while
`<project>/.claude/settings.json` is the project tier and needs the project itself to be trusted.
Measured on one machine: the user-tier hooks fired on every tool call while the project-tier hooks in
the same session did not, and that project's entry in `~/.claude.json` had
`hasTrustDialogAccepted: false`. Accept the trust prompt for the directory, then use `/hooks` to
confirm the entries are listed.

**4. Drive the hook directly** to separate "the hook is broken" from "the hook is not wired". This
takes the harness out of the loop entirely — a deny-class hook must exit **2**:

```bash
echo '{"hook_event_name":"PreToolUse","tool_name":"Bash","cwd":"'"$PWD"'","tool_input":{"command":"git commit --no-verify -m x"}}' \
  | node .claude/hooks/run-with-flags.js mindforge-block-no-verify .claude/hooks/mindforge-block-no-verify.js minimal,standard,strict
echo "exit=$?"
```

Exit 2 with a `BLOCKED:` line on stderr means the hook works and the problem is registration or
trust. Exit 0 with the payload echoed back means the dispatcher could not load the script — check
that the second path exists under `.claude/hooks/`.

**5. If you launch the harness somewhere else, install there too.** Project settings are read from the
directory the harness starts in; they are **not** inherited from a parent directory. An ancestor
project having its own `.claude/settings.json` does not make its hooks apply here, and does not stop
these from applying — the installer warns when it sees one, and still registers.

**Known residual:** if `CLAUDE_PROJECT_DIR` is unset, or `node` is not on the hook PATH, the
registered commands exit 1 and the gate is simply absent — the same position as not installing. This
is a deliberate trade: a fail-closed shell tail was measured denying benign commands on a fresh
clone.
