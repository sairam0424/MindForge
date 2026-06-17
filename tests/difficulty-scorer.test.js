'use strict';
const assert = require('assert');
let passed = 0, failed = 0; const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('score returns 1-10 for a task description', () => {
  const { score } = require('../bin/models/difficulty-scorer');
  const s = score({ description: 'fix a typo in README', files: ['README.md'] });
  assert.ok(s >= 1 && s <= 10, `score ${s} must be in [1,10]`);
  assert.ok(s <= 3, 'a simple typo fix should score low');
});

test('auth/crypto/security keywords push score high', () => {
  const { score } = require('../bin/models/difficulty-scorer');
  const s = score({ description: 'implement JWT authentication flow', files: ['src/auth/login.ts'] });
  assert.ok(s >= 7, `security task should score high, got ${s}`);
});

test('many files push score higher', () => {
  const { score } = require('../bin/models/difficulty-scorer');
  const s1 = score({ description: 'update config', files: ['a.js'] });
  const s2 = score({ description: 'update config', files: Array.from({length: 20}, (_, i) => `f${i}.js`) });
  assert.ok(s2 > s1, 'more files = higher difficulty');
});

test('Tier-3 floor: score never below 7 for tier >= 3', () => {
  const { score } = require('../bin/models/difficulty-scorer');
  const s = score({ description: 'update payment gateway', files: ['src/payments/stripe.ts'], tier: 3 });
  assert.ok(s >= 7, `Tier-3 must floor at 7, got ${s}`);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log(`  ✅  ${name}`); passed++; }
    catch (e) { console.error(`  ❌  ${name}\n      ${e.message}`); failed++; }
  }
  console.log(`\nDifficulty Scorer: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
})();
