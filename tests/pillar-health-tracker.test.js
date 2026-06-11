'use strict';

/**
 * Regression suite for bin/memory/pillar-health-tracker.js
 *
 * Guards against the v11.5.1 defect where summarizePhase() did
 *   const events = lines.map(l => JSON.parse(l));
 * with no per-line guard — a single malformed AUDIT.jsonl line threw a
 * SyntaxError and crashed the knowledge-capture pipeline.
 *
 * The fix parses each line in a try/catch, returning null for malformed
 * lines and filtering them out. These tests prove summarizePhase survives a
 * file containing a bad line, AND that the OLD unguarded approach would have
 * thrown on the exact same content.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');

const tracker = require('../bin/memory/pillar-health-tracker');

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

// Writes lines to a throwaway AUDIT.jsonl in the OS temp dir and returns its path.
function writeAudit(lines) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-pillar-health-'));
  const file = path.join(dir, 'AUDIT.jsonl');
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  return file;
}

console.log('\nMindForge Pillar Health Tracker — Malformed-Line Resilience\n');

// A realistic AUDIT.jsonl with one corrupt line wedged between valid events.
const goodEventA = JSON.stringify({
  event: 'scs_homing_injected',
  req_id: 'REQ-1',
  instruction: 'Enforce zero-trust boundary',
  confidence: 0.92,
});
const malformedLine = '{ this is not valid json :: oops';
const goodEventB = JSON.stringify({
  event: 'intelligence_upgrade_signalled',
});

console.log('Resilience:');

test('summarizePhase survives a file with a malformed line', () => {
  const auditPath = writeAudit([goodEventA, malformedLine, goodEventB]);
  let result;
  assert.doesNotThrow(() => {
    result = tracker.summarizePhase(auditPath);
  }, 'summarizePhase must not throw on a malformed AUDIT.jsonl line');
  assert.ok(result, 'expected a summary object');
});

test('malformed line is skipped but valid events are still processed', () => {
  const auditPath = writeAudit([goodEventA, malformedLine, goodEventB]);
  const result = tracker.summarizePhase(auditPath);

  // The intelligence_upgrade_signalled event survives parsing.
  assert.strictEqual(result.idcCount, 1, 'valid IDC event should be counted');

  // The high-confidence SCS homing event becomes a stability pattern.
  assert.strictEqual(result.stabilityPatterns.length, 1, 'valid SCS event should yield one pattern');
  assert.strictEqual(result.stabilityPatterns[0].req_id, 'REQ-1');
  assert.strictEqual(result.stabilityPatterns[0].efficacy, 0.92);
});

test('an all-malformed file does not crash and yields safe defaults', () => {
  const auditPath = writeAudit(['garbage', '<<<', 'not json either']);
  let result;
  assert.doesNotThrow(() => {
    result = tracker.summarizePhase(auditPath);
  });
  assert.strictEqual(result.idcCount, 0);
  assert.deepStrictEqual(result.stabilityPatterns, []);
  assert.strictEqual(result.avgRsa, 1.0, 'no RSA events -> default 1.0');
});

console.log('\nOld-code reproduction (proves the bug existed):');

test('the OLD unguarded map(JSON.parse) throws on the same content', () => {
  const lines = [goodEventA, malformedLine, goodEventB];
  // This mirrors the pre-fix line 21: const events = lines.map(l => JSON.parse(l));
  assert.throws(
    () => lines.map(l => JSON.parse(l)),
    SyntaxError,
    'unguarded JSON.parse over a malformed line must throw SyntaxError',
  );
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
