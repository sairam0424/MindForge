// .agent/hooks/mindforge-lifecycle-audit-hook.js
// Records PreCompact / SubagentStart / SubagentStop firings to the audit chain.
// Must never throw: a hook script crash blocks the lifecycle event it's attached to.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Resolve audit-writer.js across BOTH install channels this same file ships under
 * byte-identical (scripts/build-mindforge-plugin.js copies hook scripts verbatim, no
 * content rewriting):
 *   - dev/repo install: this file lives at .agent/hooks/, so the dependency sits two
 *     levels up, at <repoRoot>/bin/autonomous/audit-writer.js.
 *   - plugin install: this file is flattened to <pluginRoot>/scripts/, only one level
 *     up from the plugin root, so a literal '../../bin/autonomous/audit-writer' resolves
 *     OUTSIDE the plugin entirely (Cannot find module — the bug this fixes). The build
 *     script instead bundles the same dependency as a sibling at
 *     <pluginRoot>/scripts/autonomous/audit-writer.js (see HOOK_FILES in
 *     scripts/build-mindforge-plugin.js), so that candidate is tried first.
 *
 * Checked with fs.existsSync rather than a require()-and-catch-MODULE_NOT_FOUND loop, so a
 * real failure inside a FOUND audit-writer.js (e.g. one of ITS OWN deps missing from the
 * bundle) throws immediately with its own accurate message, instead of being masked by a
 * confusing "not found" from a second, irrelevant candidate path.
 */
function resolveAuditWriter() {
  const candidates = [
    path.join(__dirname, 'autonomous', 'audit-writer.js'),
    path.join(__dirname, '..', '..', 'bin', 'autonomous', 'audit-writer.js'),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(
      `mindforge-lifecycle-audit-hook: audit-writer.js not found at any of: ${candidates.join(', ')}`,
    );
  }
  return require(found);
}

const { appendAuditEntrySync } = resolveAuditWriter();

function main() {
  let payload = {};
  try {
    const raw = fs.readFileSync(0, 'utf8');
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    // No stdin, or not JSON — proceed with an empty payload rather than failing closed.
    // (Gemini-CLI invocations of this file, if any, will hit this path; that's fine —
    // this hook is audit-only, never a gate, so a no-op degrade is correct here.)
  }

  const auditPath = path.resolve(process.cwd(), '.planning', 'AUDIT.jsonl');
  const eventName =
    payload.hook_event_name ||
    process.env.MINDFORGE_HOOK_EVENT ||
    'unknown-lifecycle-event';

  try {
    appendAuditEntrySync(auditPath, {
      type: 'lifecycle',
      event: eventName,
      agent_type: payload.agent_type || null,
    });
  } catch {
    // Audit append failure must not block the lifecycle event — log to stderr only.
    process.stderr.write(
      `mindforge-lifecycle-audit-hook: failed to append audit entry for ${eventName}\n`,
    );
  }

  process.exit(0);
}

main();
