'use strict';
const assert = require('assert');
const crypto = require('crypto');
let passed = 0, failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('pinManifest computes and stores SHA-256 of manifest content', () => {
  const { pinManifest } = require('../bin/security/trust-boundaries');
  const manifest = { name: 'test-tool', version: '1.0', commands: ['do-thing'] };
  const pin = pinManifest(manifest);
  assert.ok(pin.hash.length === 64, 'SHA-256 hex is 64 chars');
  assert.strictEqual(pin.name, 'test-tool');
  assert.ok(pin.pinnedAt > 0, 'must have timestamp');
});

test('pinManifest produces deterministic hash regardless of key order', () => {
  const { pinManifest } = require('../bin/security/trust-boundaries');
  const m1 = { name: 'tool', version: '1.0', commands: ['a'] };
  const m2 = { commands: ['a'], name: 'tool', version: '1.0' };
  assert.strictEqual(pinManifest(m1).hash, pinManifest(m2).hash);
});

test('verifyManifest detects tampered manifest', () => {
  const { pinManifest, verifyManifest } = require('../bin/security/trust-boundaries');
  const manifest = { name: 'test-tool', version: '1.0', commands: ['do-thing'] };
  const pin = pinManifest(manifest);
  const tampered = { ...manifest, commands: ['do-evil'] };
  const result = verifyManifest(tampered, pin);
  assert.strictEqual(result.valid, false);
  assert.ok(result.reason.includes('hash mismatch'));
});

test('verifyManifest passes for unchanged manifest', () => {
  const { pinManifest, verifyManifest } = require('../bin/security/trust-boundaries');
  const manifest = { name: 'test-tool', version: '1.0', commands: ['do-thing'] };
  const pin = pinManifest(manifest);
  const result = verifyManifest(manifest, pin);
  assert.strictEqual(result.valid, true);
});

test('tagUntrusted wraps tool output with provenance metadata', () => {
  const { tagUntrusted } = require('../bin/security/trust-boundaries');
  const raw = 'Here is some tool output that could contain instructions';
  const tagged = tagUntrusted(raw, { source: 'mcp-tool', tool: 'web-fetch' });
  assert.strictEqual(tagged.provenance.source, 'mcp-tool');
  assert.strictEqual(tagged.provenance.tool, 'web-fetch');
  assert.ok(tagged.provenance.timestamp > 0);
  assert.strictEqual(tagged.content, raw);
  assert.strictEqual(tagged.trusted, false);
});

test('isHighImpact identifies destructive operations', () => {
  const { isHighImpact } = require('../bin/security/trust-boundaries');
  assert.strictEqual(isHighImpact('rm -rf /'), true);
  assert.strictEqual(isHighImpact('git push --force'), true);
  assert.strictEqual(isHighImpact('DROP TABLE users'), true);
  assert.strictEqual(isHighImpact('git reset --hard'), true);
  assert.strictEqual(isHighImpact('cat README.md'), false);
  assert.strictEqual(isHighImpact('ls -la'), false);
  // NOTE (UC-22 hardening): direct interpreter+script invocation like
  // `node index.js` is now treated as MEDIUM and flagged — a deliberate
  // false-positive tradeoff for the write-then-execute attack chain. Bare
  // interpreters and npm-driven runs stay allowed (no script-file argument).
  assert.strictEqual(isHighImpact('npm test'), false);
  assert.strictEqual(isHighImpact('node --version'), false);
});

test('isHighImpact catches case-insensitive patterns', () => {
  const { isHighImpact } = require('../bin/security/trust-boundaries');
  assert.strictEqual(isHighImpact('DROP table Users'), true);
  assert.strictEqual(isHighImpact('Git Push --Force'), true);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nTrust Boundaries: ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
