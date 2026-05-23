'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

class AuditWriter {
  constructor(filePath) {
    this._path = filePath;
    this._buffer = [];
    this._flushTimer = null;
    this._lastHash = null;
  }

  write(entry) {
    // Add Merkle chain link
    const entryWithHash = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      previous_hash: this._lastHash
    };
    const serialized = JSON.stringify(entryWithHash);
    this._lastHash = crypto.createHash('sha256').update(serialized).digest('hex');
    entryWithHash._hash = this._lastHash;

    this._buffer.push(JSON.stringify(entryWithHash));

    if (this._buffer.length >= 10) {
      return this.flush();
    }
    if (!this._flushTimer) {
      this._flushTimer = setTimeout(() => this.flush(), 100);
    }
    return Promise.resolve();
  }

  async flush() {
    if (this._buffer.length === 0) return;
    clearTimeout(this._flushTimer);
    this._flushTimer = null;

    const lines = this._buffer.splice(0);
    const content = lines.join('\n') + '\n';

    await fsp.mkdir(path.dirname(this._path), { recursive: true });
    await fsp.appendFile(this._path, content);
  }

  async close() {
    await this.flush();
  }

  async initLastHash() {
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

module.exports = { AuditWriter, readJSON, writeJSON, readJSONL, readJSONSync };
