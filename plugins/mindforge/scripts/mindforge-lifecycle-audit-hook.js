// .agent/hooks/mindforge-lifecycle-audit-hook.js
// Records PreCompact / SubagentStart / SubagentStop firings to the audit chain.
// Must never throw: a hook script crash blocks the lifecycle event it's attached to.
'use strict';

const path = require('node:path');
const { appendAuditEntrySync } = require('../../bin/autonomous/audit-writer');

function main() {
  let payload = {};
  try {
    const raw = require('node:fs').readFileSync(0, 'utf8');
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
      subagent_type: payload.subagent_type || null,
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
