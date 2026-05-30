'use strict';
/**
 * MindForge — Single-writer serialized append queue (UC-09).
 * Guarantees: (1) appends to a given file are serialized (no interleaving across
 * concurrent callers in this process), (2) each append() resolves only after the
 * bytes are fsync'd to disk (durability), (3) a trailing newline delimits records.
 *
 * Scope: protects against in-process concurrent-write interleaving and crash-loss
 * of acknowledged writes. Cross-PROCESS locking is out of scope for the
 * single-operator localhost model (documented; revisit if multi-process writers appear).
 */
const fs = require('fs');

const queues = new Map(); // path -> Promise chain tail

function createAppendQueue(filePath) {
  if (!queues.has(filePath)) queues.set(filePath, Promise.resolve());

  function append(line) {
    const record = line.endsWith('\n') ? line : line + '\n';
    const tail = queues.get(filePath).then(() => writeDurable(filePath, record));
    queues.set(filePath, tail.catch(() => {}));
    return tail;
  }

  function drain() {
    return queues.get(filePath);
  }

  return Object.freeze({ append, drain });
}

function writeDurable(filePath, data) {
  return new Promise((resolve, reject) => {
    fs.open(filePath, 'a', (openErr, fd) => {
      if (openErr) return reject(openErr);
      fs.write(fd, data, (writeErr) => {
        if (writeErr) { fs.close(fd, () => {}); return reject(writeErr); }
        fs.fsync(fd, (syncErr) => {
          fs.close(fd, (closeErr) => {
            if (syncErr) return reject(syncErr);
            if (closeErr) return reject(closeErr);
            resolve();
          });
        });
      });
    });
  });
}

module.exports = { createAppendQueue };
