/**
 * MindForge — HOOK_SPEC / tracked .claude/settings.json parity.
 *
 * bin/installer/hook-registration.js's own header comment claims this file
 * exists and pins HOOK_SPEC against the tracked settings file -- until
 * 2026-09-26, that claim was false: this file did not exist, and nothing
 * cross-checked HOOK_SPEC's hookId set against the real .claude/settings.json.
 * That gap is exactly what let 3 real hooks (PreCompact/SubagentStart/
 * SubagentStop) ship in .claude/settings.json without HOOK_SPEC ever being
 * updated -- so `npx mindforge-cc@latest --claude --local` installed the
 * script but never wired it into the generated settings.json (a real,
 * silent, script-lands-nothing-calls-it defect, found by a production dry
 * run and fixed the same day this test was added).
 *
 * IMPORTANT: this repo's own tracked .claude/settings.json is for THIS
 * repo's self-hosted dev/self-install use, and its commands use a DIFFERENT
 * literal syntax (`node .agent/hooks/run-with-flags.js <id> <script> ...`,
 * no $CLAUDE_PROJECT_DIR, .agent/-rooted paths) than commandFor() generates
 * for a fresh target project (`node "$CLAUDE_PROJECT_DIR/.claude/hooks/
 * run-with-flags.js" <id> <script> ...`, .claude/-rooted paths) -- the two
 * exist to serve different installs (this repo's own tree vs. a project
 * that just ran `npx mindforge-cc@latest`) and are NOT expected to match
 * byte-for-byte. What DOES need to match, and what this test actually
 * checks, is the SET of {event, hookId} pairs each side registers -- if
 * HOOK_SPEC is missing a pair the tracked file has (or vice versa), one of
 * the two install paths silently diverges from the other.
 *
 * Two directions, both required -- either alone misses half the drift class:
 *   1. every HOOK_SPEC {event, hookId} pair must have a matching command in
 *      the tracked settings.json for that event (catches HOOK_SPEC falling
 *      BEHIND the tracked file -- the exact defect this test exists for);
 *   2. every owned-looking {event, hookId} pair in the tracked settings.json
 *      must correspond to a HOOK_SPEC row (catches the tracked file gaining
 *      an entry HOOK_SPEC doesn't know about).
 *
 * Run: node tests/hook-spec-parity.test.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const {
  HOOK_SPEC,
  SETTINGS_REL,
  KNOWN_IDS,
} = require('../bin/installer/hook-registration');

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

const REPO_ROOT = path.join(__dirname, '..');
const settings = JSON.parse(
  fs.readFileSync(path.join(REPO_ROOT, SETTINGS_REL), 'utf8'),
);

// Extract the {event, hookId} pairs the tracked settings.json actually registers, by finding
// which KNOWN_ID appears as a space-delimited token in each command -- portable across both the
// $CLAUDE_PROJECT_DIR/.claude/... syntax commandFor() emits and this repo's own .agent/hooks/...
// self-install syntax, since both put the hookId as the dispatcher's first positional argument.
function trackedPairs() {
  const pairs = new Set();
  for (const event of Object.keys(settings.hooks || {})) {
    for (const group of settings.hooks[event] || []) {
      for (const h of group.hooks || []) {
        const tokens = String(h.command || '').split(/\s+/);
        const hookId = tokens.find((t) => KNOWN_IDS.includes(t));
        if (hookId) pairs.add(`${event}::${hookId}`);
      }
    }
  }
  return pairs;
}

console.log(
  '\nHOOK_SPEC <-> tracked .claude/settings.json parity (by {event, hookId} pair, not literal command)\n',
);

test('HOOK_SPEC has at least 11 rows (8 original + 3 lifecycle-audit added 2026-09-26)', () => {
  assert.ok(
    HOOK_SPEC.length >= 11,
    `expected >= 11 rows, got ${HOOK_SPEC.length}`,
  );
});

const specPairs = new Set(HOOK_SPEC.map((r) => `${r.event}::${r.hookId}`));
const foundPairs = trackedPairs();

HOOK_SPEC.forEach((row) => {
  test(`${row.event}/${row.hookId}: registered in the tracked ${SETTINGS_REL}`, () => {
    assert.ok(
      foundPairs.has(`${row.event}::${row.hookId}`),
      `no ${row.event} hook for hookId "${row.hookId}" found in ${SETTINGS_REL} -- HOOK_SPEC has fallen ahead of (or the tracked file has fallen behind) this row`,
    );
  });
});

test(`every {event, hookId} pair in the tracked ${SETTINGS_REL} corresponds to a HOOK_SPEC row (no drift in the other direction)`, () => {
  const orphaned = [...foundPairs].filter((pair) => !specPairs.has(pair));
  assert.strictEqual(
    orphaned.length,
    0,
    `Found {event, hookId} pair(s) in ${SETTINGS_REL} with no matching HOOK_SPEC row:\n  ${orphaned.join('\n  ')}`,
  );
});

test('the 3 lifecycle-audit rows are present for exactly PreCompact/SubagentStart/SubagentStop', () => {
  const auditRows = HOOK_SPEC.filter(
    (r) => r.hookId === 'mindforge-lifecycle-audit',
  );
  const events = auditRows.map((r) => r.event).sort();
  assert.deepStrictEqual(events, [
    'PreCompact',
    'SubagentStart',
    'SubagentStop',
  ]);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
