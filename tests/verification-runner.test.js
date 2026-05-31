'use strict';
const assert = require('assert');
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('runVerification returns structured result with all stages', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests', 'lint', 'audit'] });
  assert.ok(result.stages, 'must have stages array');
  assert.ok(result.stages.length >= 3, 'at least 3 stages');
  for (const s of result.stages) {
    assert.ok(['pass', 'fail', 'skip'].includes(s.status), `stage ${s.name} has valid status`);
    assert.ok(typeof s.durationMs === 'number');
  }
});

test('runVerification produces summary with pass/fail/skip counts', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests'] });
  assert.ok(typeof result.summary.passed === 'number');
  assert.ok(typeof result.summary.failed === 'number');
  assert.ok(typeof result.summary.totalDurationMs === 'number');
});

test('runVerification skips unavailable stages gracefully', async () => {
  const { runVerification } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests', 'typecheck'] });
  const tc = result.stages.find(s => s.name === 'typecheck');
  assert.strictEqual(tc.status, 'skip', 'typecheck should skip when no tsconfig');
});

test('formatReport produces markdown with heading and stage info', async () => {
  const { runVerification, formatReport } = require('../bin/engine/verification-runner');
  const result = await runVerification({ cwd: process.cwd(), stages: ['tests'] });
  const md = formatReport(result);
  assert.ok(md.includes('# Verification Report'), 'must have heading');
  assert.ok(md.includes('tests'), 'must mention test stage');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nVerification Runner: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
