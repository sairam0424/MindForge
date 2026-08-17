/**
 * MindForge — Security & Trust Audit Suite
 * Verifies ZTS (Binary Attestation) and ZTAI (Enterprise Identity Layer).
 * Run: node tests/security-audit.test.js
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawnSync } = require('child_process');

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

  // These three cases replace assertions that could not fail.
  //
  //   1. "skill-validator CLI exists and is loadable" asserted existsSync() plus
  //      content.includes('validate') — a substring a COMMENT satisfies — and never require()d or
  //      ran the module, so "loadable" was never established.
  //   2 & 3. Both defined a frontmatter regex AND a subject string INSIDE the test body and
  //      asserted the regex's result. Their own comment said "Simulate what the validator does".
  //      A test that re-implements its subject can only restate itself.
  //
  // MEASURED: with bin/skill-validator.js (211 lines) replaced by a single 65-byte comment in a
  // scratch copy of the repo, all three passed and the file reported 13/13, exit 0. The validator
  // is LIVE — bin/mindforge-cli.js:58 exposes it as `mindforge-cc validate-skill` — and no other
  // file in tests/ referenced it, so a supply-chain validator behind a shipped command had zero
  // behavioural coverage.
  //
  // It has no module.exports and no require.main guard: it is a pure CLI that process.exit()s. So
  // these SPAWN it, which is also exactly how users reach it.

  const VALIDATOR = path.join(__dirname, '..', 'bin', 'skill-validator.js');

  /** Run the validator in a scratch cwd. Exit status from .status, never through a pipe. */
  function runValidator(args, cwd) {
    const r = spawnSync(process.execPath, [VALIDATOR, ...args], {
      cwd, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: process.env.HOME },
    });
    return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
  }

  function withSkills(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-skillval-'));
    try {
      // A real engine skill from this repo — the shape the validator is built for.
      const source = fs.readdirSync(path.join(__dirname, '..', '.mindforge', 'skills'))
        .map((d) => path.join(__dirname, '..', '.mindforge', 'skills', d, 'SKILL.md'))
        .find((f) => fs.existsSync(f));
      assert.ok(source, 'fixture precondition: the repo must contain at least one engine SKILL.md');
      fs.copyFileSync(source, path.join(dir, 'good-SKILL.md'));
      fs.writeFileSync(path.join(dir, 'bad-SKILL.md'), '# Unsigned Skill\nNo signature or frontmatter here.\n');
      return fn(dir);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }

  test('validator ACCEPTS a well-formed skill (exit 0, Result: VALID)', () => {
    withSkills((dir) => {
      const r = runValidator(['good-SKILL.md', '--no-color'], dir);
      assert.strictEqual(r.status, 0, `a real engine skill must validate. Output:\n${r.out.slice(0, 500)}`);
      assert.match(r.out, /Result: VALID/, 'and say so');
    });
  });

  test('validator REJECTS a skill with no frontmatter (exit 1, Result: INVALID)', () => {
    // The negative control the old test only simulated. Without this, "accepts a good skill" would
    // be satisfied by a validator that accepts everything.
    withSkills((dir) => {
      const r = runValidator(['bad-SKILL.md', '--no-color'], dir);
      assert.strictEqual(r.status, 1, `a skill with no frontmatter must be rejected. Output:\n${r.out.slice(0, 500)}`);
      assert.match(r.out, /Result: INVALID/, 'and say so');
    });
  });

  test('validator exits 1 on a missing file, and 0 on no arguments', () => {
    // Distinct contracts worth pinning: a missing target is an error, while no target is a usage
    // request. Conflating them would make the tool either unhelpful or unfailable.
    withSkills((dir) => {
      assert.strictEqual(runValidator(['definitely-absent.md', '--no-color'], dir).status, 1,
        'a missing file must be an error');
      const usage = runValidator([], dir);
      assert.strictEqual(usage.status, 0, 'no arguments must print usage and succeed');
      assert.match(usage.out, /Usage:/, 'and actually print usage');
    });
  });

  test('the target is the first NON-FLAG argument, in either order', () => {
    // `const target = ARGS[0]` took a leading flag as the filename: measured,
    // `validate-skill --no-color <path>` reported "File not found: <cwd>/--no-color" and exited 1.
    // Flags-before-operands is the ordering most people reach for.
    withSkills((dir) => {
      assert.strictEqual(runValidator(['good-SKILL.md', '--no-color'], dir).status, 0,
        'file then flag must work');
      assert.strictEqual(runValidator(['--no-color', 'good-SKILL.md'], dir).status, 0,
        'flag then file must ALSO work — a leading flag must not be eaten as the target');
    });
  });

  test('the validator is reachable as a shipped command, so this coverage matters', () => {
    // The reason the vacuous version was worth replacing rather than deleting: this is not dead
    // code. If the CLI stops exposing it, revisit whether these cases still earn their runtime.
    const cli = fs.readFileSync(path.join(__dirname, '..', 'bin', 'mindforge-cli.js'), 'utf8');
    assert.match(cli, /script:\s*'bin\/skill-validator\.js'/,
      'bin/mindforge-cli.js must still route a command to bin/skill-validator.js');
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
