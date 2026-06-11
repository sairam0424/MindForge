/**
 * MindForge v2 — Dashboard API Router
 * All REST endpoints for the dashboard.
 */
'use strict';

const path    = require('path');
const fs      = require('fs');
const Metrics = require('./metrics-aggregator');
const Approval = require('./approval-handler');
const SSE     = require('./sse-bridge');

// Steering queue path (from Day 8 auto-executor)
const STEERING_QUEUE = path.join(process.cwd(), '.planning', 'steering-queue.jsonl');
const AUTO_STATE_PATH = path.join(process.cwd(), '.planning', 'auto-state.json');

function register(app) {

  // ── SSE stream ──────────────────────────────────────────────────────────────
  app.get('/events', (req, res) => {
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering
    res.flushHeaders();

    // Send current status immediately on connect
    try {
      const status = Metrics.getStatus();
      res.write(`event: status:update\ndata: ${JSON.stringify(status)}\n\n`);
    } catch { /* ignore */ }

    SSE.addClient(res);
  });

  // ── Status ──────────────────────────────────────────────────────────────────
  app.get('/api/status', (req, res) => {
    try {
      res.json(Metrics.getStatus());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Audit entries ───────────────────────────────────────────────────────────
  app.get('/api/audit', (req, res) => {
    try {
      const limit  = Math.min(parseInt(req.query.limit  || '50',  10), 200);
      const offset = Math.max(parseInt(req.query.offset || '0',   10), 0);
      const event  = typeof req.query.event === 'string' ? req.query.event : null;
      res.json(Metrics.getAuditEntries(limit, offset, event));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Quality metrics ─────────────────────────────────────────────────────────
  app.get('/api/metrics', (req, res) => {
    try {
      res.json(Metrics.getMetrics());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Approvals ───────────────────────────────────────────────────────────────
  app.get('/api/approvals', (req, res) => {
    try {
      res.json(Metrics.getApprovals());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/approve/:id', (req, res) => {
    try {
      const { id }                  = req.params;
      const { decision, comment }   = req.body || {};

      if (!decision) {
        return res.status(400).json({ error: 'Missing "decision" field (approve|reject)' });
      }

      // SECURITY (v11.5.1): do NOT trust a client-supplied `approver` for the
      // recorded identity — it is forgeable and would let any caller write a
      // false approval audit trail (e.g. resolved_by: 'admin'). requireAuth
      // (server.js) proves the caller holds the owner-only dashboard token but
      // exposes no named principal, so we attribute the action to a FIXED
      // trusted actor. (A future RBAC pass can map a Bearer token -> DID and
      // record the real principal; until then, never echo req.body.approver.)
      const approver = 'dashboard-authenticated';

      const result = Approval.processDecision(id, decision, comment, approver);

      if (!result.success) {
        return res.status(400).json(result);
      }

      // Broadcast approval event to all SSE clients
      SSE.broadcast(
        decision === 'approve' ? 'approval:resolved' : 'approval:resolved',
        { approval_id: id, decision, message: result.message }
      );

      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Team activity ───────────────────────────────────────────────────────────
  app.get('/api/team', (req, res) => {
    try {
      res.json(Metrics.getTeamActivity());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Knowledge base query ────────────────────────────────────────────────────
  app.get('/api/memory', (req, res) => {
    try {
      const q     = typeof req.query.q     === 'string' ? req.query.q.slice(0, 100) : '';
      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
      res.json(Metrics.getMemory(q, limit));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Costs ───────────────────────────────────────────────────────────────────
  app.get('/api/costs', (req, res) => {
    try {
      const window = Math.min(parseInt(req.query.window || '7', 10), 90);
      res.json(Metrics.getCosts(window));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Steering (requires auto mode running) ───────────────────────────────────
  const VALID_STEER_ACTIONS = ['pause', 'resume', 'switch_phase', 'priority_bump', 'skip_task', 'abort'];

  app.post('/api/steer', (req, res) => {
    try {
      const { action, params = {} } = req.body || {};

      // Validate action is present and in allowlist
      if (!action || typeof action !== 'string') {
        return res.status(400).json({
          error: `Invalid action. Valid actions: ${VALID_STEER_ACTIONS.join(', ')}`
        });
      }
      if (!VALID_STEER_ACTIONS.includes(action)) {
        return res.status(400).json({
          error: `Invalid action. Valid actions: ${VALID_STEER_ACTIONS.join(', ')}`
        });
      }

      // If params contains freeText, cap at 200 characters
      if (params.freeText && typeof params.freeText === 'string') {
        if (params.freeText.length > 200) {
          return res.status(400).json({ error: 'params.freeText exceeds 200 character limit' });
        }
      }

      // Check auto mode is running
      const autoState = fs.existsSync(AUTO_STATE_PATH)
        ? JSON.parse(fs.readFileSync(AUTO_STATE_PATH, 'utf8'))
        : null;

      if (!autoState || autoState.status !== 'running') {
        return res.status(409).json({ error: 'Auto mode is not running. Steering has no effect.' });
      }

      // Write to steering queue
      const entry = {
        id:          require('crypto').randomBytes(8).toString('hex'),
        timestamp:   new Date().toISOString(),
        action,
        params,
        authored_by: 'dashboard',
        applies_to:  'all',
        status:      'queued',
        applied_at:  null,
        applied_to_plan: null,
      };

      if (!fs.existsSync(path.dirname(STEERING_QUEUE))) {
        fs.mkdirSync(path.dirname(STEERING_QUEUE), { recursive: true });
      }
      fs.appendFileSync(STEERING_QUEUE, JSON.stringify(entry) + '\n');

      res.json({ success: true, queued: true, id: entry.id, action });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ── Client count (for dashboard connection indicator) ───────────────────────
  app.get('/api/connections', (req, res) => {
    res.json({ clients: SSE.getClientCount() });
  });

  // ── System observability ────────────────────────────────────────────────────
  app.get('/api/v1/system', (req, res) => {
    try {
      const heapUsed = process.memoryUsage().heapUsed;
      const heapTotal = process.memoryUsage().heapTotal;
      const uptime = process.uptime();

      let auditLines = 0;
      try {
        const auditPath = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
        if (fs.existsSync(auditPath)) {
          const content = fs.readFileSync(auditPath, 'utf8');
          auditLines = content.split('\n').filter(l => l.trim()).length;
        }
      } catch { /* non-critical */ }

      let snapshotCount = 0;
      try {
        const historyDir = path.join(process.cwd(), '.planning', 'history');
        if (fs.existsSync(historyDir)) {
          snapshotCount = fs.readdirSync(historyDir).length;
        }
      } catch { /* non-critical */ }

      const heapHealth = Metrics.checkHeapHealth();

      res.json({
        heap_used_mb: Math.round(heapUsed / 1024 / 1024 * 100) / 100,
        heap_total_mb: Math.round(heapTotal / 1024 / 1024 * 100) / 100,
        heap_usage_pct: Math.round(heapUsed / heapTotal * 100),
        heap_alert: heapHealth,
        uptime_seconds: Math.round(uptime),
        audit_lines: auditLines,
        snapshot_count: snapshotCount,
        sse_clients: SSE.getClientCount(),
        node_version: process.version,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

module.exports = { register };
