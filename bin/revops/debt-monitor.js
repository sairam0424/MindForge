/**
 * MindForge v5.10.0 — AgRevOps Governance Debt Monitor
 * Calculates Security Health Score and Governance Debt.
 */
'use strict';

const fs = require('fs');
const path = require('path');

class DebtMonitor {
  constructor() {
    this.auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
  }

  /**
   * Monitor governance debt and security health.
   * @param {Object} metrics - From MetricsAggregator
   */
  monitor(metrics) {
    const auditEntries = metrics.auditEntries || [];
    
    // 1. Identify high-risk events
    const criticalFindings = auditEntries.filter(e => e.event === 'security_finding' && e.severity === 'critical');
    const tier3Approvals  = auditEntries.filter(e => e.event === 'approval_granted' && e.tier === 3);
    const policyBypasses   = auditEntries.filter(e => e.event === 'policy_bypass');

    // 2. Calculate Health Score (starts at 100)
    let score = 100;
    score -= (criticalFindings.length * 10);
    score -= (tier3Approvals.length * 5);
    score -= (policyBypasses.length * 15);

    const healthScore = Math.max(0, score);

    // 3. Determine status
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
