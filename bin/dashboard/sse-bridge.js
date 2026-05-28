/**
 * MindForge v2 — SSE Event Bridge
 * Tails AUDIT.jsonl and auto-state.json and pushes changes
 * to all connected SSE clients.
 *
 * Design:
 * - Uses fs.watchFile() for cross-platform file watching (not fs.watch)
 * - Each connected client gets a Response object stored in a Set
 * - Events are broadcast to ALL connected clients on every file change
 * - Keepalive ping every 15 seconds to detect disconnected clients
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const AUDIT_PATH      = path.join(process.cwd(), '.planning', 'AUDIT.jsonl');
const AUTO_STATE_PATH = path.join(process.cwd(), '.planning', 'auto-state.json');
const APPROVAL_DIR    = path.join(process.cwd(), '.planning', 'approvals');

const clients = new Set(); // Connected SSE response objects

let _lastAuditSize  = 0;
let _auditInode     = 0; // Track file inode for rotation detection
let _lastAutoState  = '';
let _lastApprovals  = '';

// ── Smart polling: mtime tracking ────────────────────────────────────────────
const _lastMtimes = Object.create(null);

// ── Client management ─────────────────────────────────────────────────────────

function addClient(res) {
  const wasEmpty = clients.size === 0;
  clients.add(res);
  if (wasEmpty) startPolling();

  res.on('close', () => {
    clients.delete(res);
    if (clients.size === 0) stopPolling();
  });
}

function broadcast(eventName, data) {
  const message = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  const toRemove = [];

  for (const res of clients) {
    try {
      res.write(message);
    } catch (err) {
      // Connection died ungracefully (EPIPE, ECONNRESET, etc.)
      toRemove.push(res);
    }
  }

  // Remove dead clients outside iteration
  for (const res of toRemove) {
    clients.delete(res);
  }
}

function broadcastRaw(message) {
  for (const res of clients) {
    try {
      res.write(message);
    } catch {
      clients.delete(res);
    }
  }
}

// ── File tail: AUDIT.jsonl ────────────────────────────────────────────────────

function pollAuditLog() {
  if (!fs.existsSync(AUDIT_PATH)) return;

  try {
    const stat     = fs.statSync(AUDIT_PATH);
    const newSize  = stat.size;
    const newIno   = stat.ino;

    // File rotation detected: inode changed or file shrunk (truncated after archival)
    if ((newIno !== _auditInode && _auditInode !== 0) || (newSize < _lastAuditSize)) {
      process.stderr.write(`[sse-bridge] AUDIT.jsonl rotation detected (size: ${_lastAuditSize} -> ${newSize}, ino: ${_auditInode} -> ${newIno})\n`);
      _lastAuditSize = 0;
    }
    _auditInode = newIno;

    if (newSize <= _lastAuditSize) return;

    // Read only the new bytes appended since last poll
    const fd   = fs.openSync(AUDIT_PATH, 'r');
    const chunk = Buffer.alloc(newSize - _lastAuditSize);
    fs.readSync(fd, chunk, 0, chunk.length, _lastAuditSize);
    fs.closeSync(fd);
    _lastAuditSize = newSize;

    // Parse new lines
    const newLines = chunk.toString().split('\n').filter(Boolean);
    for (const line of newLines) {
      try {
        const entry = JSON.parse(line);
        broadcast('audit:new', entry);
      } catch { /* skip malformed */ }
    }
  } catch { /* ignore read errors — file may be locked */ }
}

// ── File poll: auto-state.json ────────────────────────────────────────────────

function pollAutoState() {
  if (!fs.existsSync(AUTO_STATE_PATH)) return;

  try {
    const mtime = fs.statSync(AUTO_STATE_PATH).mtimeMs;
    if (mtime === _lastMtimes[AUTO_STATE_PATH]) return; // unchanged
    _lastMtimes[AUTO_STATE_PATH] = mtime;

    const raw = fs.readFileSync(AUTO_STATE_PATH, 'utf8');
    if (raw === _lastAutoState) return;
    _lastAutoState = raw;
    const state = JSON.parse(raw);
    broadcast('status:update', state);
  } catch { /* ignore */ }
}

// ── File poll: approval directory ─────────────────────────────────────────────

function pollApprovals() {
  if (!fs.existsSync(APPROVAL_DIR)) return;

  try {
    const mtime = fs.statSync(APPROVAL_DIR).mtimeMs;
    if (mtime === _lastMtimes[APPROVAL_DIR]) return; // unchanged
    _lastMtimes[APPROVAL_DIR] = mtime;

    const files  = fs.readdirSync(APPROVAL_DIR)
      .filter(f => f.startsWith('APPROVAL-') && f.endsWith('.json'))
      .sort();
    const key = files.join(',');
    if (key === _lastApprovals) return;
    _lastApprovals = key;

    // Find new pending approvals
    for (const f of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(APPROVAL_DIR, f), 'utf8'));
        if (data.status === 'pending') {
          broadcast('approval:new', data);
        }
      } catch { /* skip */ }
    }
  } catch { /* ignore */ }
}

// ── Polling lifecycle (idle-aware) ────────────────────────────────────────────

let _pollInterval  = null;
let _pingInterval  = null;
let _initialized   = false;

/**
 * Start polling only when at least one client is connected.
 * Idempotent — calling when already polling is a no-op.
 */
function startPolling() {
  if (_pollInterval) return; // Already polling

  // Initialize AUDIT position on first start
  if (!_initialized && fs.existsSync(AUDIT_PATH)) {
    const stat = fs.statSync(AUDIT_PATH);
    _lastAuditSize = stat.size;
    _auditInode    = stat.ino;
    _initialized   = true;
  }

  // Poll every 2 seconds
  _pollInterval = setInterval(() => {
    pollAuditLog();
    pollAutoState();
    pollApprovals();
  }, 2000);

  // Keepalive ping every 15 seconds
  _pingInterval = setInterval(() => {
    broadcastRaw(': ping\n\n');
  }, 15_000);

  _pollInterval.unref();
  _pingInterval.unref();
}

/**
 * Stop polling when zero clients are connected.
 * Idempotent — calling when already stopped is a no-op.
 */
function stopPolling() {
  if (_pollInterval) { clearInterval(_pollInterval); _pollInterval = null; }
  if (_pingInterval) { clearInterval(_pingInterval); _pingInterval = null; }
}

/**
 * Public start — initializes the bridge (legacy compat).
 * Actual polling begins only when the first client connects.
 */
function start() {
  // Pre-initialize AUDIT position so first client gets instant data
  if (!_initialized && fs.existsSync(AUDIT_PATH)) {
    const stat = fs.statSync(AUDIT_PATH);
    _lastAuditSize = stat.size;
    _auditInode    = stat.ino;
    _initialized   = true;
  }
  // Polling starts lazily when addClient() is called
}

function stop() {
  stopPolling();
}

function getClientCount() { return clients.size; }

module.exports = { addClient, broadcast, start, stop, getClientCount };
