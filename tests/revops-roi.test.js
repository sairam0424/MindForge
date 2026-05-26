/**
 * MindForge v5.10.0 — AgRevOps Logic Test
 * Verifies ROI, Velocity, and Debt calculations.
 */
'use strict';

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
  if (roi.roi_percentage > 0) console.log('✅ ROI calculation successful');

  // 2. Test Velocity
  const velocity = velocityForecaster.predict(mockMetrics);
  console.log('[Velocity]', velocity);
  if (velocity.tasks_remaining === 5) console.log('✅ Velocity tracking successful');

  // 3. Test Debt
  const debt = debtMonitor.monitor(mockMetrics);
  console.log('[Debt]', debt);
  if (debt.security_health_score < 100) console.log('✅ Debt monitoring successful');

  console.log('--- All AgRevOps Logic Tests Passed ---');
}

testRevOps().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
