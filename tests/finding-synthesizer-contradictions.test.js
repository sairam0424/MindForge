/**
 * MindForge — Finding Synthesizer Contradiction Detection Tests (UC-22)
 * Audit finding #27: contradictions field was hardcoded to [] (stub capability).
 * Run: node tests/finding-synthesizer-contradictions.test.js
 *
 * A contradiction = two reviews flag the SAME location with a large severity
 * gap (>= 2 levels on the LOW=0/MEDIUM=1/HIGH=2/CRITICAL=3 scale).
 */
'use strict';

const assert = require('assert');
const { synthesizeFindings } = require('../bin/review/finding-synthesizer');

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

console.log('\nMindForge — Finding Synthesizer Contradictions (UC-22)\n');

test('detects a contradiction when two reviews flag same location CRITICAL vs LOW', () => {
  const reviewA = {
    model: 'claude-3-5-sonnet',
    content: '**[CRITICAL]** `auth/session.js:42` — Token never expires; account takeover.'
  };
  const reviewB = {
    model: 'gpt-4o',
    content: '**[LOW]** `auth/session.js:42` — Minor style nit on token handling.'
  };

  const result = synthesizeFindings([reviewA, reviewB]);

  assert.ok(Array.isArray(result.contradictions), 'contradictions must be an array');
  assert.ok(
    result.contradictions.length >= 1,
    `expected >= 1 contradiction, got ${result.contradictions.length}`
  );

  const entry = result.contradictions[0];
  assert.ok(
    entry.location && entry.location.includes('auth/session.js'),
    `contradiction must name the disputed location, got: ${JSON.stringify(entry.location)}`
  );
  assert.ok(Array.isArray(entry.severities), 'entry must list severities');
  assert.ok(
    entry.severities.includes('CRITICAL') && entry.severities.includes('LOW'),
    `severities must capture both ends, got: ${JSON.stringify(entry.severities)}`
  );
  assert.ok(Array.isArray(entry.models), 'entry must list models');
  assert.strictEqual(entry.models.length, 2, 'both disagreeing models must be recorded');
  assert.ok(typeof entry.description === 'string' && entry.description.length > 0,
    'entry must carry a human-readable description');
});

test('no contradiction when two reviews agree on severity at same location', () => {
  const reviewA = {
    model: 'claude-3-5-sonnet',
    content: '**[HIGH]** `index.js:10` — Unbounded loop on retry.'
  };
  const reviewB = {
    model: 'gpt-4o',
    content: '**[HIGH]** `index.js:10` — Retry loop has no ceiling.'
  };

  const result = synthesizeFindings([reviewA, reviewB]);

  assert.strictEqual(
    result.contradictions.length,
    0,
    `agreement must not register a contradiction, got ${result.contradictions.length}`
  );
});

test('contradiction detection does not break consensus/model_specific shape', () => {
  const reviewA = {
    model: 'claude-3-5-sonnet',
    content: '**[CRITICAL]** `db/query.js:5` — SQL injection.'
  };
  const reviewB = {
    model: 'gpt-4o',
    content: '**[LOW]** `db/query.js:5` — Cosmetic concern only.'
  };

  const result = synthesizeFindings([reviewA, reviewB]);

  assert.ok(Array.isArray(result.consensus), 'consensus must remain an array');
  assert.strictEqual(result.consensus.length, 1, 'same location should still form one consensus group');
  assert.ok(result.model_specific['claude-3-5-sonnet'], 'model_specific must retain per-model findings');
  assert.strictEqual(result.total_findings, 2, 'total_findings must still count every finding');
});

console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);

if (failed > 0) {
  console.error(`\n❌ ${failed} test(s) failed.\n`);
  process.exit(1);
} else {
  console.log('\n✅ All contradiction-detection tests passed.\n');
}
