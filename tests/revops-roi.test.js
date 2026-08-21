/**
 * MindForge v5.10.0 — AgRevOps Logic Test
 * Verifies ROI, Velocity, and Debt calculations.
 */
'use strict';

const assert = require('assert');
const roiEngine = require('../bin/revops/roi-engine');
const velocityForecaster = require('../bin/revops/velocity-forecaster');
const debtMonitor = require('../bin/revops/debt-monitor');

async function testRevOps() {
  console.log('--- Testing AgRevOps Core Logic ---');

  // Mock Metrics
  const mockMetrics = {
    costs: [
      { cost: 0.15 },
      { cost: 0.35 }
    ],
    tasks_total: 10,
    tasks_completed: 5,
    // An ARRAY here is correct: these three engines consume the .entries array, not
    // the {entries,total,limit,offset} wrapper that metricsAggregator.getAuditEntries()
    // returns. That seam — revops-api passing .entries rather than the wrapper — is
    // asserted in tests/dashboard-wiring.test.js; this file only covers the engines.
    auditEntries: [
      { event: 'task_completed', timestamp: '2026-03-28T10:00:00Z', message: 'Refactor auth module' },
      { event: 'task_completed', timestamp: '2026-03-28T10:05:00Z', message: 'Add unit tests' },
      { event: 'task_completed', timestamp: '2026-03-28T10:10:00Z', message: 'Design scaling pillar' },
      { event: 'policy_bypass', timestamp: '2026-03-28T10:12:00Z' },
      { event: 'security_finding', timestamp: '2026-03-28T10:15:00Z', severity: 'critical' }
    ]
  };

  // 1. Test ROI
  const roi = roiEngine.calculate(mockMetrics);
  console.log('[ROI]', roi);
  // assert, not `if (...) console.log` — a bare if can only ever print or stay
  // silent, so this file exited 0 no matter what the engines returned.
  assert.ok(roi.roi_percentage > 0, `ROI must be positive, got ${roi.roi_percentage}`);
  console.log('✅ ROI calculation successful');

  // 2. Test Velocity
  const velocity = velocityForecaster.predict(mockMetrics);
  console.log('[Velocity]', velocity);
  assert.strictEqual(velocity.tasks_remaining, 5,
    `tasks_remaining must be tasks_total - tasks_completed, got ${velocity.tasks_remaining}`);
  console.log('✅ Velocity tracking successful');

  // 3. Test Debt
  const debt = debtMonitor.monitor(mockMetrics);
  console.log('[Debt]', debt);
  // Message corrected to what this actually checks. It used to read "a critical finding must reduce
  // the health score" — but mutation-testing showed it passes with the security_finding deleted
  // outright, because the policy_bypass alone drops the score. The assertion is fine; the claim
  // attached to it was not, and a misleading message is how a coverage gap stays invisible.
  assert.ok(debt.security_health_score < 100,
    `the mock's tracked events must reduce the health score below 100, got ${debt.security_health_score}`);
  console.log('✅ Debt monitoring successful');

  // The property the old message CLAIMED is now asserted for real, one term at a time, so a filter
  // that stops matching cannot hide behind a neighbour that still does.
  const only = (entries) => debtMonitor.monitor({ auditEntries: entries });

  assert.strictEqual(only([{ event: 'security_finding', severity: 'critical' }]).critical_findings, 1,
    'a lone lowercase critical finding must be counted');
  assert.strictEqual(only([{ event: 'policy_bypass' }]).policy_bypasses, 1,
    'a lone policy bypass must be counted');
  assert.strictEqual(only([{ event: 'approval_granted', tier: 3 }]).tier3_approvals, 1,
    'a lone tier-3 approval must be counted');
  console.log('✅ each scoring term is counted on its own');

  // Severity is matched case-insensitively. .mindforge/audit/AUDIT-SCHEMA.md:269 declares severity
  // UPPERCASE ("HIGH"), while this filter used to require lowercase 'critical' — so a
  // schema-compliant writer was invisible. Measured before the fix: three CRITICAL findings scored
  // 100/"Excellent"/"Minimal"; the same three lowercase scored 70/"Warning"/"Moderate".
  const upper = only([1, 2, 3].map(() => ({ event: 'security_finding', severity: 'CRITICAL' })));
  assert.strictEqual(upper.critical_findings, 3,
    `schema-compliant uppercase CRITICAL must count, got ${upper.critical_findings}`);
  assert.strictEqual(upper.security_health_score, 70,
    `three critical findings must score 70, got ${upper.security_health_score}`);
  console.log('✅ severity casing matches the audit schema');

  // ── Never report health that was never measured ──────────────────────────────
  //
  // An absent audit log, an empty one, and a log with no tracked events used to be
  // indistinguishable from a clean one: all returned 100 / "Excellent" / "Minimal". The dashboard
  // showed a green EXCELLENT badge for a project that had recorded nothing.
  const UNMEASURED = debtMonitor.UNMEASURED;

  // The sentinel's own properties carry the frontend contract, so they are asserted on the sentinel
  // rather than on each field. Asserting them per-field would be VACUOUS: the equality checks below
  // already pin each field to this value, so a per-field `.toUpperCase()` probe could only fail in a
  // case the equality check catches first. Pinned here instead, where a change to the sentinel
  // actually reaches them.
  //
  // Both dashboard frontends call `.toUpperCase()` on governance_status and debt_level unguarded, and
  // compare `debt_level === 'Minimal'` (index.html:735,747,748 and PR #186's extracted app.js at
  // :395,407,408 — verified byte-identical). The badge colour compares `score > 80`.
  // A `doesNotThrow(() => UNMEASURED.toUpperCase())` belongs here by symmetry and is NOT included,
  // because every string has toUpperCase — the assertion below already guarantees it, so the probe
  // could never fail and would be one more assertion that cannot go red. The `.toUpperCase()`
  // constraint is what makes the string requirement necessary, so it is recorded as the reason for the
  // assertion rather than as a second, hollow one.
  assert.strictEqual(typeof UNMEASURED, 'string',
    'the sentinel must be exported AND be a string: null or a number is a hard TypeError where both '
    + 'frontends call .toUpperCase(), which blanks the whole RevOps panel rather than showing an '
    + 'empty tile');
  assert.notStrictEqual(UNMEASURED, 'Minimal',
    'both frontends compare debt_level === \'Minimal\'; the sentinel must not collide with it');
  assert.strictEqual(UNMEASURED > 80, false,
    'the badge colour compares > 80 — an unmeasured score must not read as green');

  for (const [label, entries] of [
    ['no entries at all', []],
    ['entries present but none tracked', Array.from({ length: 50 }, () => ({ event: 'task_completed' }))],
  ]) {
    const d = only(entries);
    assert.strictEqual(d.measured, false, `${label}: measured must be false`);
    assert.strictEqual(d.security_health_score, UNMEASURED,
      `${label}: expected the sentinel, got ${JSON.stringify(d.security_health_score)}. Reporting a `
      + 'number here is reporting a measurement that never happened.');
    assert.strictEqual(d.governance_status, UNMEASURED,
      `${label}: governance_status must be the sentinel, got ${JSON.stringify(d.governance_status)} — `
      + 'the frontends uppercase this field unguarded');
    assert.strictEqual(d.debt_level, UNMEASURED,
      `${label}: debt_level must be the sentinel, got ${JSON.stringify(d.debt_level)}`);
  }
  console.log('✅ an unmeasured state is reported as unmeasured, and renders safely');

  // The measured path must still produce a NUMBER, or the change above has simply broken scoring.
  const measuredResult = only([{ event: 'policy_bypass' }]);
  assert.strictEqual(measuredResult.measured, true, 'a tracked event must mark the result measured');
  assert.strictEqual(typeof measuredResult.security_health_score, 'number',
    `a measured score must be a number, got ${typeof measuredResult.security_health_score}`);
  console.log('✅ the measured path still returns a number');

  console.log('--- All AgRevOps Logic Tests Passed ---');
}

testRevOps().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
