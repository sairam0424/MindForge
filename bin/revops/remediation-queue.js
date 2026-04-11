/**
 * MindForge v7 — Neural Drift Remediation (NDR)
 * Component: Remediation Queue
 * 
 * Manages the persistence and lifecycle of remediation tasks.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const vectorHub = require('../memory/vector-hub');

class RemediationQueue {
  constructor() {
    this.initialized = false;
  }

  async ensureInit() {
    if (!this.initialized) {
      await vectorHub.init();
      this.initialized = true;
    }
  }

  /**
   * Loads the existing queue from disk.
   */
  _loadQueue() {
    try {
      if (fs.existsSync(this.queuePath)) {
        const raw = fs.readFileSync(this.queuePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch (err) {
      console.error(`[RemediationQueue] Failed to load queue: ${err.message}`);
    }
    return [];
  }

  /**
   * Adds a new task to the remediation queue.
   */
  async enqueue(task) {
    await this.ensureInit();
    const entry = {
      ...task,
      enqueued_at: new Date().toISOString(),
      status: 'PENDING'
    };
    
    await vectorHub.db.insertInto('remediations')
      .values({
        id: entry.remediation_id,
        trace_id: entry.span_id || 'unknown',
        strategy: entry.strategy,
        status: entry.status,
        timestamp: entry.enqueued_at
      })
      .execute();

    return entry;
  }

  /**
   * Updates the status of a specific remediation task.
   */
  async updateStatus(remediationId, status) {
    await this.ensureInit();
    await vectorHub.db.updateTable('remediations')
      .set({ 
        status, 
        outcome: `Updated at ${new Date().toISOString()}` 
      })
      .where('id', '=', remediationId)
      .execute();
  }

  /**
   * Legacy persistence removed in v8 (SQLite transition).
   */
  _persist() {
     // No-op for v8
  }

  _loadQueue() {
     // No-op for v8
     return [];
  }

  async getPending() {
    await this.ensureInit();
    return await vectorHub.db.selectFrom('remediations')
      .selectAll()
      .where('status', '=', 'PENDING')
      .execute();
  }

  async getAll() {
    await this.ensureInit();
    return await vectorHub.db.selectFrom('remediations')
      .selectAll()
      .execute();
  }
}

module.exports = new RemediationQueue();
