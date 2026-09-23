'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

/**
 * Hash-chained audit writer (class API preserved for nexus-tracer + policy-engine).
 *
 * UC-04b: this class previously maintained a SECOND, DIVERGENT chain implementation
 * (it hashed {...entry, timestamp, previous_hash} — injecting timestamp into the
 * material differently from the canonical writer), so entries it wrote could never
 * verify against bin/governance/audit-verifier.js. It now delegates every write to
 * the SINGLE shared `appendAuditEntrySync` (canonical hashAuditEntry, synchronous +
 * fsync-durable), so there is ONE hasher and ONE on-disk chain per file.
 *
 * The async API (write/flush/close returning promises) is kept because callers do
 * `await this._auditWriter.write(entry)`; the underlying append is now synchronous
 * and durable, so flush()/close() are no-ops retained for API compatibility.
 */
class AuditWriter {
  constructor(filePath) {
    this._path = filePath;
    // Retained for API compatibility; the unified append is synchronous so there
    // is no longer an internal buffer or timer to manage.
    this._lastHash = null;
  }

  async write(entry) {
    // Lazy require (not module-top-level) to keep this leaf utility free of a
    // load-time dependency on the autonomous layer and avoid any future require
    // cycle: bin/autonomous/audit-writer.js is the canonical durable-append site.
    const { appendAuditEntrySync } = require('../autonomous/audit-writer');
    const chained = appendAuditEntrySync(this._path, entry);
    this._lastHash = chained._hash;
    return chained;
  }

  async flush() { /* no-op: appendAuditEntrySync is synchronous + fsync-durable */ }

  async close() { /* no-op: nothing buffered */ }

  async initLastHash() {
    // The unified append seeds its own chain head from the file tail; this remains
    // for callers that expect to prime _lastHash explicitly.
    try {
      const content = await fsp.readFile(this._path, 'utf8');
      const lines = content.trim().split('\n').filter(Boolean);
      if (lines.length > 0) {
        const lastEntry = JSON.parse(lines[lines.length - 1]);
        this._lastHash = lastEntry._hash || null;
      }
    } catch { /* file doesn't exist yet */ }
  }
}

async function readJSON(filePath) {
  try {
    const content = await fsp.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

async function writeJSON(filePath, data) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  await fsp.writeFile(filePath, JSON.stringify(data, null, 2) + '\n');
}

async function readJSONL(filePath, { limit = Infinity, reverse = false } = {}) {
  try {
    const content = await fsp.readFile(filePath, 'utf8');
    let lines = content.trim().split('\n').filter(Boolean);
    if (reverse) lines = lines.reverse();
    return lines.slice(0, limit).map(line => JSON.parse(line));
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

function readJSONSync(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

function atomicWriteJSON(filePath, data) {
  const tmpPath = filePath + '.tmp.' + process.pid;
  const content = JSON.stringify(data, null, 2) + '\n';
  const fd = fs.openSync(tmpPath, 'w');
  fs.writeSync(fd, content);
  fs.fsyncSync(fd);
  fs.closeSync(fd);
  fs.renameSync(tmpPath, filePath);
}

async function atomicWriteJSONAsync(filePath, data) {
  const tmpPath = filePath + '.tmp.' + process.pid;
  const content = JSON.stringify(data, null, 2) + '\n';
  const fh = await fsp.open(tmpPath, 'w');
  await fh.write(content);
  await fh.sync();
  await fh.close();
  await fsp.rename(tmpPath, filePath);
}

module.exports = { AuditWriter, readJSON, writeJSON, readJSONL, readJSONSync, atomicWriteJSON, atomicWriteJSONAsync };
