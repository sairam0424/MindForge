/**
 * MindForge v5.10.0 — AgRevOps Governance Debt Monitor
 * Calculates Security Health Score and Governance Debt.
 */
'use strict';

// A `require('fs')` and a `this.auditPath = path.join(...)` used to sit here. Both were dead —
// `grep 'fs\.'` over this file returns nothing and no caller reads `auditPath` — and their presence
// implied this module reads the audit log, which it does not. Its only input is the array handed to
// monitor() by bin/dashboard/revops-api.js. Removed so the module's actual surface is legible.

/**
 * The score is computed from exactly these three event types. If an audit log contains none of them,
 * this module measured NOTHING — which is a different state from measuring cleanly, and the whole
 * point of the sentinel below.
 */
const TRACKED_EVENTS = ['security_finding', 'approval_granted', 'policy_bypass'];

/**
 * Reported in place of a score, a status and a debt level when nothing was measured.
 *
 * WHY A STRING and not null. Both dashboard frontends call `.toUpperCase()` on `governance_status`
 * and `debt_level` (index.html:735,747 and, in PR #186's extracted copy, app.js:395,407 — verified
 * byte-identical), so null or a number is a hard TypeError there, not a blank tile.
 * `security_health_score` is assigned with a bare `textContent =` (index.html:732), so a string
 * passes straight through and renders as the word. Confirmed by loading the real render function into
 * a headless browser: the tile reads "Unmeasured", the badge "STATUS: UNMEASURED", and the `> 80`
 * colour comparison is false, so the badge goes red rather than green. No frontend edit needed.
 */
const UNMEASURED = 'Unmeasured';

class DebtMonitor {
  /**
   * Monitor governance debt and security health.
   * @param {Object} metrics - From MetricsAggregator
   */
  monitor(metrics) {
    const auditEntries = metrics.auditEntries || [];

    // 1. Identify high-risk events.
    //    Severity is compared case-INSENSITIVELY. It used to require lowercase 'critical', while
    //    .mindforge/audit/AUDIT-SCHEMA.md:269 declares severity uppercase ("HIGH"). Measured: three
    //    schema-compliant `severity: 'CRITICAL'` findings scored 100/"Excellent"/"Minimal", while the
    //    same three lowercase scored 70/"Warning"/"Moderate" — so a compliant writer was invisible.
    const criticalFindings = auditEntries.filter((e) => e.event === 'security_finding'
      && String(e.severity || '').toLowerCase() === 'critical');
    const tier3Approvals = auditEntries.filter((e) => e.event === 'approval_granted' && e.tier === 3);
    const policyBypasses = auditEntries.filter((e) => e.event === 'policy_bypass');

    // 2. Refuse to report health that was never measured.
    //    Previously an absent audit log, an empty one, and a clean one were indistinguishable: all
    //    three returned 100 / "Excellent" / "Minimal". Measured, the absent and empty cases were
    //    byte-identical but for the timestamp. Reporting a maximum for the absence of evidence is
    //    the inverse of what a security score is for.
    const measuredEvents = auditEntries.filter((e) => TRACKED_EVENTS.includes(e.event)).length;
    if (measuredEvents === 0) {
      return {
        security_health_score: UNMEASURED,
        governance_status: UNMEASURED,
        critical_findings: 0,
        tier3_approvals: 0,
        policy_bypasses: 0,
        debt_level: UNMEASURED,
        measured: false,
        timestamp: new Date().toISOString(),
      };
    }

    // 3. Calculate Health Score (starts at 100)
    let score = 100;
    score -= (criticalFindings.length * 10);
    score -= (tier3Approvals.length * 5);
    score -= (policyBypasses.length * 15);

    const healthScore = Math.max(0, score);

    // 4. Determine status
    let status = 'Excellent';
    if (healthScore < 90) status = 'Good';
    if (healthScore < 75) status = 'Warning';
    if (healthScore < 50) status = 'Critical';

    return {
      security_health_score: healthScore,
      governance_status: status,
      critical_findings: criticalFindings.length,
      tier3_approvals: tier3Approvals.length,
      policy_bypasses: policyBypasses.length,
      debt_level: this.getDebtLevel(healthScore),
      measured: true,
      timestamp: new Date().toISOString()
    };
  }

  getDebtLevel(score) {
      if (score >= 95) return 'Minimal';
      if (score >= 80) return 'Managing';
      if (score >= 60) return 'Moderate';
      return 'High';
  }
}

module.exports = new DebtMonitor();
module.exports.UNMEASURED = UNMEASURED;
