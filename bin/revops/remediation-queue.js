/**
 * MindForge v7 — Neural Drift Remediation (NDR)
 * Component: Remediation Queue
 * 
 * Manages the persistence and lifecycle of remediation tasks.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

class RemediationQueue {
  constructor() {
    this.queuePath = path.join(process.cwd(), '.mindforge', 'remediation-queue.json');
    this.queue = this._loadQueue();
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
    const entry = {
      ...task,
      enqueued_at: new Date().toISOString(),
      status: 'PENDING'
    };
    
    this.queue.push(entry);
    this._persist();
    return entry;
  }

  /**
   * Updates the status of a specific remediation task.
   */
  updateStatus(remediationId, status) {
    const task = this.queue.find(t => t.remediation_id === remediationId);
    if (task) {
      task.status = status;
      task.updated_at = new Date().toISOString();
      this._persist();
    }
  }

  /**
   * Internal persistence helper.
   */
  _persist() {
    try {
      if (!fs.existsSync(path.dirname(this.queuePath))) {
        fs.mkdirSync(path.dirname(this.queuePath), { recursive: true });
      }
      fs.writeFileSync(this.queuePath, JSON.stringify(this.queue, null, 2));
    } catch (err) {
      console.error(`[RemediationQueue] Failed to persist queue: ${err.message}`);
    }
  }

  getPending() {
    return this.queue.filter(t => t.status === 'PENDING');
  }

  getAll() {
    return this.queue;
  }
}

module.exports = new RemediationQueue();
