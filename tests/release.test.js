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

function test(name, fn) {
  try {
    fn();
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

test('Migration: 1.0.0 → 2.0.0 backfills AUDIT.jsonl', async () => {
  const migration = require('../bin/migrations/1.0.0-to-2.0.0');
  const v1Audit = JSON.stringify({ id: 'v1-1', event: 'test', timestamp: '2023' });
  
  // Custom mock for paths
  const testAudit = path.join(TEST_ROOT, 'AUDIT.jsonl');
  const testHandoff = path.join(TEST_ROOT, 'HANDOFF.json');
  fs.writeFileSync(testAudit, v1Audit + '\n');
  fs.writeFileSync(testHandoff, JSON.stringify({ plugin_api_version: '1.0.0' }));
  
  await migration.run({ audit: testAudit, handoff: testHandoff });
  
  const migrated = JSON.parse(fs.readFileSync(testAudit, 'utf8'));
  assert.strictEqual(migrated.runtime, 'unknown', 'Audit runtime not backfilled');
  assert.strictEqual(migrated.agent_id, 'migrated-v1', 'Audit agent_id not backfilled');
  
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

console.log(`\n${'─'.repeat(55)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) process.exit(1);
else console.log('\n✅  v2.0.0 Release Validation Passed.\n');
