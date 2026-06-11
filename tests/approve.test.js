'use strict';

/**
 * MindForge Governance — approval gate fail-closed tests (Wave 6).
 *
 * Regression anchor: verifyApproverIdentity() used to return
 *     { verified: false, method: 'git_identity', ... }   // and write anyway
 * when no GPG key was configured — and NO consumer ever checked .verified, so a
 * Tier 3 approval was minted on spoofable git identity. The CI gate
 * (control-plane.yml) only counts approval files, so the cosmetic flag never
 * mattered. Fix: fail CLOSED — throw (no record written) unless the operator
 * explicitly opts into an unverified approval via MINDFORGE_ALLOW_UNVERIFIED_APPROVAL=1.
 *
 * These tests drive verifyApproverIdentity directly (controlling the GPG-key
 * lookup + the opt-in env) and the approve() write path into a temp dir.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const approveModule = require(path.join(ROOT, 'bin', 'governance', 'approve'));

// Helper: run a thunk with a temporarily-set env var, restored after.
function withEnv(key, value, fn) {
  const had = Object.prototype.hasOwnProperty.call(process.env, key);
  const prev = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
  try { return fn(); }
  finally {
    if (had) process.env[key] = prev;
    else delete process.env[key];
  }
}

// Determine whether THIS environment has a GPG signing key — the no-GPG tests
// only make sense when one is absent. (CI runners have none.)
const hasGpgKey = !!approveModule.getGPGSigningKey();

// ── verifyApproverIdentity: fail-closed without GPG ──────────────────────────

test('verifyApproverIdentity THROWS when no GPG key and no opt-in (fail-closed)', { skip: hasGpgKey }, () => {
  withEnv('MINDFORGE_ALLOW_UNVERIFIED_APPROVAL', undefined, () => {
    assert.throws(() => approveModule.verifyApproverIdentity('alice'),
      /GPG signing key|Tier 3 approval requires a verifiable identity/,
      'no GPG + no opt-in must refuse to attribute identity');
  });
});

test('verifyApproverIdentity returns verified:false ONLY with explicit opt-in', { skip: hasGpgKey }, () => {
  withEnv('MINDFORGE_ALLOW_UNVERIFIED_APPROVAL', '1', () => {
    const r = approveModule.verifyApproverIdentity('alice');
    assert.strictEqual(r.verified, false, 'unverified mode must be honestly marked verified:false');
    assert.strictEqual(r.method, 'git_identity_unverified');
  });
});

test('verifyApproverIdentity reports verified:true when a GPG key IS configured', { skip: !hasGpgKey }, () => {
  const r = approveModule.verifyApproverIdentity('alice');
  assert.strictEqual(r.verified, true);
  assert.strictEqual(r.method, 'gpg_key');
  assert.ok(r.keyId, 'a verified result carries the signing keyId');
});

// ── approve(): the record is NOT written on fail-closed ──────────────────────

test('approve() writes NO approval file when identity is unverifiable (no opt-in)', { skip: hasGpgKey }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-approve-'));
  try {
    withEnv('MINDFORGE_ALLOW_UNVERIFIED_APPROVAL', undefined, () => {
      assert.throws(() => approveModule.approve({ reason: 'test', approvalsDir: dir }),
        /GPG signing key|verifiable identity/);
    });
    // The directory must contain NO approval record — fail-closed means nothing persisted.
    const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => f.startsWith('approval-')) : [];
    assert.deepStrictEqual(files, [], 'a refused approval must not write a record');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('approve() writes an HONESTLY-marked unverified record under explicit opt-in', { skip: hasGpgKey }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-approve-'));
  try {
    const res = withEnv('MINDFORGE_ALLOW_UNVERIFIED_APPROVAL', '1',
      () => approveModule.approve({ reason: 'opt-in test', approvalsDir: dir }));
    const written = JSON.parse(fs.readFileSync(res.filePath, 'utf8'));
    assert.strictEqual(written.identity_verification.verified, false,
      'opt-in record must be marked verified:false, not silently "approved"');
    assert.strictEqual(written.tier, 3);
    assert.ok(written.signature.startsWith('sha256:'));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('approve() under GPG produces a verified record', { skip: !hasGpgKey }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-approve-'));
  try {
    const res = approveModule.approve({ reason: 'gpg test', approvalsDir: dir });
    const written = JSON.parse(fs.readFileSync(res.filePath, 'utf8'));
    assert.strictEqual(written.identity_verification.verified, true);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

console.log('approve fail-closed tests defined');
