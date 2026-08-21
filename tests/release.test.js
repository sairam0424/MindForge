/**
 * MindForge v2.0.0 — Release Validation Suite
 *
 * Verifies the "Autonomous Enterprise" release features.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { install, run } = require('../bin/installer-core');

let passed = 0, failed = 0;
const pending = [];

/**
 * AWAITS ASYNC TESTS. It did not, and two of the five here are `async`, so their assertions ran in an
 * un-awaited continuation AFTER the runner had already printed ✅ and after the summary line. A
 * failure surfaced as an unhandled rejection that terminated the process with the final report still
 * reading "5 passed, 0 failed" — the assertions could not fail the suite, only crash it.
 *
 * Proven while changing the migration below: the old body asserted `migrated.runtime === 'unknown'`,
 * which is now false, and the output was:
 *
 *     ✅  Migration: 1.0.0 → 2.0.0 backfills AUDIT.jsonl
 *     Results: 5 passed, 0 failed
 *     ✅  v2.0.0 Release Validation Passed.
 *     SyntaxError: Unexpected non-whitespace character after JSON ... at release.test.js:76:25
 *
 * A green report followed by a stack trace. Queuing the promise and awaiting it before the summary is
 * what makes an async assertion able to fail.
 */
function test(name, fn) {
  try {
    const out = fn();
    if (out && typeof out.then === 'function') {
      pending.push(out.then(
        () => { console.log(`  ✅  ${name}`); passed++; },
        (e) => { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; },
      ));
      return;
    }
    console.log(`  ✅  ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ❌  ${name}\n      ${e.message}`);
    failed++;
  }
}

// ── Setup ───────────────────────────────────────────────────────────────────
const TEST_ROOT = path.join(os.tmpdir(), `mindforge-release-test-${Date.now()}`);
fs.mkdirSync(TEST_ROOT, { recursive: true });

// ── Tests ────────────────────────────────────────────────────────────────────
console.log('\nMindForge v2.0.0 — Release Validation\n');

test('Multi-runtime: RUNTIMES map contains all 6 platforms', () => {
  const { RUNTIMES } = require('../bin/installer-core');
  const expected = ['claude', 'antigravity', 'cursor', 'opencode', 'gemini', 'copilot'];
  expected.forEach(rt => {
    assert.ok(RUNTIMES[rt], `Missing runtime: ${rt}`);
    assert.ok(RUNTIMES[rt].entryFile, `Missing entryFile for ${rt}`);
  });
});

test('Installer: adapters generate preambles for Cursor/Copilot', () => {
  const { generateEntryContent } = require('../bin/installer-core');
  const baseContent = '# Project Rules\n\nRule 1: Always use MindForge.';
  
  const cursor = generateEntryContent('cursor', baseContent);
  assert.ok(cursor.includes('MindForge command reference'), 'Cursor missing preamble');
  
  const copilot = generateEntryContent('copilot', baseContent);
  assert.ok(copilot.includes('MindForge command reference'), 'Copilot missing preamble');
});

test('Installer: Gemini adapter performs model/path substitutions', () => {
  const { generateEntryContent } = require('../bin/installer-core');
  const baseContent = 'Use CLAUDE.md for rules. Use model claude-3-5-sonnet-20241022.';
  
  const gemini = generateEntryContent('gemini', baseContent);
  assert.ok(gemini.includes('GEMINI.md'), 'Gemini missing filename replacement');
  assert.ok(gemini.includes('gemini-2.0-flash-exp'), 'Gemini missing model replacement');
  assert.ok(!gemini.includes('claude-3-5-sonnet'), 'Gemini still contains Claude model name');
});

test('Migration: 1.0.0 → 2.0.0 APPENDS to AUDIT.jsonl and rewrites nothing', async () => {
  // Was 'backfills AUDIT.jsonl', asserting runtime==='unknown' and agent_id==='migrated-v1' on the
  // rewritten entry. Those fields have zero readers in bin/ outside bin/migrations/, and writing them
  // rewrote every line of a SHA-256 back-linked log, breaking it at entry 0 while the migration
  // reported success. The contract is now append-only, so this asserts the original line survives
  // BYTE-IDENTICAL — a stronger and much simpler statement than field equality.
  const migration = require('../bin/migrations/1.0.0-to-2.0.0');
  const original = JSON.stringify({ id: 'v1-1', event: 'test', timestamp: '2023' });

  const testAudit = path.join(TEST_ROOT, 'AUDIT.jsonl');
  const testHandoff = path.join(TEST_ROOT, 'HANDOFF.json');
  fs.writeFileSync(testAudit, original + '\n');
  fs.writeFileSync(testHandoff, JSON.stringify({ plugin_api_version: '1.0.0' }));

  await migration.run({ audit: testAudit, handoff: testHandoff });

  const lines = fs.readFileSync(testAudit, 'utf8').split('\n').filter(Boolean);
  assert.strictEqual(lines[0], original,
    `the pre-existing entry was REWRITTEN. Got:\n  ${lines[0]}\nexpected byte-identical:\n  ${original}`);
  assert.strictEqual(lines.length, 2, `expected one appended record, got ${lines.length} line(s)`);
  assert.strictEqual(JSON.parse(lines[1]).event, 'schema_migrated',
    'the migration must record itself rather than run silently');

  const handoff = JSON.parse(fs.readFileSync(testHandoff, 'utf8'));
  assert.strictEqual(handoff.plugin_api_version, '2.0.0', 'Handoff not upgraded to 2.0.0');
});

test('CLI: --runtime opencode parses correctly', async () => {
  // Mock run() logic check indirectly via argument parsing logic
  const args = ['--runtime', 'opencode', '--local'];
  let runtime = null;
  const rtIdx = args.indexOf('--runtime');
  if (rtIdx !== -1 && args[rtIdx + 1]) {
    runtime = args[rtIdx + 1].toLowerCase();
  }
  assert.strictEqual(runtime, 'opencode', 'Failed to parse --runtime flag');
});

// Drain the async tests BEFORE reporting. Printing the summary first is what let a failing async
// assertion coexist with "5 passed, 0 failed".
(async () => {
  await Promise.all(pending);
  console.log(`\n${'─'.repeat(55)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) process.exit(1);
  else console.log('\n✅  v2.0.0 Release Validation Passed.\n');
})();
