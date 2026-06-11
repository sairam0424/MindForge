/**
 * MindForge Knowledge Capture Tests
 * Run: node tests/knowledge-capture.test.js
 *
 * Regression coverage for captureFromCompaction: a malformed handoff.json
 * must not crash the capture pipeline. It should mirror the missing-file
 * behavior (return []) instead of throwing on JSON.parse failure.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const KnowledgeCapture = require('../bin/memory/knowledge-capture');

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

function makeTempHandoff(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-knowledge-capture-'));
  const file = path.join(dir, 'HANDOFF.json');
  fs.writeFileSync(file, contents, 'utf8');
  return { dir, file };
}

console.log('\nMindForge Knowledge Capture Tests\n');

console.log('captureFromCompaction malformed-handoff handling:');

test('captureFromCompaction returns [] for an absent handoff file (baseline)', () => {
  const missing = path.join(os.tmpdir(), `mf-missing-${Date.now()}.json`);
  assert.ok(!fs.existsSync(missing), 'precondition: file must not exist');
  const result = KnowledgeCapture.captureFromCompaction(missing);
  assert.ok(Array.isArray(result), 'should return an array');
  assert.strictEqual(result.length, 0, 'should be empty');
});

test('captureFromCompaction does not throw on a malformed handoff file', () => {
  const { dir, file } = makeTempHandoff('{ this is : not valid JSON,,, ');
  try {
    assert.doesNotThrow(
      () => KnowledgeCapture.captureFromCompaction(file),
      'malformed handoff must not crash the capture pipeline'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('captureFromCompaction returns [] on a malformed handoff file', () => {
  const { dir, file } = makeTempHandoff('not json at all {{{');
  try {
    const result = KnowledgeCapture.captureFromCompaction(file);
    assert.ok(Array.isArray(result), 'should return an array');
    assert.strictEqual(result.length, 0, 'should mirror the missing-file path and be empty');
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
  console.log('\n✅ All knowledge-capture tests passed.\n');
}
