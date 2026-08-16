/**
 * MindForge v9 VectorHub — WASM SQLite Persistence Layer
 * Uses sql.js (Emscripten-compiled SQLite) for zero native dependency operation.
 * No node-gyp, no C++ compiler required — works everywhere Node runs.
 */
'use strict';

const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// ── FTS retrieval (FTS-01) ───────────────────────────────────────────────────
// A MATCH argument is an FTS *query expression*, not a literal. Wrapping the
// whole user query in double quotes made it ONE phrase, so a multi-word query
// only matched documents holding those exact ADJACENT words. Default behaviour
// is now search-box semantics: tokenise, drop FTS operator keywords, quote each
// term (which neutralises every FTS metacharacter) and OR the results together.
// Callers that genuinely need adjacency pass { phrase: true }.
//
// The OR alone is NOT the fix. FTS4 has no ranker, so the first `limit` rows
// are docid order over documents containing ANY term ("how", "the", "work") and
// measured mean recall@10 stays 0.0000. Ranking is what recovers it: tf-idf
// scored in JS from FTS4's matchinfo('pcnx') blob. Measured via
// `npm run eval:retrieval` on the repo doc corpus (517 docs, 10 golden
// queries): recall@10 0.0000 -> 0.6417, nDCG@10 0.0000 -> 0.5698.
const FTS_OPERATOR_WORDS = new Set(['and', 'or', 'not', 'near']);
const FTS_MAX_TERMS = 32;
const FTS_DEFAULT_LIMIT = 10;
const FTS_MAX_LIMIT = 100;
// Candidate rows pulled PER TERM before ranking. Bounds the work done for a very
// common term; see _rankedFtsSearch for why the pool is per term and not per
// query.
const FTS_RANK_POOL = 2000;
// BM25-style term-frequency saturation. matchinfo('pcnx') carries no document
// length, so a raw term count would systematically favour long documents;
// saturating tf at tf/(tf + k) keeps a repeated term ranked above a single
// occurrence without letting file size dominate the score.
const FTS_TF_SATURATION = 1.2;
// The only tables a ranked search may touch, with each FTS table's per-column
// relevance weights in DECLARED column order. _rankedFtsSearch interpolates
// these identifiers into SQL (SQLite cannot bind an identifier), so they are
// allowlisted here rather than trusted — no caller string can reach that SQL.
// A hit in the identifier column is a title match and is worth more than one in
// the body; traces_search declares `id` notindexed so it can never produce a hit
// at all, and weight 0 documents that rather than implying otherwise.
const FTS_SEARCH_TABLES = {
  traces: { ftsTable: 'traces_search', columnWeights: [0, 1, 1, 1] }, // id, trace_id, content, agent
  knowledge: { ftsTable: 'knowledge_search', columnWeights: [3, 1, 1] }, // id, content, tags
};

/**
 * Tokenise a raw user query into individual FTS4 MATCH expressions.
 * @param {string} rawQuery - MUST be a string; anything else is a caller bug
 * @param {{phrase?: boolean}} [opts] - phrase:true yields a single
 *   exact-adjacency phrase expression instead of one expression per term
 * @returns {string[]} MATCH expressions; empty when the query holds no term
 * @throws {TypeError} when rawQuery is not a string
 */
function buildFtsTerms(rawQuery, opts = {}) {
  // Reject a non-string LOUDLY. Stringifying would turn an accidentally-passed
  // options object into "[object Object]" and silently search for that literal —
  // a wrong answer that looks like a working search. bin/engine/
  // remediation-engine.js did exactly that. Failing at the boundary is honest.
  if (typeof rawQuery !== 'string') {
    const got = rawQuery === null ? 'null' : typeof rawQuery;
    throw new TypeError(`[VectorHub] search query must be a string, received ${got}`);
  }
  if (opts.phrase) {
    // FTS query syntax has no escape for a double quote inside a phrase, so
    // strip them rather than emit an unparseable expression.
    const phrase = rawQuery.replace(/"/g, ' ').trim();
    return phrase ? [`"${phrase}"`] : [];
  }
  const terms = [];
  const seen = new Set();
  // Split on every character that is not a letter, digit or underscore: the
  // resulting tokens cannot contain an FTS metacharacter, so quoting is total.
  for (const token of rawQuery.split(/[^\p{L}\p{N}_]+/u)) {
    if (!token) continue;
    const lower = token.toLowerCase();
    if (FTS_OPERATOR_WORDS.has(lower) || seen.has(lower)) continue;
    seen.add(lower);
    terms.push(`"${token}"`);
    if (terms.length >= FTS_MAX_TERMS) break;
  }
  return terms;
}

/**
 * Clamp a caller-supplied row limit into a sane bounded integer.
 * @param {*} limit
 * @returns {number} an integer in [1, FTS_MAX_LIMIT]
 */
function clampFtsLimit(limit) {
  const n = parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return FTS_DEFAULT_LIMIT;
  return Math.min(n, FTS_MAX_LIMIT);
}

/**
 * Score one FTS4 matchinfo('pcnx') blob as a weighted tf-idf sum over every
 * phrase/column pair.
 *
 * Blob layout (little-endian uint32): [p, c, n, then 3 values per (phrase,
 * column) pair — hits in THIS row, hits in ALL rows, number of documents with at
 * least one hit]. tf is saturated (see FTS_TF_SATURATION) because 'pcnx' carries
 * no document length to normalise by; idf is the BM25 form clamped at 0, so a
 * term present in nearly every document can never drive a score negative.
 * @param {Uint8Array|Buffer|null} blob - value of matchinfo(<table>, 'pcnx')
 * @param {number[]} [columnWeights] - per-column multipliers in declared column
 *   order; missing entries default to 1
 * @returns {number} non-negative relevance score; 0 when the blob is unusable
 */
function scoreMatchInfo(blob, columnWeights) {
  if (!blob || typeof blob.length !== 'number' || blob.length < 12) return 0;
  const buf = Buffer.from(blob);
  const u32 = (i) => buf.readUInt32LE(i * 4);
  const phrases = u32(0);
  const columns = u32(1);
  const totalRows = u32(2);
  if (!phrases || !columns) return 0;
  let score = 0;
  for (let p = 0; p < phrases; p++) {
    for (let c = 0; c < columns; c++) {
      const base = 3 + 3 * (p * columns + c);
      // Truncated blob: return what was scored rather than read past the end.
      if ((base + 3) * 4 > buf.length) return score;
      const hitsThisRow = u32(base);
      if (!hitsThisRow) continue;
      const weight = (columnWeights && columnWeights[c] !== undefined) ? columnWeights[c] : 1;
      if (weight === 0) continue;
      const docsWithHits = u32(base + 2);
      const tf = hitsThisRow / (hitsThisRow + FTS_TF_SATURATION);
      const idf = Math.max(0, Math.log((totalRows - docsWithHits + 0.5) / (docsWithHits + 0.5)));
      score += weight * tf * idf;
    }
  }
  return score;
}

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
    // Count of async save()s that have been SCHEDULED but not yet COMPLETED their
    // durable disk write. A boolean here is unsafe: with two rapid saves the chain
    // is [writeA → clear → writeB → clear], leaving a window where the flag reads
    // "clean" while writeB is still pending — a hard process.exit() in that window
    // would make the exit guard skip saveSync() and lose the last batch (the exact
    // data loss this guard exists to prevent). A counter has no such gap: it only
    // returns to 0 once EVERY scheduled save has completed. saveSync() always
    // exports the current in-memory DB, so over-flushing on exit is harmless — we
    // deliberately bias toward flushing.
    this._pendingSaves = 0;
    this._exitGuardInstalled = false;
  }

  _installExitGuard() {
    if (this._exitGuardInstalled) return;
    this._exitGuardInstalled = true;
    // 'exit' handlers can only run synchronous code — saveSync() fits exactly.
    process.once('exit', () => {
      if (this._db && this._pendingSaves > 0) this.saveSync();
    });
  }

  _ensureDir() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Idempotently add a column to an existing table (lightweight migration).
   * SQLite has no "ADD COLUMN IF NOT EXISTS", so we run the ALTER and swallow
   * only the "duplicate column name" error — which simply means the column is
   * already present (the table was created with it, or a prior run added it).
   * Any other error is re-thrown so genuine schema problems surface loudly.
   * @param {string} table
   * @param {string} column
   * @param {string} typeDecl - e.g. 'TEXT', 'INTEGER DEFAULT 0'
   */
  _addColumnIfMissing(table, column, typeDecl) {
    try {
      this._db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDecl}`);
    } catch (err) {
      if (!/duplicate column name/i.test(err && err.message)) {
        throw err;
      }
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
        did TEXT,
        signed_message TEXT,
        attestation_payload TEXT,
        timestamp TEXT NOT NULL
      )
    `);

    // UC-22 (audit finding #2): orbital attestations must carry the signer DID
    // and the EXACT canonical message that was signed so verify() can re-check
    // the cryptographic signature instead of trusting status='APPROVED' alone.
    // CREATE TABLE IF NOT EXISTS won't add columns to a database created before
    // this fix, so back-fill them with guarded ALTER TABLE statements. SQLite
    // throws "duplicate column name" when the column already exists — that case
    // is the success path (already migrated), so it is swallowed.
    this._addColumnIfMissing('attestations', 'did', 'TEXT');
    this._addColumnIfMissing('attestations', 'signed_message', 'TEXT');

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

    // FTS-01: traces_search must be keyed on the traces PRIMARY KEY (id), not
    // trace_id. With a trace_id key every new span in a trace DELETEd its
    // siblings' index rows, so only the last span per trace stayed searchable
    // (live DB: 5,082 content-bearing traces, 2,827 index rows, 2,255 = 44.4%
    // unsearchable). CREATE VIRTUAL TABLE IF NOT EXISTS cannot add a column to a
    // database created before this fix, so detect the old signature and rebuild.
    // The index is 100% derivable from `traces`, so the rebuild is lossless.
    const ftsMigration = this._ensureTracesSearchSchema();
    // Never let the rebuild be silent: it DROPS and recreates the index table, and a
    // parity shortfall means rows silently stopped being searchable. Both are reported.
    if (ftsMigration && ftsMigration.migrated && ftsMigration.expected > 0) {
      console.log(`[VectorHub] traces_search migrated to the id-keyed schema; rebuilt ${ftsMigration.indexed}/${ftsMigration.expected} rows`);
    }
    if (ftsMigration && ftsMigration.migrated && ftsMigration.indexed !== ftsMigration.expected) {
      console.warn(`[VectorHub] traces_search parity BROKEN after rebuild: indexed=${ftsMigration.indexed} expected=${ftsMigration.expected}`);
    }

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
   * Create traces_search with the correct (id-keyed) schema, migrating and
   * repopulating an older trace_id-keyed table in place when one exists.
   * Idempotent — the sqlite_master signature check makes a re-run a no-op.
   * `id` is declared notindexed: it is an opaque UUID, contributes no useful
   * search term, and leaving it unindexed keeps MATCH semantics identical to the
   * pre-fix table (content, agent and trace_id all remain searchable).
   * @returns {{migrated: boolean, indexed: number|null, expected: number|null}}
   */
  _ensureTracesSearchSchema() {
    const existing = this.query(
      'SELECT sql FROM sqlite_master WHERE type = ? AND name = ?',
      ['table', 'traces_search']
    );
    const currentSql = existing.length ? String(existing[0].sql || '') : null;
    if (currentSql !== null && /fts4\s*\(\s*id\s*,/i.test(currentSql)) {
      return { migrated: false, indexed: null, expected: null };
    }

    if (currentSql !== null) {
      this._db.run('DROP TABLE traces_search');
    }
    this._db.run(`
      CREATE VIRTUAL TABLE traces_search
      USING fts4(id, trace_id, content, agent, notindexed=id, tokenize=porter)
    `);
    return { migrated: true, ...this.rebuildTracesSearch() };
  }

  /**
   * Rebuild traces_search from the `traces` base table.
   *
   * Explicitly re-runnable and idempotent: every index row is derivable from
   * `traces`, so this clears the index and re-inserts exactly one row per
   * content-bearing trace. Running it twice yields the same counts. This is the
   * backfill that recovers rows lost to the old trace_id-keyed DELETE; no schema
   * migration is required to run it once the schema is id-keyed.
   * @returns {{indexed: number, expected: number}} post-rebuild row counts —
   *   equal when the index is complete
   */
  rebuildTracesSearch() {
    this._db.run('DELETE FROM traces_search');
    this._db.run(
      `INSERT INTO traces_search (id, trace_id, content, agent)
       SELECT id, trace_id, content, agent
       FROM traces
       WHERE content IS NOT NULL AND content <> ?`,
      ['']
    );
    const indexed = this.query('SELECT COUNT(*) AS c FROM traces_search')[0].c;
    const expected = this.query(
      'SELECT COUNT(*) AS c FROM traces WHERE content IS NOT NULL AND content <> ?',
      ['']
    )[0].c;
    return { indexed, expected };
  }

  /**
   * Run an FTS MATCH per term, then return the top `limit` base-table rows ranked
   * by summed tf-idf.
   *
   * One MATCH per term rather than a single OR-joined MATCH: an OR-join returns
   * its rows in docid order, so LIMIT cuts the candidate pool at the OLDEST
   * FTS_RANK_POOL matches. Measured on the 5,082-row live trace index, a query of
   * "celestial" (2,888 matches) plus a unique token could not retrieve the
   * uniquely-matching document AT ALL, because 2,000 older rows filled the pool
   * first — and since traces are append-only, the newest rows are always the
   * first to be dropped. Scored per term the arithmetic is identical (matchinfo
   * sums over phrases either way), but the pool can only be exhausted by a term's
   * OWN document frequency, so a rare, discriminating term never loses.
   * @param {string} baseTable - key of FTS_SEARCH_TABLES
   * @param {string[]} terms - MATCH expressions from buildFtsTerms()
   * @param {number} limit - clamped row limit
   * @returns {Array<Object>} base-table rows, most relevant first
   */
  _rankedFtsSearch(baseTable, terms, limit) {
    const config = FTS_SEARCH_TABLES[baseTable];
    if (!config) {
      throw new Error(`[VectorHub] refusing to search unknown table: ${baseTable}`);
    }
    if (terms.length === 0) return [];

    // id -> { score, order }; `order` is the first-seen position, used as an
    // explicit tiebreak so the ranking never depends on sort stability.
    const scored = new Map();
    for (const term of terms) {
      const rows = this.query(
        `SELECT id, matchinfo(${config.ftsTable}, 'pcnx') AS mi
         FROM ${config.ftsTable}
         WHERE ${config.ftsTable} MATCH ?
         LIMIT ?`,
        [term, FTS_RANK_POOL]
      );
      for (const row of rows) {
        const add = scoreMatchInfo(row.mi, config.columnWeights);
        const prev = scored.get(row.id);
        scored.set(row.id, prev
          ? { score: prev.score + add, order: prev.order }
          : { score: add, order: scored.size });
      }
    }

    const ids = [...scored.entries()]
      .sort((a, b) => (b[1].score - a[1].score) || (a[1].order - b[1].order))
      .slice(0, limit)
      .map(([id]) => id);
    if (ids.length === 0) return [];

    const placeholders = ids.map(() => '?').join(', ');
    const rows = this.query(`SELECT * FROM ${baseTable} WHERE id IN (${placeholders})`, ids);
    const byId = new Map(rows.map(r => [r.id, r]));
    return ids.map(id => byId.get(id)).filter(Boolean);
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
    // Increment when SCHEDULED; decrement only once this specific save has
    // COMPLETED (success or failure). The exit guard fires saveSync() while any
    // scheduled save is still outstanding — see _installExitGuard().
    this._pendingSaves++;
    this._saveChain = this._saveChain.then(() => writeDbDurable(dbPath, buffer))
      .catch((err) => {
        console.warn(`[VectorHub] Failed to save database: ${err.message}`);
      })
      .then(() => { this._pendingSaves--; });
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
      // A sync export captures the full in-memory DB — a superset of anything the
      // outstanding async saves would have written — so the pending work is now
      // durably satisfied. Clearing the counter prevents a redundant second flush.
      this._pendingSaves = 0;
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

    // Update the FTS index if content exists. Keyed on entry.id (the traces
    // PRIMARY KEY) — keying the DELETE on trace_id wiped every sibling span's
    // index row, which is what made 44.4% of trace content unsearchable (FTS-01).
    if (entry.content) {
      this._db.run('DELETE FROM traces_search WHERE id = ?', [entry.id]);
      this._db.run(
        'INSERT INTO traces_search (id, trace_id, content, agent) VALUES (?, ?, ?, ?)',
        [entry.id, entry.trace_id, entry.content, entry.agent]
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
   * Full-text search for traces, ranked by tf-idf.
   *
   * Multi-word queries are ORed across terms and ranked (see _rankedFtsSearch).
   * FTS4 has no built-in ranker, so without the ranking step the result is docid
   * order and mean recall@10 measures 0.0000.
   * @param {string} rawQuery - the user's query text
   * @param {{phrase?: boolean, limit?: number}} [opts]
   *   phrase:true searches for the exact adjacent word sequence (old behaviour);
   *   limit is clamped to [1, 100] and defaults to 10.
   * @returns {Promise<Array<Object>>} trace rows, most relevant first
   * @throws {TypeError} when rawQuery is not a string
   */
  async searchTraces(rawQuery, opts = {}) {
    return this._rankedFtsSearch(
      'traces',
      buildFtsTerms(rawQuery, opts),
      clampFtsLimit(opts.limit)
    );
  }

  /**
   * Full-text search for traces (alias for backward compat).
   * @param {string} rawQuery
   * @param {{phrase?: boolean, limit?: number}} [opts]
   * @returns {Promise<Array<Object>>}
   */
  async searchFTS(rawQuery, opts = {}) {
    return this.searchTraces(rawQuery, opts);
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

  /**
   * Full-text search for knowledge entries, ranked by tf-idf (see searchTraces).
   * @param {string} rawQuery
   * @param {number|{phrase?: boolean, limit?: number}} [limitOrOpts] - a bare
   *   number is still accepted for backward compatibility
   * @returns {Promise<Array<Object>>} knowledge rows, most relevant first
   * @throws {TypeError} when rawQuery is not a string
   */
  async searchKnowledge(rawQuery, limitOrOpts = {}) {
    const opts = (limitOrOpts !== null && typeof limitOrOpts === 'object')
      ? limitOrOpts
      : { limit: limitOrOpts };
    return this._rankedFtsSearch(
      'knowledge',
      buildFtsTerms(rawQuery, opts),
      clampFtsLimit(opts.limit)
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
    if (prop === 'buildFtsTerms') return buildFtsTerms;
    if (!_instance) _instance = new VectorHub();
    return typeof _instance[prop] === 'function'
      ? _instance[prop].bind(_instance)
      : _instance[prop];
  }
});

module.exports = lazyHub;
module.exports.VectorHub = VectorHub;
module.exports.createVectorHub = createVectorHub;
module.exports.buildFtsTerms = buildFtsTerms;
