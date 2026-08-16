/**
 * MindForge v3 — Temporal Hub (State Versioner)
 * Managed high-fidelity snapshots of the .planning directory.
 *
 * Design:
 * - Each snapshot is identified by an audit_id.
 * - Snapshots are stored in .planning/history/[audit_id]/
 * - Atomic snapshots ensure time-travel debugging consistency.
 * - HMAC integrity signatures on metadata for tamper detection.
 */
'use strict';

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PLANNING_DIR = path.join(process.cwd(), '.planning');
const HISTORY_DIR  = path.join(PLANNING_DIR, 'history');

const HMAC_KEY = 'mindforge-temporal-v3';

class TemporalHub {

  static _signMetadata(metadata) {
    const content = JSON.stringify(metadata);
    const hmac = crypto.createHmac('sha256', HMAC_KEY)
      .update(content)
      .digest('hex');
    return { ...metadata, integrity: hmac };
  }

  static _verifyMetadata(metadata) {
    if (!metadata || typeof metadata.integrity !== 'string') return false;
    const { integrity, ...rest } = metadata;
    const expected = crypto.createHmac('sha256', HMAC_KEY)
      .update(JSON.stringify(rest))
      .digest('hex');
    // timingSafeEqual throws RangeError on unequal BYTE lengths. A String's `.length`
    // counts UTF-16 code units, NOT bytes, so a 64-unit `integrity` containing any
    // non-ASCII character is 65+ bytes and still produced unequal Buffers and still
    // threw. Materialise both Buffers and compare their real byte lengths.
    // NOTE: this is a CORRECTNESS fix, not a security guarantee — HMAC_KEY is a
    // literal in shipped source, the HMAC covers only metadata and not snapshot file
    // CONTENTS, and an absent SNAPSHOT-META.json still bypasses verification. This
    // was never an authenticity control.
    const actual = Buffer.from(integrity, 'utf8');
    const expectedBuf = Buffer.from(expected, 'utf8');
    if (actual.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(actual, expectedBuf);
  }

  /**
   * Capture the current state of the .planning directory.
   * @param {string} auditId - Unique identifier from AUDIT.jsonl
   * @param {object} metadata - Optional context (task_name, session_id)
   * @returns {Promise<string|null>} Path to snapshot dir, or null on failure
   */
  static async captureState(auditId, metadata = {}) {
    if (!/^[a-f0-9-]{8,40}$/.test(auditId)) {
      throw new Error('Invalid audit ID format');
    }

    try {
      await fsPromises.access(PLANNING_DIR);
    } catch {
      return null;
    }

    const snapshotDir = path.join(HISTORY_DIR, auditId);
    if (!path.resolve(snapshotDir).startsWith(path.resolve(HISTORY_DIR))) {
      throw new Error('Path traversal detected in audit ID');
    }

    await fsPromises.mkdir(snapshotDir, { recursive: true });

    try {
      const allEntries = await fsPromises.readdir(PLANNING_DIR, { withFileTypes: true });
      const files = [];

      for (const entry of allEntries) {
        if (entry.isDirectory()) continue;
        const ext = path.extname(entry.name).toLowerCase();
        if (['.md', '.json', '.yml', '.yaml', '.log'].includes(ext)) {
          files.push(entry.name);
        }
      }

      await Promise.all(files.map(file =>
        fsPromises.copyFile(
          path.join(PLANNING_DIR, file),
          path.join(snapshotDir, file)
        )
      ));

      const meta = {
        id: auditId,
        timestamp: new Date().toISOString(),
        ...metadata,
        files: files
      };
      const signedMeta = TemporalHub._signMetadata(meta);
      await fsPromises.writeFile(
        path.join(snapshotDir, 'SNAPSHOT-META.json'),
        JSON.stringify(signedMeta, null, 2)
      );

      return snapshotDir;
    } catch (err) {
      console.error(`[temporal-hub] Failed to capture state for ${auditId}:`, err.message);
      return null;
    }
  }

  /**
   * Restore the .planning directory to a specific snapshot.
   * Verifies HMAC integrity before restoring.
   * @param {string} auditId
   * @returns {Promise<boolean>}
   */
  static async rollbackTo(auditId) {
    if (!/^[a-f0-9-]{8,40}$/.test(auditId)) {
      throw new Error('Invalid audit ID format');
    }
    const snapshotDir = path.join(HISTORY_DIR, auditId);
    if (!path.resolve(snapshotDir).startsWith(path.resolve(HISTORY_DIR))) {
      throw new Error('Path traversal detected in audit ID');
    }

    try {
      await fsPromises.access(snapshotDir);
    } catch {
      throw new Error(`Snapshot ${auditId} not found in history.`);
    }

    const metaPath = path.join(snapshotDir, 'SNAPSHOT-META.json');
    // Read and verify as two SEPARATE stages so only one specific, expected condition
    // (the metadata file genuinely not existing) can reach the tolerant legacy path.
    // The previous single try/catch sniffed err.message for 'integrity verification',
    // so ANY other throw — a JSON.parse SyntaxError, or the crypto RangeError from a
    // non-ASCII `integrity` — fell through to 'proceeding without integrity check' and
    // restored the snapshot anyway. Unexpected throws must fail CLOSED.
    //
    // Error messages deliberately carry no err.message: JSON.parse embeds file content
    // and fs errors embed absolute paths, and these strings reach an HTTP response via
    // hindsight-injector -> temporal-api. Detail goes to the server log only.
    let metaRaw = null;
    try {
      metaRaw = await fsPromises.readFile(metaPath, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error(`[temporal-hub] metadata read failed for ${auditId}:`, err);
        throw new Error(`Snapshot ${auditId} metadata could not be read (${err.code || err.name}) — refusing to restore.`);
      }
      // Missing metadata file on legacy snapshots — allow rollback with warning
      console.warn(`[temporal-hub] No verifiable metadata for ${auditId}, proceeding without integrity check.`);
    }

    if (metaRaw !== null) {
      let verified = false;
      try {
        verified = TemporalHub._verifyMetadata(JSON.parse(metaRaw));
      } catch (err) {
        console.error(`[temporal-hub] metadata parse/verify failed for ${auditId}:`, err);
        throw new Error(`Snapshot ${auditId} failed integrity verification — metadata unreadable or malformed (${err.name}).`);
      }
      if (!verified) {
        throw new Error(`Snapshot ${auditId} failed integrity verification — metadata may be tampered.`);
      }
    }

    try {
      const allEntries = await fsPromises.readdir(snapshotDir);
      const files = allEntries.filter(f => f !== 'SNAPSHOT-META.json');

      await Promise.all(files.map(file =>
        fsPromises.copyFile(
          path.join(snapshotDir, file),
          path.join(PLANNING_DIR, file)
        )
      ));

      return true;
    } catch (err) {
      console.error(`[temporal-hub] Rollback failed for ${auditId}:`, err.message);
      throw err;
    }
  }

  /**
   * Get all available snapshots.
   */
  static getHistory() {
    if (!fs.existsSync(HISTORY_DIR)) return [];

    try {
      return fs.readdirSync(HISTORY_DIR)
        .map(id => {
          const metaPath = path.join(HISTORY_DIR, id, 'SNAPSHOT-META.json');
          if (fs.existsSync(metaPath)) {
            return JSON.parse(fs.readFileSync(metaPath, 'utf8'));
          }
          return { id, error: 'Missing metadata' };
        })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (err) {
      return [];
    }
  }

  /**
   * Read a file from a specific historical snapshot.
   */
  static getSnapshotFile(auditId, filePath) {
    if (!/^[a-f0-9-]{8,40}$/.test(auditId)) {
      throw new Error('Invalid audit ID format');
    }
    const snapPath = path.join(HISTORY_DIR, auditId, path.basename(filePath));
    if (!path.resolve(snapPath).startsWith(path.resolve(HISTORY_DIR))) {
      throw new Error('Path traversal detected in audit ID');
    }
    if (fs.existsSync(snapPath)) {
      return fs.readFileSync(snapPath, 'utf8');
    }
    return null;
  }

  /**
   * Garbage-collect old snapshots to prevent unbounded disk growth.
   * Keeps the most recent `maxSnapshots` and deletes anything older than `maxAgeDays`.
   */
  static async gc(options = {}) {
    try {
      const maxSnapshots = options.maxSnapshots || 50;
      const maxAgeDays = options.maxAgeDays || 7;
      const historyDir = path.join(process.cwd(), '.planning', 'history');

      if (!fs.existsSync(historyDir)) return { deleted: 0, remaining: 0 };

      const entries = fs.readdirSync(historyDir)
        .filter(name => {
          const fullPath = path.join(historyDir, name);
          try { return fs.statSync(fullPath).isDirectory(); } catch { return false; }
        })
        .map(name => {
          const fullPath = path.join(historyDir, name);
          return { name, path: fullPath, mtime: fs.statSync(fullPath).mtime };
        })
        .sort((a, b) => b.mtime - a.mtime);

      const now = Date.now();
      const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
      let deleted = 0;

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const isOverLimit = i >= maxSnapshots;
        const isExpired = (now - entry.mtime.getTime()) > maxAgeMs;

        if (isOverLimit || isExpired) {
          fs.rmSync(entry.path, { recursive: true, force: true });
          deleted++;
        }
      }

      return { deleted, remaining: entries.length - deleted };
    } catch (err) {
      return { deleted: 0, remaining: 0, error: err.message };
    }
  }

  /**
   * Capture terminal output for a command and associate with audit point.
   */
  static captureTerminal(auditId, stdout, stderr) {
    if (!/^[a-f0-9-]{8,40}$/.test(auditId)) {
      throw new Error('Invalid audit ID format');
    }
    const logDir = path.join(HISTORY_DIR, auditId, 'logs');
    if (!path.resolve(logDir).startsWith(path.resolve(HISTORY_DIR))) {
      throw new Error('Path traversal detected in audit ID');
    }
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

    if (stdout) fs.writeFileSync(path.join(logDir, 'stdout.log'), stdout);
    if (stderr) fs.writeFileSync(path.join(logDir, 'stderr.log'), stderr);
  }
}

module.exports = TemporalHub;
