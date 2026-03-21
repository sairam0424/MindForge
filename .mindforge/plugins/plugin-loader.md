# MindForge Plugin System — Loader Protocol

## Loading sequence (runs at session start)

### Step 1 — Discover installed plugins
```bash
MANIFEST=".mindforge/plugins/PLUGINS-MANIFEST.md"
[ -f "${MANIFEST}" ] || { echo "No plugins installed"; return; }

# Extract plugin names from manifest table rows
PLUGINS=$(grep "^| " "${MANIFEST}" | grep -v "^| Name" | grep -v "none" | \
  awk -F'|' '{gsub(/[[:space:]]/, "", $2); print $2}' | grep -v '^$')
```

### Step 2 — Validate each installed plugin

For each installed plugin directory at `.mindforge/plugins/[plugin-name]/`:

1. **plugin.json exists and is valid JSON**
2. **plugin_api_version compatibility**: read `plugin.json mindforge.plugin_api_version`
   and verify it matches the current supported API version (`1.0.0`)
3. **min_mindforge_version compatibility**: verify current MindForge version satisfies minimum
4. **Injection guard**: run against all command, skill, and persona `.md` files in the plugin
   - If injection patterns found: do NOT load. Log AUDIT entry, alert user
5. **Level 1 + Level 2 validation**: for every `SKILL.md` in the plugin

### Step 3 — Load plugin components

**Commands:**
```bash
# Detect currently installed built-in command names (dynamic, not hardcoded)
get_reserved_command_names() {
  ls ".claude/commands/mindforge/"*.md 2>/dev/null | \
    xargs -I{} basename {} .md | \
    sort
}

RESERVED_NAMES=$(get_reserved_command_names)

for CMD_FILE in ".mindforge/plugins/[plugin]/commands/"*.md; do
  CMD_NAME=$(basename "${CMD_FILE}" .md)

  # Check for conflict with reserved names
  if echo "${RESERVED_NAMES}" | grep -q "^${CMD_NAME}$"; then
    FINAL_NAME="${PLUGIN_NAME}-${CMD_NAME}"
    echo "  ⚠️  Command '${CMD_NAME}' conflicts with built-in — renaming to '${FINAL_NAME}'"
  else
    FINAL_NAME="${CMD_NAME}"
  fi

  cp "${CMD_FILE}" ".claude/commands/mindforge/${FINAL_NAME}.md"
  cp "${CMD_FILE}" ".agent/mindforge/${FINAL_NAME}.md"
done
```

**Skills:** Registered in MANIFEST.md under Tier 2 section (prefix: `[plugin-name]-`)

**Personas:** Installed as `.mindforge/personas/[plugin-name]-[persona].md`

**Hooks:** Registered in `.mindforge/plugins/hooks-registry.md`

Hook execution order:
- Multiple plugins with the same hook are executed in **PLUGINS-MANIFEST.md order**
  (first installed, first executed)
- Hook failures do not prevent other hooks from running

### Step 4 — Report loaded plugins

At session start, CLAUDE.md reads the loaded plugins list and reports:
```
Active plugins (2):
  jira-advanced v1.0.0 — hooks: post_phase_complete
  testing-playwright v0.9.0 — skills: playwright-e2e
```

If any plugin fails validation: skip it, report error, continue loading others.
Never fail the session start because a plugin is invalid.

### Step 5 — Write AUDIT entry for plugin load

```json
{
  "event": "plugins_loaded",
  "plugins": [
    { "name": "mindforge-plugin-jira-advanced", "version": "1.0.0", "hooks": ["post_phase_complete"] }
  ],
  "failed": []
}
```
