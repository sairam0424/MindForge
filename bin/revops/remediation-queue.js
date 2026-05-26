/**
 * MindForge v7 — Neural Drift Remediation (NDR)
 * Component: Remediation Queue
 *
 * Manages the persistence and lifecycle of remediation tasks.
 */
'use strict';

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
   * Adds a new task to the remediation queue.
   */
  async enqueue(task) {
    await this.ensureInit();
    const entry = {
      ...task,
      enqueued_at: new Date().toISOString(),
      status: 'PENDING'
    };

    vectorHub.run(
      `INSERT INTO remediations (id, trace_id, strategy, status, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [entry.remediation_id, entry.span_id || 'unknown', entry.strategy, entry.status, entry.enqueued_at]
    );

    return entry;
  }

  /**
   * Updates the status of a specific remediation task.
   */
  async updateStatus(remediationId, status) {
    await this.ensureInit();
    vectorHub.run(
      'UPDATE remediations SET status = ?, outcome = ? WHERE id = ?',
      [status, `Updated at ${new Date().toISOString()}`, remediationId]
    );
  }

  async getPending() {
    await this.ensureInit();
    return vectorHub.query(
      'SELECT * FROM remediations WHERE status = ?',
      ['PENDING']
    );
  }

  async getAll() {
    await this.ensureInit();
    return vectorHub.query('SELECT * FROM remediations');
  }
}

module.exports = new RemediationQueue();
