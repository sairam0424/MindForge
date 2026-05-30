/**
 * MindForge — Audit Writer (Async Buffered)
 * Extracted from auto-runner.js — handles all JSONL audit append operations.
 * Buffers entries and flushes every 100ms or when buffer reaches 10 entries.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { AuditRotator } = require('../utils/file-io');
const { createAppendQueue } = require('../utils/append-queue');

const FLUSH_INTERVAL_MS = 100;
const FLUSH_THRESHOLD = 10;

const rotator = new AuditRotator({ maxLines: 5000 });

/**
 * Creates a buffered async audit writer.
 * @param {string} auditPath — Path to the AUDIT.jsonl file
 * @returns {{ write: (entry: object) => void, flush: () => Promise<void>, close: () => Promise<void> }}
 */
function createAuditWriter(auditPath) {
  let buffer = [];
  let flushTimer = null;
  let isClosed = false;
  const queue = createAppendQueue(auditPath);

  function scheduleFlush() {
    if (flushTimer !== null) return;
    flushTimer = setTimeout(async () => {
      flushTimer = null;
      await flush();
    }, FLUSH_INTERVAL_MS);
  }

  /**
   * Adds an entry to the buffer. Triggers flush if threshold reached.
   * Stamps entry with id and timestamp if missing (immutable — creates new object).
   */
  function write(entry) {
    if (isClosed) {
      throw new Error('AuditWriter is closed — cannot write after close()');
    }

    const stamped = Object.assign(Object.create(null), entry, {
      id: entry.id || crypto.randomBytes(8).toString('hex'),
      timestamp: entry.timestamp || new Date().toISOString(),
    });

    buffer = [...buffer, stamped];

    if (buffer.length >= FLUSH_THRESHOLD) {
      // Immediate flush — don't wait for timer
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      flush();
    } else {
      scheduleFlush();
    }

    return stamped;
  }

  /**
   * Flushes the buffer to disk using async appendFile.
   */
  async function flush() {
    if (buffer.length === 0) return;

    const toWrite = buffer;
    buffer = [];

    const payload = toWrite.map(e => JSON.stringify(e)).join('\n') + '\n';
    await queue.append(payload.replace(/\n$/, ''));

    try {
      if (rotator.shouldRotate(auditPath)) {
        const archiveDir = path.join(path.dirname(auditPath), '..', '.planning', 'audit-archive');
        rotator.rotate(auditPath, archiveDir);
      }
    } catch (err) {
      process.stderr.write(`[audit-writer] rotation warning: ${err.message}\n`);
    }
  }

  /**
   * Flushes remaining entries and stops the timer. After close(), write() will throw.
   */
  async function close() {
    isClosed = true;
    if (flushTimer !== null) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    await flush();
    // Drain any in-flight threshold-triggered flushes that enqueued without being
    // awaited — guarantees all acknowledged writes are durable before close resolves.
    await queue.drain();
  }

  return Object.freeze({ write, flush, close });
}

module.exports = { createAuditWriter };
