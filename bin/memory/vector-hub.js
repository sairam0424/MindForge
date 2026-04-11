const Database = require('better-sqlite3');
const { Kysely, SqliteDialect, sql } = require('kysely');
const path = require('path');
const fs = require('fs');

/**
 * MindForge v8 VectorHub
 * Unified Persistence Layer for Trace, Remediation, and Skill data.
 */
class VectorHub {
  constructor(dbPath = null) {
    this.dbPath = dbPath || path.join(process.cwd(), '.mindforge', 'celestial.db');
    this._ensureDir();
    
    const nativeDb = new Database(this.dbPath);
    this.db = new Kysely({
      dialect: new SqliteDialect({
        database: nativeDb,
      }),
    });
    
    this.initialized = false;
  }

  _ensureDir() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Initialize tables and FTS5 search.
   */
  async init() {
    if (this.initialized) return;

    // Traces Table
    await this.db.schema
      .createTable('traces')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('trace_id', 'text', (col) => col.notNull())
      .addColumn('span_id', 'text')
      .addColumn('event', 'text', (col) => col.notNull())
      .addColumn('timestamp', 'text', (col) => col.notNull())
      .addColumn('agent', 'text')
      .addColumn('content', 'text')
      .addColumn('metadata', 'text') // JSON blob
      .addColumn('drift_score', 'real')
      .addColumn('mesh_node_id', 'text') // v8 Pillar XVI
      .execute();

    // v8 Migration: ensure mesh_node_id exists on existing table
    try {
      await sql`ALTER TABLE traces ADD COLUMN mesh_node_id TEXT`.execute(this.db);
    } catch (e) {
      // Column might already exist, ignore error.
    }

    // Remediations Table
    await this.db.schema
      .createTable('remediations')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('trace_id', 'text', (col) => col.notNull())
      .addColumn('strategy', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull())
      .addColumn('timestamp', 'text', (col) => col.notNull())
      .addColumn('outcome', 'text')
      .execute();

    // Skills Table
    await this.db.schema
      .createTable('skills')
      .ifNotExists()
      .addColumn('skill_id', 'text', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('description', 'text')
      .addColumn('path', 'text')
      .addColumn('success_rate', 'real', (col) => col.defaultTo(0.0))
      .addColumn('last_verified', 'text')
      .execute();

    // Attestations Table (v8 Pillar XVIII)
    await this.db.schema
      .createTable('attestations')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('request_id', 'text', (col) => col.notNull())
      .addColumn('status', 'text', (col) => col.notNull()) // APPROVED / REJECTED
      .addColumn('attestation_payload', 'text') // Signed blob from hardware enclave
      .addColumn('timestamp', 'text', (col) => col.notNull())
      .execute();

    // Config Table
    await this.db.schema
      .createTable('mesh_config')
      .ifNotExists()
      .addColumn('key', 'text', (col) => col.primaryKey())
      .addColumn('value', 'text')
      .execute();

    // Enable Full-Text Search for traces (FTS5)
    await sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS traces_search 
      USING fts5(trace_id, content, agent, tokenize='porter');
    `.execute(this.db);

    this.initialized = true;
    console.log(`[VectorHub] Initialized SQLite persistence at ${this.dbPath}`);
  }

  async close() {
    await this.db.destroy();
  }

  /**
   * Record a trace event.
   */
  async recordTrace(data) {
    const entry = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      trace_id: data.trace_id,
      span_id: data.span_id || null,
      event: data.event,
      timestamp: data.timestamp || new Date().toISOString(),
      agent: data.agent || null,
      content: data.content || null,
      metadata: data.metadata ? JSON.stringify(data.metadata) : null,
      drift_score: data.drift_score || 0,
      mesh_node_id: data.mesh_node_id || null
    };

    await this.db.insertInto('traces').values(entry).execute();
    
    // Update FTS5 index if content exists
    if (entry.content) {
      await sql`INSERT INTO traces_search (trace_id, content, agent) VALUES (${entry.trace_id}, ${entry.content}, ${entry.agent})`
        .execute(this.db);
    }
    
    return entry.id;
  }

  /**
   * Semantic search for previous traces.
   */
  async searchTraces(query) {
    const results = await sql`
        SELECT t.*, ts.rank 
        FROM traces t
        JOIN traces_search ts ON t.trace_id = ts.trace_id
        WHERE traces_search MATCH ${query}
        ORDER BY ts.rank
        LIMIT 10
      `.execute(this.db);
    return results.rows;
  }
}

module.exports = new VectorHub();
module.exports.VectorHub = VectorHub;
