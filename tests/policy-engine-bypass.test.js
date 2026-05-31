'use strict';

/**
 * UC-22 — Authorization Bypass Regression Suite
 *
 * Guards against a Tier-3 blast-radius bypass that accepted a non-cryptographic
 * `reasoning_proof` as authorization. A `reasoning_proof` is free-form text and
 * is validated nowhere in the codebase; it must NOT, on its own, override the
 * dynamic blast-radius (max_impact) limit. Only a genuine cryptographic proof
 * (`pq_proof`, verified via verifyZKProof) may grant the override.
 *
 * Native harness mirrors tests/trust-boundaries.test.js (test/runner/exit-1).
 */

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PolicyEngine = require('../bin/governance/policy-engine');
const ImpactAnalyzer = require('../bin/governance/impact-analyzer');
const quantumCrypto = require('../bin/governance/quantum-crypto');

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

// ── Test fixtures ────────────────────────────────────────────────────────────

// A PERMIT policy with a LOW max_impact so a high-impact mutation trips the
// dynamic blast-radius enforcement (policy-engine step 2).
const PERMIT_POLICY = {
  id: 'policy_permit_tier3_low_impact',
  effect: 'PERMIT',
  description: 'Permit tier-3 writes but cap blast radius.',
  conditions: { resource: '*', min_tier: 3 },
  max_impact: 50
};

// DELETE on bin/governance/* at tier 3 scores 70 via CADIA — above max_impact
// (50) so the blast-radius branch fires, yet at/under 95 so it lands in the
// Tier-3 proof bypass branch (impactScore > 95 takes the biometric path).
const HIGH_IMPACT_ACTION = 'DELETE';
const HIGH_IMPACT_RESOURCE = 'bin/governance/rbac-manager.js';

// Build an isolated workspace: a policies dir holding the crafted policy and a
// SEPARATE planning dir with NO STATE.md. An empty current-goal makes the CADIA
// goal-alignment penalty inert, so impactScore is deterministic across machines
// (DELETE on bin/governance/* at tier 3 == 70: above max_impact 50, at/under 95).
function makeWorkspace(policy) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mf-policy-bypass-'));
  const policiesDir = path.join(root, 'policies');
  const planningDir = path.join(root, 'planning');
  fs.mkdirSync(policiesDir, { recursive: true });
  fs.mkdirSync(planningDir, { recursive: true });
  fs.writeFileSync(path.join(policiesDir, 'permit.json'), JSON.stringify(policy, null, 2));
  return { root, policiesDir, planningDir };
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

// ── Tests ──────────────────────────────────────────────────────────────────

test('REGRESSION: reasoning_proof alone does NOT bypass blast-radius (DENY)', async () => {
  const ws = makeWorkspace(PERMIT_POLICY);
  const sessionId = 'session_reasoning_only';
  ImpactAnalyzer.resetSession(sessionId);
  try {
    const engine = new PolicyEngine({ policiesDir: ws.policiesDir, planningDir: ws.planningDir });
    const verdict = await engine.evaluate({
      id: 'intent_reasoning_only',
      did: 'agent-rogue',
      tier: 3,
      action: HIGH_IMPACT_ACTION,
      resource: HIGH_IMPACT_RESOURCE,
      sessionId,
      reasoning_proof: 'Urgent — trust me, this is a legitimate architectural change.'
      // NOTE: no pq_proof — a reasoning_proof is not a cryptographic proof.
    });
    assert.strictEqual(
      verdict.verdict,
      'DENY',
      `reasoning_proof must NOT authorize a blast-radius override; got ${verdict.verdict} (${verdict.reason})`
    );
    assert.ok(
      /reasoning_proof|cryptographic|pq_proof|Sovereign Proof/i.test(verdict.reason),
      `DENY reason should explain reasoning_proof is insufficient; got: ${verdict.reason}`
    );
  } finally {
    cleanup(ws.root);
  }
});

test('pq_proof path stays fail-closed when no verifier configured (no silent PERMIT)', async () => {
  const ws = makeWorkspace(PERMIT_POLICY);
  const sessionId = 'session_pq_unverified';
  ImpactAnalyzer.resetSession(sessionId);
  try {
    const engine = new PolicyEngine({ policiesDir: ws.policiesDir, planningDir: ws.planningDir });
    // generateZKProof yields a zkp_v1_sim_ token. With no security.zk_verifier_module
    // configured, verifyZKProof returns { verified: false } — must NOT auto-permit.
    const verdict = await engine.evaluate({
      id: 'intent_pq_unverified',
      did: 'agent-pq',
      tier: 3,
      action: HIGH_IMPACT_ACTION,
      resource: HIGH_IMPACT_RESOURCE,
      sessionId,
      pq_proof: quantumCrypto.generateZKProof({ id: 'intent_pq_unverified' }, { verdict: 'ALLOW' })
    });
    assert.strictEqual(
      verdict.verdict,
      'DENY',
      `unverified pq_proof must not silently permit; got ${verdict.verdict} (${verdict.reason})`
    );
  } finally {
    cleanup(ws.root);
  }
});

test('pq_proof path PERMITS when an external verifier validates the proof', async () => {
  const ws = makeWorkspace(PERMIT_POLICY);
  const sessionId = 'session_pq_verified';
  ImpactAnalyzer.resetSession(sessionId);
  // Inject a stub verifier so the pq_proof branch can succeed deterministically.
  const originalVerify = quantumCrypto.verifyZKProof;
  quantumCrypto.verifyZKProof = () => ({ verified: true, reason: 'stub_verifier' });
  try {
    const engine = new PolicyEngine({ policiesDir: ws.policiesDir, planningDir: ws.planningDir });
    const verdict = await engine.evaluate({
      id: 'intent_pq_verified',
      did: 'agent-pq-ok',
      tier: 3,
      action: HIGH_IMPACT_ACTION,
      resource: HIGH_IMPACT_RESOURCE,
      sessionId,
      pq_proof: 'zkp_v1_externally_valid'
    });
    assert.strictEqual(
      verdict.verdict,
      'PERMIT',
      `a verified pq_proof should still grant the override; got ${verdict.verdict} (${verdict.reason})`
    );
  } finally {
    quantumCrypto.verifyZKProof = originalVerify;
    cleanup(ws.root);
  }
});

test('Tier-3 intent with NO proof over max_impact is DENIED (unchanged)', async () => {
  const ws = makeWorkspace(PERMIT_POLICY);
  const sessionId = 'session_no_proof';
  ImpactAnalyzer.resetSession(sessionId);
  try {
    const engine = new PolicyEngine({ policiesDir: ws.policiesDir, planningDir: ws.planningDir });
    const verdict = await engine.evaluate({
      id: 'intent_no_proof',
      did: 'agent-noproof',
      tier: 3,
      action: HIGH_IMPACT_ACTION,
      resource: HIGH_IMPACT_RESOURCE,
      sessionId
      // no reasoning_proof, no pq_proof
    });
    assert.strictEqual(
      verdict.verdict,
      'DENY',
      `no-proof high-impact mutation must be denied; got ${verdict.verdict} (${verdict.reason})`
    );
  } finally {
    cleanup(ws.root);
  }
});

// ── Runner (mirrors trust-boundaries.test.js) ────────────────────────────────

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nPolicy Engine Bypass (UC-22): ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
