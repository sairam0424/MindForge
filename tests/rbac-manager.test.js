'use strict';

/**
 * MindForge Governance — RBAC manager tests (Wave 6).
 *
 * rbac-manager.js had ZERO test coverage despite being safety-critical authz
 * infrastructure (DID -> roles -> permissions, temporary elevations). The audit
 * flagged the gap; writing these tests surfaced a latent bug: getRolesByTier
 * called `new ztai()` (singleton, not a constructor) + a non-existent
 * getIdentity() and threw on every call. Fixed to read tier via ztai.getAgent
 * and fail safe. These tests lock the interface contract:
 *   - deny-by-default for unknown DIDs / permissions,
 *   - the static role->permission map,
 *   - temporary-elevation lifecycle (grant / expire / early-revoke),
 *   - tier-based elevation with fail-safe on unregistered DIDs.
 *
 * Each test uses a throwaway rolesPath in a temp dir so the real
 * .planning/AGENT-ROLES.json is never touched.
 */

const assert = require('node:assert');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RBACManager = require(path.join(ROOT, 'bin', 'governance', 'rbac-manager'));
const ztai = require(path.join(ROOT, 'bin', 'governance', 'ztai-manager'));

function mk() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-rbac-'));
  return { dir, rbac: new RBACManager({ rolesPath: path.join(dir, 'AGENT-ROLES.json') }) };
}

// ── default + explicit roles ─────────────────────────────────────────────────

test('getRoles returns persona-default roles for known persona DIDs', () => {
  const { dir, rbac } = mk();
  try {
    assert.deepStrictEqual(rbac.getRoles('did:mindforge:planner'), ['lead-architect', 'resource-optimizer']);
    assert.deepStrictEqual(rbac.getRoles('did:mindforge:reviewer'), ['security-auditor', 'compliance-checker']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('getRoles falls back to guest-agent for an unknown DID (deny-by-default)', () => {
  const { dir, rbac } = mk();
  try {
    assert.deepStrictEqual(rbac.getRoles('did:mindforge:totally-unknown'), ['guest-agent']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('assignRole then getRoles round-trips; revokeRoles clears', () => {
  const { dir, rbac } = mk();
  try {
    rbac.assignRole('did:x', ['developer']);
    assert.deepStrictEqual(rbac.getRoles('did:x'), ['developer']);
    rbac.assignRole('did:y', 'security-auditor'); // string coerced to array
    assert.deepStrictEqual(rbac.getRoles('did:y'), ['security-auditor']);
    rbac.revokeRoles('did:x');
    assert.deepStrictEqual(rbac.getRoles('did:x'), ['guest-agent'], 'revoked DID falls back to deny-by-default guest');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── permission mapping (deny-by-default) ─────────────────────────────────────

test('hasPermission grants only mapped permissions and denies everything else', () => {
  const { dir, rbac } = mk();
  try {
    rbac.assignRole('did:dev', ['developer']);
    assert.strictEqual(rbac.hasPermission('did:dev', 'write_src'), true);
    assert.strictEqual(rbac.hasPermission('did:dev', 'execute_tests'), true);
    assert.strictEqual(rbac.hasPermission('did:dev', 'modify_infrastructure'), false, 'developer must NOT get infra');
    // guest (unknown) gets only read_src
    assert.strictEqual(rbac.hasPermission('did:nobody', 'read_src'), true);
    assert.strictEqual(rbac.hasPermission('did:nobody', 'write_bin'), false);
    // unknown permission name is always denied
    assert.strictEqual(rbac.hasPermission('did:dev', 'launch_missiles'), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── temporary elevation lifecycle ────────────────────────────────────────────

test('elevateRole grants a permission temporarily; revokeElevation removes it', () => {
  const { dir, rbac } = mk();
  try {
    const did = 'did:guest-elevate';
    assert.strictEqual(rbac.hasPermission(did, 'modify_infrastructure'), false, 'baseline: no infra');
    rbac.elevateRole(did, 'system-operator', 60_000);
    assert.strictEqual(rbac.hasTemporaryElevation(did, 'system-operator'), true);
    assert.strictEqual(rbac.hasPermission(did, 'modify_infrastructure'), true, 'elevation grants infra perm');
    rbac.revokeElevation(did, 'system-operator');
    assert.strictEqual(rbac.hasTemporaryElevation(did, 'system-operator'), false);
    assert.strictEqual(rbac.hasPermission(did, 'modify_infrastructure'), false, 'revoked elevation removes perm');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('an EXPIRED elevation is treated as absent (fail-closed on TTL)', () => {
  const { dir, rbac } = mk();
  try {
    const did = 'did:expire';
    rbac.elevateRole(did, 'system-operator', -1); // already expired
    assert.strictEqual(rbac.hasTemporaryElevation(did, 'system-operator'), false,
      'a past-TTL elevation must not count');
    assert.strictEqual(rbac.hasPermission(did, 'modify_infrastructure'), false);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── tier-based resolution (the fixed getRolesByTier) ─────────────────────────

test('getRolesByTier fails SAFE for an unregistered DID (base roles only, no throw)', async () => {
  const { dir, rbac } = mk();
  try {
    const roles = await rbac.getRolesByTier('did:mindforge:unregistered');
    assert.deepStrictEqual(roles, ['guest-agent'], 'unknown tier -> no elevation');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('getRolesByTier elevates a registered Tier-3 agent to lead-architect', async () => {
  const { dir, rbac } = mk();
  let did;
  try {
    did = await ztai.registerAgent('rbac-tier3-test', 3);
    const roles = await rbac.getRolesByTier(did);
    assert.ok(roles.includes('lead-architect'), 'tier 3 must gain lead-architect');
  } finally {
    if (did) ztai.revokeAgent(did);
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

console.log('rbac-manager tests defined');
