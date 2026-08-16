/**
 * MindForge v3 — Temporal Dashboard API
 * REST endpoints for time-travel debugging and state exploration.
 */
'use strict';

const express = require('express');
const router = express.Router();
const TemporalHub = require('../engine/temporal-hub');
const HindsightInjector = require('../hindsight-injector');
const { sendServerError } = require('./error-response');

/**
 * GET /api/temporal/history
 * Returns the full timeline of state snapshots.
 */
router.get('/history', (req, res) => {
  try {
    const history = TemporalHub.getHistory();
    res.json(history);
  } catch (err) {
    sendServerError(res, 'GET /api/temporal/history', err, 'Failed to retrieve temporal history');
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
    sendServerError(res, 'GET /api/temporal/snapshot/:auditId/:file', err, 'Failed to retrieve snapshot file');
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
    // Previously swallowed the error entirely — no client detail, but no server log
    // either, so a broken history dir was undiagnosable.
    sendServerError(res, 'GET /api/temporal/snapshot/:auditId/meta', err, 'Failed to retrieve snapshot metadata');
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
      // result.error is HindsightInjector's own `err.message` (hindsight-injector.js:59)
      // and can be an fs error carrying an absolute path — never forward it verbatim.
      sendServerError(res, 'POST /api/temporal/inject', result.error, 'Hindsight injection failed',
        { success: false });
    }
  } catch (err) {
    sendServerError(res, 'POST /api/temporal/inject', err, 'Hindsight injection failed');
  }
});

module.exports = router;
