'use strict';
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn){ tests.push({name,fn}); }

test('isTimedOut returns true when now exceeds timeout_at', () => {
  const { isTimedOut } = require('../bin/autonomous/auto-runner');
  assert.strictEqual(isTimedOut('2020-01-01T00:00:00Z', Date.parse('2026-01-01T00:00:00Z')), true);
  assert.strictEqual(isTimedOut('2099-01-01T00:00:00Z', Date.parse('2026-01-01T00:00:00Z')), false);
  assert.strictEqual(isTimedOut(null, Date.parse('2026-01-01T00:00:00Z')), false);
  assert.strictEqual(isTimedOut(undefined, Date.parse('2026-01-01T00:00:00Z')), false);
});

(async () => {
  for (const {name,fn} of tests){ try{ await fn(); console.log(`  ✅  ${name}`); passed++; }catch(e){ console.error(`  ❌  ${name}\n      ${e.message}`); failed++; } }
  console.log(`\nWave Timeout/Rollback: ${passed} passed, ${failed} failed`);
  if (failed>0) process.exit(1);
})();
