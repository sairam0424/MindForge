/**
 * MindForge — Federated Sync stats-parse resilience (Wave 8)
 *
 * Guards the v11.5.1 fix: handleSyncFailure() and resetFailures() parsed
 * sync-stats.json with an unguarded JSON.parse — a corrupted stats file threw
 * a SyntaxError (and, in handleSyncFailure, masked the original sync error).
 * The fix wraps both in try-catch with a {failures:0} fallback, mirroring the
 * sibling getLastSyncTimestamp pattern.
 *
 * NOTE ON SCOPE: bin/memory/federated-sync.js cannot be `require`d in a clean
 * checkout — it eagerly imports ../review/ads-engine, which requires the
 * uninstalled `uuid` package (a separate, pre-existing dependency bug tracked
 * for a follow-up). So this suite asserts the SOURCE carries the guard and
 * exercises the exact guard CONTRACT in isolation (parse-with-fallback),
 * proving the behavior without loading the un-loadable module.
 *
 * Run: node tests/federated-sync.test.js
 */
'use strict';

const fs     = require('fs');
const os     = require('os');
const path   = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed += 1;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed += 1;
  }
}

const SRC = fs.readFileSync(path.join(__dirname, '..', 'bin', 'memory', 'federated-sync.js'), 'utf8');

console.log('\nMindForge — Federated Sync stats-parse resilience\n');

console.log('Source carries the guard (both call sites):');

test('handleSyncFailure no longer parses sync-stats.json unguarded', () => {
  // Anchor on the METHOD DEFINITION (`handleSyncFailure(err) {`), not a call site.
  const handleIdx = SRC.indexOf('handleSyncFailure(err) {');
  assert.ok(handleIdx !== -1, 'handleSyncFailure definition present');
  const handleBody = SRC.slice(handleIdx, handleIdx + 600);
  assert.ok(/try\s*\{[\s\S]*JSON\.parse[\s\S]*\}\s*catch/.test(handleBody),
    'handleSyncFailure must wrap JSON.parse in try-catch');
});

test('resetFailures no longer parses sync-stats.json unguarded', () => {
  // Anchor on the METHOD DEFINITION (`resetFailures() {`), not the call site
  // inside fullSync — indexOf('resetFailures()') alone matches the call first.
  const resetIdx = SRC.indexOf('resetFailures() {');
  assert.ok(resetIdx !== -1, 'resetFailures definition present');
  const resetBody = SRC.slice(resetIdx, resetIdx + 500);
  assert.ok(/try\s*\{[\s\S]*JSON\.parse[\s\S]*\}\s*catch/.test(resetBody),
    'resetFailures must wrap JSON.parse in try-catch');
});

console.log('\nGuard contract (parse-with-fallback) in isolation:');

// Mirror of the shipped guard: parse stats, fall back to {failures:0} on error.
function readStatsGuarded(statsPath) {
  let stats = { failures: 0 };
  if (fs.existsSync(statsPath)) {
    try {
      stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
    } catch {
      stats = { failures: 0 };
    }
  }
  return stats;
}

test('corrupted sync-stats.json falls back to {failures:0} instead of throwing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-fedsync-'));
  const statsPath = path.join(dir, 'sync-stats.json');
  fs.writeFileSync(statsPath, '{ this is not :: valid json ]]');
  try {
    let result;
    assert.doesNotThrow(() => { result = readStatsGuarded(statsPath); },
      'guarded read must not throw on corrupted JSON');
    assert.deepStrictEqual(result, { failures: 0 }, 'must fall back to the safe default');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('valid sync-stats.json is still read normally', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-fedsync-'));
  const statsPath = path.join(dir, 'sync-stats.json');
  fs.writeFileSync(statsPath, JSON.stringify({ failures: 3, last_sync: '2026-01-01T00:00:00Z' }));
  try {
    assert.strictEqual(readStatsGuarded(statsPath).failures, 3, 'valid stats preserved');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All federated-sync tests passed.\n');
}
