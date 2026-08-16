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
const { sendServerError } = require('./error-response');

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
        // .entries — getAuditEntries() returns { entries, total, limit, offset }, not an
        // array. roi-engine, velocity-forecaster and debt-monitor all call .filter() on
        // this value, so handing them the wrapper object throws a TypeError that the
        // route's catch turns into an opaque 500.
        auditEntries: metricsAggregator.getAuditEntries(500).entries // need enough history for velocity
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
    // LEAK-01: echoing err.message as a `detail` field put absolute filesystem paths
    // — and therefore the operator's username and home directory — into an
    // unauthenticated HTTP response body (requireAuth exempts GET). Log the full
    // error server-side; return a generic message plus a correlation id.
    sendServerError(res, 'GET /api/revops/overview', err,
      'AgRevOps metrics retrieval failed', { success: false });
  }
});

module.exports = router;
