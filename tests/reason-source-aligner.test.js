'use strict';
/**
 * MindForge — Reason-Source Aligner shape & similarity tests (UC-22)
 *
 * Regression anchor for audit finding #19 (silent gate-disable):
 *   - checkAlignment() MUST return a consistent shape in BOTH branches
 *     ({ is_aligned, best_match_id, confidence, ...status }).
 *   - The uninitialized branch previously returned { score, reason },
 *     a DISJOINT shape, so the caller's `if (alignment.is_aligned)` read
 *     `undefined` and silently skipped the mission-fidelity gate.
 *   - _calculateSimilarity must be honest Jaccard (uses the union set).
 *
 * The module exports a singleton instance, so each test constructs a fresh
 * instance via the singleton's constructor to avoid shared-state bleed.
 */
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const alignerSingleton = require('../bin/engine/reason-source-aligner');
const Aligner = alignerSingleton.constructor;

let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Uninitialized shape (regression anchor) ──────────────────────────────────

test('uninitialized checkAlignment returns the consistent is_aligned shape (not {score,reason})', () => {
  const aligner = new Aligner('.planning/__nonexistent_requirements__.md');
  // init() bails out early when REQUIREMENTS.md is missing, leaving the
  // aligner uninitialized — a real runtime state.
  const result = aligner.checkAlignment('any thought');

  assert.ok('is_aligned' in result, 'result must carry an is_aligned key');
  assert.strictEqual(typeof result.is_aligned, 'boolean', 'is_aligned must be boolean');
  assert.strictEqual(result.is_aligned, false, 'uninitialized cannot assert alignment → false');
  assert.strictEqual(result.confidence, 0, 'uninitialized confidence must be 0');
  assert.ok('best_match_id' in result, 'result must carry best_match_id');
  assert.strictEqual(result.best_match_id, null, 'uninitialized has no match');
  assert.strictEqual(result.status, 'uninitialized', 'status must explicitly flag uninitialized');

  // The OLD disjoint shape must be gone.
  assert.ok(!('score' in result), 'must not leak the old {score} shape');
  assert.ok(!('reason' in result), 'must not leak the old {reason} shape');
});

test('uninitialized result drives the caller safely (no truthy is_aligned)', () => {
  const aligner = new Aligner('.planning/__nonexistent_requirements__.md');
  const result = aligner.checkAlignment('any thought');
  // Mirror auto-runner.js checkMissionFidelity(): it only acts when
  // is_aligned is truthy. With false, the correction block is correctly skipped
  // for the HONEST reason ("cannot assess"), not via a silent shape mismatch.
  let correctionInjected = false;
  if (result.is_aligned) {
    if (result.confidence < 0.5) correctionInjected = true;
  }
  assert.strictEqual(correctionInjected, false, 'uninitialized must not inject a false correction');
});

// ── Initialized: real similarity behavior ────────────────────────────────────

function withTempRequirements(body, run) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rsa-'));
  const file = path.join(dir, 'REQUIREMENTS.md');
  fs.writeFileSync(file, body, 'utf8');
  try {
    return run(file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('initialized aligner scores a keyword-matching thought higher than an unrelated one', async () => {
  const reqMd = [
    '## [REQ-AUTH] Authentication',
    '',
    'Implement secure password authentication login session management.',
    '',
    '## [REQ-UI] Dashboard',
    '',
    'Render analytics charts widgets layout responsive design.',
    '',
  ].join('\n');

  await withTempRequirements(reqMd, async (file) => {
    const aligner = new Aligner(file);
    await aligner.init();
    assert.strictEqual(aligner.initialized, true, 'aligner should initialize from temp requirements');

    const matching = aligner.checkAlignment('Implement secure password authentication login session management properly.');
    const unrelated = aligner.checkAlignment('Bake delicious chocolate cookies inside grandmother kitchen.');

    assert.ok(matching.confidence > unrelated.confidence,
      `matching thought (${matching.confidence}) should outscore unrelated (${unrelated.confidence})`);
    assert.strictEqual(matching.is_aligned, true, 'strongly overlapping thought must be aligned');
    assert.strictEqual(matching.best_match_id, 'REQ-AUTH', 'best match must be the auth requirement');
    // Consistent shape on the initialized branch too.
    assert.ok('is_aligned' in matching && 'best_match_id' in matching && 'confidence' in matching);
  });
});

test('_calculateSimilarity is honest Jaccard (intersection / union)', () => {
  const aligner = new Aligner('.planning/__nonexistent_requirements__.md');
  // Tokens are lowercased, punctuation-stripped, length > 3.
  // A = {alpha, bravo, charlie}; B = {alpha, bravo, delta}
  //   intersection = {alpha, bravo} = 2
  //   union        = {alpha, bravo, charlie, delta} = 4
  //   Jaccard      = 2 / 4 = 0.5
  const sim = aligner._calculateSimilarity('alpha bravo charlie', 'alpha bravo delta');
  assert.strictEqual(sim, 0.5, 'Jaccard of the known overlap must be 0.5');

  // Disjoint sets → 0.
  assert.strictEqual(aligner._calculateSimilarity('alpha bravo', 'charlie delta'), 0);
  // Empty side → 0.
  assert.strictEqual(aligner._calculateSimilarity('', 'alpha bravo'), 0);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nReason-Source Aligner: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
