/**
 * MindForge v5.10.0 — AgRevOps API
 * Exposes ROI, Velocity, and Debt monitoring to the dashboard.
 */
'use strict';

const express = require('express');
const router = express.Router();
const roiEngine = require('../revops/roi-engine');
const velocityForecaster = require('../revops/velocity-forecaster');
const debtMonitor = require('../revops/debt-monitor');
const metricsAggregator = require('./metrics-aggregator');

/**
 * GET /api/revops/overview
 * Returns a consolidated view of ROI, Velocity, and Governance Debt.
 */
router.get('/overview', (req, res) => {
  try {
    const metrics = metricsAggregator.getMetrics();
    const status  = metricsAggregator.getStatus();
    
    // Enrich with current status for forecaster
    const fullMetrics = { 
        ...metrics, 
        tasks_total: status.tasks_total || 0,
        tasks_completed: status.tasks_completed || 0,
        auditEntries: metricsAggregator.getAuditEntries(500) // need enough history for velocity
    };

    const roi      = roiEngine.calculate(fullMetrics);
    const velocity = velocityForecaster.predict(fullMetrics);
    const debt     = debtMonitor.monitor(fullMetrics);

    res.json({
        success: true,
        roi,
        velocity,
        debt,
        timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'AgRevOps metrics retrieval failed', detail: err.message });
  }
});

module.exports = router;
