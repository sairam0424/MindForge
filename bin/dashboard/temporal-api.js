/**
 * MindForge v3 — Temporal Dashboard API
 * REST endpoints for time-travel debugging and state exploration.
 */
'use strict';

const express = require('express');
const router = express.Router();
const TemporalHub = require('../engine/temporal-hub');
const HindsightInjector = require('../hindsight-injector');

/**
 * GET /api/temporal/history
 * Returns the full timeline of state snapshots.
 */
router.get('/history', (req, res) => {
  try {
    const history = TemporalHub.getHistory();
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve temporal history', detail: err.message });
  }
});

/**
 * GET /api/temporal/snapshot/:auditId/:file
 * Returns the content of a specific file at a specific point in time.
 */
router.get('/snapshot/:auditId/:file', (req, res) => {
  try {
    const { auditId, file } = req.params;
    const content = TemporalHub.getSnapshotFile(auditId, file);
    
    if (content === null) {
      return res.status(404).json({ error: `File ${file} not found in snapshot ${auditId}` });
    }
    
    res.send(content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve snapshot file', detail: err.message });
  }
});

/**
 * GET /api/temporal/snapshot/:auditId/meta
 * Returns metadata for a specific snapshot.
 */
router.get('/snapshot/:auditId/meta', (req, res) => {
  try {
    const snapshots = TemporalHub.getHistory();
    const snap = snapshots.find(s => s.id === req.params.auditId);
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
    res.json(snap);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve snapshot metadata' });
  }
});

/**
 * POST /api/temporal/inject
 * Triggers a state rollback and hindsight injection.
 */
router.post('/inject', async (req, res) => {
  try {
    const { auditId, fixDescription } = req.body;
    
    if (!auditId || !fixDescription) {
      return res.status(400).json({ error: 'auditId and fixDescription are required' });
    }

    const result = await HindsightInjector.inject(auditId, fixDescription);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (err) {
    res.status(500).json({ error: 'Hindsight injection failed', detail: err.message });
  }
});

module.exports = router;
