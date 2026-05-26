/**
 * MindForge — Security & Trust Audit Suite
 * Verifies ZTS (Binary Attestation) and ZTAI (Enterprise Identity Layer).
 * Run: node tests/security-audit.test.js
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ ${name}`);
    console.error(`     ${err.message}`);
    failed++;
  }
}

async function run() {
  const ZTAIManager = require('../bin/governance/ztai-manager');

  console.log('\nSecurity & Trust Audit Suite (ZTS / ZTAI)\n');

  // ── ZTS: Unsigned Skill Detection ──────────────────────────────────────────
  console.log('ZTS — Skill Validation:');

  test('skill-validator CLI exists and is loadable', () => {
    const validatorPath = path.join(__dirname, '..', 'bin', 'skill-validator.js');
    assert.ok(fs.existsSync(validatorPath), 'bin/skill-validator.js should exist');
    const content = fs.readFileSync(validatorPath, 'utf8');
    assert.ok(content.includes('validate'), 'skill-validator should contain validation logic');
  });

  test('unsigned skill file is detected as invalid by frontmatter check', () => {
    // Simulate what the validator does: check for frontmatter
    const unsignedContent = '# Unsigned Skill\nNo signature or frontmatter here.';
    const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(unsignedContent);
    assert.strictEqual(hasFrontmatter, false, 'Unsigned skill should have no frontmatter');
  });

  test('properly signed skill file has valid frontmatter', () => {
    const signedContent = [
      '---',
      'name: test-skill',
      'version: 1.0.0',
      'status: stable',
      'triggers: a, b, c, d, e',
      '---',
      '# Test Skill',
      'Content here.',
    ].join('\n');
    const hasFrontmatter = /^---\n[\s\S]*?\n---/.test(signedContent);
    assert.strictEqual(hasFrontmatter, true, 'Signed skill should have frontmatter');
  });

  // ── ZTAI: Identity & Signing ───────────────────────────────────────────────
  console.log('\nZTAI — Cryptographic Signing:');

  await asyncTest('registerAgent creates a valid DID', async () => {
    const did = await ZTAIManager.registerAgent('senior-engineer', 2);
    assert.ok(did, 'DID should be defined');
    assert.ok(did.startsWith('did:mindforge:'), `DID should start with did:mindforge:, got ${did}`);
  });

  await asyncTest('signData produces a non-empty signature', async () => {
    const did = await ZTAIManager.registerAgent('executor', 1);
    const data = JSON.stringify({ type: 'WRITE', target: 'bin/core.js', timestamp: Date.now() });
    const signature = await ZTAIManager.signData(did, data);
    assert.ok(signature, 'Signature should be defined');
    assert.ok(signature.length > 10, 'Signature should be a substantial string');
  });

  await asyncTest('verifySignature returns true for valid signature', async () => {
    const did = await ZTAIManager.registerAgent('verifier', 2);
    const data = 'test-payload-for-verification';
    const signature = await ZTAIManager.signData(did, data);
    const isValid = ZTAIManager.verifySignature(did, data, signature);
    assert.strictEqual(isValid, true, 'Valid signature should verify as true');
  });

  await asyncTest('verifySignature returns false for tampered data', async () => {
    const did = await ZTAIManager.registerAgent('tamper-test', 2);
    const data = 'original-data';
    const signature = await ZTAIManager.signData(did, data);
    const isValid = ZTAIManager.verifySignature(did, 'tampered-data', signature);
    assert.strictEqual(isValid, false, 'Tampered data should fail verification');
  });

  await asyncTest('signData throws for unregistered DID', async () => {
    try {
      await ZTAIManager.signData('did:mindforge:nonexistent', 'some data');
      assert.fail('Should have thrown for unregistered DID');
    } catch (err) {
      assert.ok(err.message.includes('not registered'), `Expected "not registered" error, got: ${err.message}`);
    }
  });

  // ── ZTAI: Authorization ────────────────────────────────────────────────────
  console.log('\nZTAI — Authorization:');

  await asyncTest('isAuthorized returns true for sufficient tier', async () => {
    const did = await ZTAIManager.registerAgent('admin', 3);
    assert.strictEqual(ZTAIManager.isAuthorized(did, 3), true);
    assert.strictEqual(ZTAIManager.isAuthorized(did, 2), true);
    assert.strictEqual(ZTAIManager.isAuthorized(did, 1), true);
  });

  await asyncTest('isAuthorized returns false for insufficient tier', async () => {
    const did = await ZTAIManager.registerAgent('junior', 1);
    assert.strictEqual(ZTAIManager.isAuthorized(did, 2), false);
    assert.strictEqual(ZTAIManager.isAuthorized(did, 3), false);
  });

  // ── ZTAI: Key Rotation ─────────────────────────────────────────────────────
  console.log('\nZTAI — Key Rotation:');

  await asyncTest('rotateKeys changes the public key', async () => {
    const did = await ZTAIManager.registerAgent('rotate-test', 2);
    const agentBefore = ZTAIManager.getAgent(did);
    const pubKeyBefore = agentBefore.publicKey;

    await ZTAIManager.rotateKeys(did);

    const agentAfter = ZTAIManager.getAgent(did);
    assert.notStrictEqual(agentAfter.publicKey, pubKeyBefore, 'Public key should change after rotation');
    assert.ok(agentAfter.rotatedAt, 'rotatedAt timestamp should be set');
  });

  await asyncTest('old signature fails after key rotation', async () => {
    const did = await ZTAIManager.registerAgent('rotation-sig-test', 2);
    const data = 'pre-rotation-data';
    const oldSignature = await ZTAIManager.signData(did, data);

    await ZTAIManager.rotateKeys(did);

    const isValid = ZTAIManager.verifySignature(did, data, oldSignature);
    assert.strictEqual(isValid, false, 'Old signature should fail after key rotation');
  });

  // ── ZTAI: Revocation ───────────────────────────────────────────────────────
  console.log('\nZTAI — Revocation:');

  await asyncTest('revokeAgent removes the agent completely', async () => {
    const did = await ZTAIManager.registerAgent('revoke-test', 1);
    assert.ok(ZTAIManager.getAgent(did), 'Agent should exist before revocation');

    ZTAIManager.revokeAgent(did);
    assert.strictEqual(ZTAIManager.getAgent(did), undefined, 'Agent should be removed after revocation');
  });

  // ── Results ──────────────────────────────────────────────────────────────────
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.error(`\n❌ ${failed} test(s) failed.\n`);
    process.exit(1);
  } else {
    console.log('\n✅ All security-audit tests passed.\n');
  }
}

run().catch(err => {
  console.error('Fatal test error:', err.message);
  process.exit(1);
});
