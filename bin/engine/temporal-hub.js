/**
 * MindForge v3 — Temporal Hub (State Versioner)
 * Managed high-fidelity snapshots of the .planning directory.
 * 
 * Design:
 * - Each snapshot is identified by an audit_id.
 * - Snapshots are stored in .planning/history/[audit_id]/
 * - Atomic snapshots ensure time-travel debugging consistency.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PLANNING_DIR = path.join(process.cwd(), '.planning');
const HISTORY_DIR  = path.join(PLANNING_DIR, 'history');

class TemporalHub {
  /**
   * Capture the current state of the .planning directory.
   * @param {string} auditId - Unique identifier from AUDIT.jsonl
   * @param {object} metadata - Optional context (task_name, session_id)
   */
  static captureState(auditId, metadata = {}) {
    if (!fs.existsSync(PLANNING_DIR)) return null;
    
    const snapshotDir = path.join(HISTORY_DIR, auditId);
    if (!fs.existsSync(snapshotDir)) {
      fs.mkdirSync(snapshotDir, { recursive: true });
    }

    try {
      // 1. Identify files to snapshot (exclude history itself and archive)
      const files = fs.readdirSync(PLANNING_DIR).filter(f => {
        const stats = fs.statSync(path.join(PLANNING_DIR, f));
        if (stats.isDirectory()) return false;
        
        const ext = path.extname(f).toLowerCase();
        return ['.md', '.json', '.yml', '.yaml', '.log'].includes(ext);
      });

      // 2. Snapshot files
      for (const file of files) {
        fs.copyFileSync(
          path.join(PLANNING_DIR, file),
          path.join(snapshotDir, file)
        );
      }

      // 3. Save snapshot metadata
      const meta = {
        id: auditId,
        timestamp: new Date().toISOString(),
        ...metadata,
        files: files
      };
      fs.writeFileSync(path.join(snapshotDir, 'SNAPSHOT-META.json'), JSON.stringify(meta, null, 2));

      return snapshotDir;
    } catch (err) {
      console.error(`[temporal-hub] Failed to capture state for ${auditId}:`, err.message);
      return null;
    }
  }

  /**
   * Restore the .planning directory to a specific snapshot.
   * @param {string} auditId 
   */
  static rollbackTo(auditId) {
    const snapshotDir = path.join(HISTORY_DIR, auditId);
    if (!fs.existsSync(snapshotDir)) {
      throw new Error(`Snapshot ${auditId} not found in history.`);
    }

    try {
      const files = fs.readdirSync(snapshotDir).filter(f => f !== 'SNAPSHOT-META.json');
      
      for (const file of files) {
        fs.copyFileSync(
          path.join(snapshotDir, file),
          path.join(PLANNING_DIR, file)
        );
      }
      
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
    const snapPath = path.join(HISTORY_DIR, auditId, path.basename(filePath));
    if (fs.existsSync(snapPath)) {
      return fs.readFileSync(snapPath, 'utf8');
    }
    return null;
  }

  /**
   * Capture terminal output for a command and associate with audit point.
   */
  static captureTerminal(auditId, stdout, stderr) {
    const logDir = path.join(HISTORY_DIR, auditId, 'logs');
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
    
    if (stdout) fs.writeFileSync(path.join(logDir, 'stdout.log'), stdout);
    if (stderr) fs.writeFileSync(path.join(logDir, 'stderr.log'), stderr);
  }
}

module.exports = TemporalHub;
