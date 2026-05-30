/**
 * MindForge v9 VectorHub — WASM SQLite Persistence Layer
 * Uses sql.js (Emscripten-compiled SQLite) for zero native dependency operation.
 * No node-gyp, no C++ compiler required — works everywhere Node runs.
 */
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

/**
 * VectorHub — Unified Persistence Layer
 * Traces, remediations, skills, knowledge, and graph edges.
 *
 * This version uses sql.js (WASM-based SQLite) instead of better-sqlite3.
 * Initialization is async — callers must await init() before use.
 */
class VectorHub {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(process.cwd(), '.mindforge', 'celestial.db');
    this._db = null;
    this.initialized = false;
    this._writeCount = 0;
    this._batchSize = 10;
    // UC-09: serialized async persistence chain. Successive save() calls queue
    // behind one another so two exports never write the .db file concurrently
    // (a corrupted half-written database would otherwise be possible).
    this._saveChain = Promise.resolve();
    // True when an async save() has been issued but may not yet have hit disk.
    // The exit guard uses this to perform a synchronous final flush, preventing
    // data loss for processes that hard-exit without calling close().
    this._dirty = false;
    this._exitGuardInstalled = false;
  }

  _installExitGuard() {
    if (this._exitGuardInstalled) return;
    this._exitGuardInstalled = true;
    // 'exit' handlers can only run synchronous code — saveSync() fits exactly.
    process.once('exit', () => {
      if (this._db && this._dirty) this.saveSync();
    });
  }

  _ensureDir() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Initialize the WASM SQLite database and create tables + indexes.
   */
  async init() {
    if (this.initialized) return;

    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();

    this._ensureDir();

    // Load existing database from disk if present
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this._db = new SQL.Database(buffer);
    } else {
      this._db = new SQL.Database();
    }

    // Pragmas for performance and reliability
    this._db.run('PRAGMA journal_mode=WAL;');
    this._db.run('PRAGMA synchronous=NORMAL;');
    this._db.run('PRAGMA busy_timeout=5000;');

    // ── Table Creation ──────────────────────────────────────────────────────

    this._db.run(`
      CREATE TABLE IF NOT EXISTS traces (
        id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        span_id TEXT,
        event TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        agent TEXT,
        content TEXT,
        metadata TEXT,
        drift_score REAL,
        mesh_node_id TEXT
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS remediations (
        id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        strategy TEXT NOT NULL,
        status TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        outcome TEXT
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS skills (
        skill_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        path TEXT,
        success_rate REAL DEFAULT 0.0,
        last_verified TEXT
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS attestations (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL,
        status TEXT NOT NULL,
        attestation_payload TEXT,
        timestamp TEXT NOT NULL
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS mesh_config (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS knowledge (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        tags TEXT,
        source TEXT,
        confidence REAL DEFAULT 1.0,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        metadata TEXT
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS graph_edges (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        target_id TEXT NOT NULL,
        edge_type TEXT NOT NULL,
        weight REAL DEFAULT 1.0,
        created_at TEXT NOT NULL
      )
    `);

    this._db.run(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TEXT NOT NULL
      )
    `);

    // ── FTS4 Virtual Tables (FTS4 is available in all sql.js builds) ────────

    this._db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS traces_search
      USING fts4(trace_id, content, agent, tokenize=porter)
    `);

    this._db.run(`
      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search
      USING fts4(id, content, tags, tokenize=porter)
    `);

    // ── Indexes ─────────────────────────────────────────────────────────────

    this._db.run('CREATE INDEX IF NOT EXISTS idx_traces_trace_id ON traces(trace_id)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON traces(timestamp)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge(type)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_graph_edges_source ON graph_edges(source_id)');
    this._db.run('CREATE INDEX IF NOT EXISTS idx_graph_edges_target ON graph_edges(target_id)');
    this._db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(name)');

    this.initialized = true;
    this._installExitGuard();
    this.save();
    console.log(`[VectorHub] Initialized WASM SQLite persistence at ${this.dbPath}`);
  }

  /**
   * Persist the in-memory database to disk (UC-09).
   *
   * sql.js export() is intrinsically synchronous, but the (potentially large)
   * FILE WRITE no longer blocks the event loop: we snapshot the bytes
   * synchronously, then write+fsync them asynchronously. Successive saves are
   * serialized on a single chain so two exports never write the .db file
   * concurrently. The write is crash-safe (tmp file + atomic rename + fsync),
   * so a partial write can never leave a corrupted database on disk.
   *
   * @returns {Promise<void>} Resolves once the snapshot is durably on disk.
   */
  save() {
    if (!this._db) return Promise.resolve();

    let buffer;
    try {
      this._ensureDir();
      // Snapshot the DB synchronously so the bytes reflect this exact moment.
      buffer = Buffer.from(this._db.export());
    } catch (err) {
      console.warn(`[VectorHub] Failed to export database: ${err.message}`);
      return Promise.resolve();
    }

    const dbPath = this.dbPath;
    this._dirty = true;
    this._saveChain = this._saveChain.then(() => writeDbDurable(dbPath, buffer))
      .then(() => { this._dirty = false; })
      .catch((err) => {
        console.warn(`[VectorHub] Failed to save database: ${err.message}`);
      });
    return this._saveChain;
  }

  /**
   * Synchronous, crash-safe persistence — used only on shutdown to GUARANTEE
   * no acknowledged write is lost if the process exits before the async save
   * chain drains. Correctness over non-blocking here.
   */
  saveSync() {
    if (!this._db) return;
    try {
      this._ensureDir();
      const buffer = Buffer.from(this._db.export());
      const tmpPath = `${this.dbPath}.tmp.${process.pid}`;
      const fd = fs.openSync(tmpPath, 'w');
      try {
        fs.writeSync(fd, buffer);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      fs.renameSync(tmpPath, this.dbPath);
      this._dirty = false;
    } catch (err) {
      console.warn(`[VectorHub] Failed to save database (sync): ${err.message}`);
    }
  }

  /**
   * Auto-save after N writes.
   */
  _autosave() {
    this._writeCount++;
    if (this._writeCount >= this._batchSize) {
      this.save();
      this._writeCount = 0;
    }
  }

  /**
   * Close the database and save final state to disk.
   * Drains any pending async saves, then performs a guaranteed synchronous
   * durable write so no acknowledged data is lost on shutdown (UC-09).
   */
  async close() {
    if (this._db) {
      try { await this._saveChain; } catch { /* logged in save() */ }
      this.saveSync();
      this._db.close();
      this._db = null;
      this.initialized = false;
    }
  }

  // ── Raw Query Interface ─────────────────────────────────────────────────────
  // These methods replace direct Kysely .db access for consumers.

  /**
   * Run a SQL query that returns rows (SELECT).
   * @param {string} sqlText - SQL query
   * @param {Array} params - Bound parameters
   * @returns {Array<Object>} Array of row objects
   */
  query(sqlText, params = []) {
    const stmt = this._db.prepare(sqlText);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  /**
   * Run a SQL statement that does not return rows (INSERT, UPDATE, DELETE).
   * @param {string} sqlText - SQL statement
   * @param {Array} params - Bound parameters
   */
  run(sqlText, params = []) {
    this._db.run(sqlText, params);
    this._autosave();
  }

  /**
   * Run multiple statements inside a transaction.
   * @param {Function} fn - Function that receives { query, run } helpers
   */
  async transaction(fn) {
    this._db.run('BEGIN TRANSACTION');
    try {
      await fn({
        query: (sqlText, params) => this.query(sqlText, params),
        run: (sqlText, params) => {
          this._db.run(sqlText, params);
        },
      });
      this._db.run('COMMIT');
      this._autosave();
    } catch (err) {
      this._db.run('ROLLBACK');
      throw err;
    }
  }

  // ── Trace API ─────────────────────────────────────────────────────────────

  /**
   * Record a trace event.
   */
  async recordTrace(data) {
    const entry = {
      id: data.id || crypto.randomBytes(8).toString('hex'),
      trace_id: data.trace_id,
      span_id: data.span_id || null,
      event: data.event,
      timestamp: data.timestamp || new Date().toISOString(),
      agent: data.agent || null,
      content: data.content || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      drift_score: data.drift_score || 0,
      mesh_node_id: data.mesh_node_id || null,
    };

    this.run(
      `INSERT OR REPLACE INTO traces (id, trace_id, span_id, event, timestamp, agent, content, metadata, drift_score, mesh_node_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.id, entry.trace_id, entry.span_id, entry.event, entry.timestamp, entry.agent, entry.content, entry.metadata, entry.drift_score, entry.mesh_node_id]
    );

    // Update FTS index if content exists
    if (entry.content) {
      this._db.run('DELETE FROM traces_search WHERE trace_id = ?', [entry.trace_id]);
      this._db.run(
        'INSERT INTO traces_search (trace_id, content, agent) VALUES (?, ?, ?)',
        [entry.trace_id, entry.content, entry.agent]
      );
    }

    return entry.id;
  }

  /**
   * Query traces with optional filters.
   * @param {Object} opts - { trace_id, event, since, limit }
   */
  async queryTraces(opts = {}) {
    let sqlText = 'SELECT * FROM traces WHERE 1=1';
    const params = [];

    if (opts.trace_id) {
      sqlText += ' AND trace_id = ?';
      params.push(opts.trace_id);
    }
    if (opts.event) {
      sqlText += ' AND event = ?';
      params.push(opts.event);
    }
    if (opts.since) {
      sqlText += ' AND timestamp > ?';
      params.push(opts.since);
    }

    sqlText += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(Math.min(Math.max(parseInt(opts.limit) || 100, 1), 1000));

    return this.query(sqlText, params);
  }

  /**
   * Full-text search for traces.
   */
  async searchTraces(rawQuery) {
    const escaped = rawQuery.replace(/"/g, '""');
    const ftsQuery = `"${escaped}"`;
    return this.query(
      `SELECT t.*
       FROM traces t
       JOIN traces_search ts ON t.trace_id = ts.trace_id
       WHERE traces_search MATCH ?
       LIMIT 10`,
      [ftsQuery]
    );
  }

  /**
   * Full-text search for traces (alias for backward compat).
   */
  async searchFTS(rawQuery) {
    return this.searchTraces(rawQuery);
  }

  /**
   * Get database statistics.
   */
  async getStats() {
    const traceCount = this.query('SELECT COUNT(*) as count FROM traces')[0]?.count || 0;
    const knowledgeCount = this.query('SELECT COUNT(*) as count FROM knowledge')[0]?.count || 0;
    const edgeCount = this.query('SELECT COUNT(*) as count FROM graph_edges')[0]?.count || 0;
    const skillCount = this.query('SELECT COUNT(*) as count FROM skills')[0]?.count || 0;
    const remediationCount = this.query('SELECT COUNT(*) as count FROM remediations')[0]?.count || 0;

    return {
      traces: traceCount,
      knowledge: knowledgeCount,
      edges: edgeCount,
      skills: skillCount,
      remediations: remediationCount,
      dbPath: this.dbPath,
      dbSizeBytes: fs.existsSync(this.dbPath) ? fs.statSync(this.dbPath).size : 0,
    };
  }

  // ── Knowledge API (v9 Pillar XXVI) ────────────────────────────────────────

  async saveKnowledge(entry) {
    const now = new Date().toISOString();
    const record = {
      id: entry.id || `k_${crypto.randomBytes(8).toString('hex')}`,
      type: entry.type || 'insight',
      content: entry.content,
      tags: Array.isArray(entry.tags) ? entry.tags.join(',') : (entry.tags || ''),
      source: entry.source || 'unknown',
      confidence: entry.confidence ?? 1.0,
      created_at: entry.created_at || now,
      updated_at: now,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    };

    this.run(
      `INSERT OR REPLACE INTO knowledge (id, type, content, tags, source, confidence, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [record.id, record.type, record.content, record.tags, record.source, record.confidence, record.created_at, record.updated_at, record.metadata]
    );

    // Update FTS index
    this._db.run('DELETE FROM knowledge_search WHERE id = ?', [record.id]);
    this._db.run(
      'INSERT INTO knowledge_search (id, content, tags) VALUES (?, ?, ?)',
      [record.id, record.content, record.tags]
    );
    this._autosave();

    return record.id;
  }

  async searchKnowledge(rawQuery, limit = 10) {
    const escaped = rawQuery.replace(/"/g, '""');
    const ftsQuery = `"${escaped}"`;
    return this.query(
      `SELECT k.*
       FROM knowledge k
       JOIN knowledge_search ks ON k.id = ks.id
       WHERE knowledge_search MATCH ?
       LIMIT ?`,
      [ftsQuery, limit]
    );
  }

  async saveEdge(edge) {
    const record = {
      id: edge.id || `e_${crypto.randomBytes(8).toString('hex')}`,
      source_id: edge.source_id,
      target_id: edge.target_id,
      edge_type: edge.edge_type,
      weight: edge.weight ?? 1.0,
      created_at: edge.created_at || new Date().toISOString(),
    };

    this.run(
      `INSERT OR IGNORE INTO graph_edges (id, source_id, target_id, edge_type, weight, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [record.id, record.source_id, record.target_id, record.edge_type, record.weight, record.created_at]
    );

    return record.id;
  }

  async getEdges(nodeId) {
    return this.query(
      'SELECT * FROM graph_edges WHERE source_id = ? OR target_id = ?',
      [nodeId, nodeId]
    );
  }

  // ── Migration Tracking (v9 Pillar XXVII) ─────────────────────────────────

  async getAppliedMigrations() {
    const rows = this.query('SELECT name FROM _migrations');
    return rows.map(r => r.name);
  }

  async recordMigration(name) {
    this.run(
      'INSERT OR IGNORE INTO _migrations (name, applied_at) VALUES (?, ?)',
      [name, new Date().toISOString()]
    );
  }
}

// ── Durable async DB file write (UC-09) ───────────────────────────────────────
// Crash-safe: write to a tmp file, fsync, then atomically rename over the target.
// A crash mid-write leaves the previous good .db intact (rename is atomic on POSIX).
function writeDbDurable(dbPath, buffer) {
  return new Promise((resolve, reject) => {
    const tmpPath = `${dbPath}.tmp.${process.pid}`;
    const fail = (err) => { fs.unlink(tmpPath, () => reject(err)); };
    fs.open(tmpPath, 'w', (openErr, fd) => {
      if (openErr) return reject(openErr);
      fs.write(fd, buffer, 0, buffer.length, 0, (writeErr) => {
        if (writeErr) { fs.close(fd, () => fail(writeErr)); return; }
        fs.fsync(fd, (syncErr) => {
          fs.close(fd, (closeErr) => {
            if (syncErr) return fail(syncErr);
            if (closeErr) return fail(closeErr);
            fs.rename(tmpPath, dbPath, (renameErr) => {
              if (renameErr) return fail(renameErr);
              resolve();
            });
          });
        });
      });
    });
  });
}

// ── Factory Function ──────────────────────────────────────────────────────────

/**
 * Create a new VectorHub instance (async factory).
 * @param {string} [dbPath] - Optional path for the SQLite database file
 * @returns {Promise<VectorHub>} Initialized VectorHub instance
 */
async function createVectorHub(dbPath) {
  const hub = new VectorHub(dbPath);
  await hub.init();
  return hub;
}

// Lazy singleton — not instantiated until first method call
let _instance = null;
const lazyHub = new Proxy({}, {
  get(_, prop) {
    if (prop === 'VectorHub') return VectorHub;
    if (prop === 'createVectorHub') return createVectorHub;
    if (!_instance) _instance = new VectorHub();
    return typeof _instance[prop] === 'function'
      ? _instance[prop].bind(_instance)
      : _instance[prop];
  }
});

module.exports = lazyHub;
module.exports.VectorHub = VectorHub;
module.exports.createVectorHub = createVectorHub;
