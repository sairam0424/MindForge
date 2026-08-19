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

// ── PQAS biometric-bypass path (impactScore > 95) ────────────────────────────
//
// The UC-22 cases above cover the Tier-3 pq_proof branch, which was already fail-closed. The
// branch ABOVE it — for impact > 95, i.e. HIGHER risk — had no coverage and three defects:
//
//   1. policy-gate-hardened read `governance.critical_drift_threshold` as an impact threshold. That
//      key is a drift RATIO: bin/engine/logic-drift-detector.js reads it with default 0.50 and the
//      shipped config sets 0.5. One key, two incompatible scales — the gate silently received 0.5
//      where it expected ~95.
//   2. policy-engine generated `requestId` as a LOCAL and passed the bare intent, while the gate
//      looks up the attestation by `intent.requestId`. Measured: orbital-guardian returned
//      {verified:false, reason:"missing requestId"}, so the attestation path could never approve —
//      even straight after a successful recordBypass().
//   3. On ANY non-WAIT gate status, policy-engine logged "Biometric signature verified" and
//      recorded "Authorized via Biometric Bypass [WEB-AUTHN-DEX]". One of the two non-WAIT returns
//      is ALLOWED / "Impact within standard threshold", which states that NO attestation was
//      required — so the audit trail asserted a biometric verification that never happened.

const policyGate = require('../bin/governance/policy-gate-hardened');
const configManager = require('../bin/governance/config-manager');

/** Run `fn` with configManager.get stubbed, restoring afterwards. */
function withConfig(overrides, fn) {
  const original = configManager.get;
  configManager.get = (key, fallback) =>
    Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : original.call(configManager, key, fallback);
  const warns = [];
  const origWarn = console.warn;
  console.warn = (...a) => warns.push(a.join(' '));
  try { return fn(warns); }
  finally { configManager.get = original; console.warn = origWarn; }
}

test('impact threshold REJECTS a drift ratio and says so', () => {
  // The exact shipped misconfiguration: 0.5 arriving where a 0-100 score belongs.
  withConfig({ 'governance.critical_impact_threshold': 0.5 }, (warns) => {
    const v = policyGate.resolveImpactThreshold();
    assert.strictEqual(v, 95, `a ratio must not be accepted as a score, got ${v}`);
    assert.ok(warns.some((w) => /not an impact score|0-100/.test(w)),
      'the rejection must be loud — a mis-scaled threshold changes whether attestation is demanded ' +
      `at all. Warnings: ${JSON.stringify(warns)}`);
  });
});

test('impact threshold ACCEPTS a legitimate 0-100 score', () => {
  // The guard against over-correcting into "always use the fallback", which would make the config
  // key decorative.
  withConfig({ 'governance.critical_impact_threshold': 90 }, () => {
    assert.strictEqual(policyGate.resolveImpactThreshold(), 90);
  });
  withConfig({ 'governance.critical_impact_threshold': 100 }, () => {
    assert.strictEqual(policyGate.resolveImpactThreshold(), 100);
  });
});

test('the impact threshold no longer reads the DRIFT key', () => {
  // Setting only the drift key must not move the impact threshold. This is the assertion that
  // keeps the two scales separated.
  withConfig({ 'governance.critical_drift_threshold': 42 }, () => {
    assert.strictEqual(policyGate.resolveImpactThreshold(), 95,
      'the drift ratio key must have no influence on the impact threshold');
  });
});

test('the drift detector still owns the drift key, with its ratio default', () => {
  // The other half of the split: separating the keys must not break the module that was correct.
  const src = fs.readFileSync(path.join(__dirname, '..', 'bin', 'engine', 'logic-drift-detector.js'), 'utf8');
  assert.match(src, /critical_drift_threshold['"]\s*,\s*0\.\d+/,
    'logic-drift-detector must keep reading critical_drift_threshold with a RATIO default');
  const gateSrc = fs.readFileSync(path.join(__dirname, '..', 'bin', 'governance', 'policy-gate-hardened.js'), 'utf8');
  const gateCode = gateSrc.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
  assert.ok(!/critical_drift_threshold/.test(gateCode),
    'the policy gate code must not reference the drift key at all');
});

/** Drive PolicyEngine.evaluate with a forced impact score and a stubbed gate result. */
async function evaluateWithForcedImpact(impact, gateResult, captured = {}) {
  const ws = makeWorkspace(PERMIT_POLICY);
  const origAnalyze = ImpactAnalyzer.analyze;
  const origEvaluate = policyGate.evaluateBypass;
  try {
    ImpactAnalyzer.analyze = () => impact;
    policyGate.evaluateBypass = async (intentArg, score) => {
      captured.intent = intentArg;
      captured.score = score;
      return gateResult;
    };
    const engine = new PolicyEngine({ policiesDir: ws.policiesDir, planningDir: ws.planningDir });
    const intent = { id: 'i-pqas', action: HIGH_IMPACT_ACTION, resource: HIGH_IMPACT_RESOURCE, did: 'did:test', tier: 3 };
    captured.originalIntent = intent;
    const verdict = await engine.evaluate(intent);
    return verdict;
  } finally {
    ImpactAnalyzer.analyze = origAnalyze;
    policyGate.evaluateBypass = origEvaluate;
    cleanup(ws.root);
  }
}

test('policy-engine passes a requestId the gate can look an attestation up by', async () => {
  const captured = {};
  await evaluateWithForcedImpact(99, { status: 'WAIT_FOR_ORBITAL', reason: 'needs attestation' }, captured);
  assert.ok(captured.intent, 'the gate must have been called for impact 99');
  assert.ok(captured.intent.requestId,
    'the object handed to evaluateBypass must carry requestId — without it orbital-guardian ' +
    'returns {verified:false, reason:"missing requestId"} and no attestation can EVER be found');
  assert.match(String(captured.intent.requestId), /^pol_/, 'and it must be the engine\'s own request id');
});

test('policy-engine does not mutate the caller\'s intent', async () => {
  const captured = {};
  await evaluateWithForcedImpact(99, { status: 'WAIT_FOR_ORBITAL', reason: 'x' }, captured);
  assert.strictEqual(captured.originalIntent.requestId, undefined,
    'the caller\'s object must be left alone — the gate gets a copy');
  assert.notStrictEqual(captured.intent, captured.originalIntent, 'a new object must be passed');
});

test('a PERMIT with no attestation does NOT claim one', async () => {
  // The ALLOWED / "Impact within standard threshold" case: the gate explicitly says no attestation
  // was required, so the audit trail must not say one was verified.
  const v = await evaluateWithForcedImpact(99, {
    status: 'ALLOWED', reason: 'Impact within standard threshold',
  });
  assert.strictEqual(v.verdict, 'PERMIT');
  assert.strictEqual(v.attested, false, 'it must be recorded as unattested');
  assert.ok(!/[Bb]iometric|attestation verified/.test(v.reason),
    `the audit reason must not claim a biometric or verified attestation, got: ${v.reason}`);
  assert.match(v.reason, /without attestation/,
    `it must say plainly that nothing was attested, got: ${v.reason}`);
});

test('a PERMIT WITH an attestation records the attestation id', async () => {
  // The other half: a real enclave attestation must still be recorded as such, or the honesty fix
  // would have made the audit trail uselessly vague.
  const v = await evaluateWithForcedImpact(99, {
    status: 'ALLOWED', reason: 'Hardware Attestation Verified via Enclave', attestation_id: 'att_abc123',
  });
  assert.strictEqual(v.verdict, 'PERMIT');
  assert.strictEqual(v.attested, true);
  assert.match(v.reason, /att_abc123/, `the attestation id must appear in the audit reason, got: ${v.reason}`);
});

test('a WAIT status still DENIES (unchanged)', async () => {
  const v = await evaluateWithForcedImpact(99, {
    status: 'WAIT_FOR_ORBITAL', reason: 'Hardware/Biometric attestation required', challenge_id: 'orb_x',
  });
  assert.strictEqual(v.verdict, 'DENY', 'an un-attested high-risk mutation must be denied');
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); console.log('  ✅  ' + name); passed++; }
    catch (e) { console.error('  ❌  ' + name + '\n      ' + e.message); failed++; }
  }
  console.log('\nPolicy Engine Bypass (UC-22): ' + passed + ' passed, ' + failed + ' failed');
  if (failed > 0) process.exit(1);
})();
