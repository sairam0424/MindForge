const Database = require('better-sqlite3');
const { Kysely, SqliteDialect, sql } = require('kysely');
const path = require('path');
const fs = require('fs');

/**
 * MindForge v9 VectorHub
 * Unified Persistence Layer — traces, remediations, skills, knowledge, and graph edges.
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

    // v9 Pillar XXVI: Unified Knowledge table (migrated from JSONL stores)
    await this.db.schema
      .createTable('knowledge')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('type', 'text', (col) => col.notNull())
      .addColumn('content', 'text', (col) => col.notNull())
      .addColumn('tags', 'text')
      .addColumn('source', 'text')
      .addColumn('confidence', 'real', (col) => col.defaultTo(1.0))
      .addColumn('created_at', 'text', (col) => col.notNull())
      .addColumn('updated_at', 'text')
      .addColumn('metadata', 'text')
      .execute();

    // v9 Pillar XXVI: Graph edges table (migrated from knowledge-graph JSONL)
    await this.db.schema
      .createTable('graph_edges')
      .ifNotExists()
      .addColumn('id', 'text', (col) => col.primaryKey())
      .addColumn('source_id', 'text', (col) => col.notNull())
      .addColumn('target_id', 'text', (col) => col.notNull())
      .addColumn('edge_type', 'text', (col) => col.notNull())
      .addColumn('weight', 'real', (col) => col.defaultTo(1.0))
      .addColumn('created_at', 'text', (col) => col.notNull())
      .execute();

    // v9 Pillar XXVII: Migration tracking table
    await this.db.schema
      .createTable('_migrations')
      .ifNotExists()
      .addColumn('id', 'integer', (col) => col.primaryKey())
      .addColumn('name', 'text', (col) => col.notNull())
      .addColumn('applied_at', 'text', (col) => col.notNull())
      .execute();

    // Enable Full-Text Search (FTS5) for traces and knowledge
    await sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS traces_search
      USING fts5(trace_id, content, agent, tokenize='porter');
    `.execute(this.db);

    await sql`
      CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_search
      USING fts5(id, content, tags, tokenize='porter');
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

    await this.db.insertInto('traces')
      .values(entry)
      .onConflict(oc => oc.column('id').doUpdateSet({
        metadata: entry.metadata,
        mesh_node_id: entry.mesh_node_id,
        drift_score: entry.drift_score
      }))
      .execute();
    
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
  // ── v9 Pillar XXVI: Unified Knowledge API ─────────────────────────────────

  async saveKnowledge(entry) {
    const now = new Date().toISOString();
    const record = {
      id: entry.id || `k_${Math.random().toString(36).substr(2, 9)}`,
      type: entry.type || 'insight',
      content: entry.content,
      tags: Array.isArray(entry.tags) ? entry.tags.join(',') : (entry.tags || ''),
      source: entry.source || 'unknown',
      confidence: entry.confidence ?? 1.0,
      created_at: entry.created_at || now,
      updated_at: now,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
    };

    await this.db.insertInto('knowledge')
      .values(record)
      .onConflict(oc => oc.column('id').doUpdateSet({
        content: record.content,
        tags: record.tags,
        confidence: record.confidence,
        updated_at: record.updated_at,
        metadata: record.metadata,
      }))
      .execute();

    await sql`INSERT OR REPLACE INTO knowledge_search (id, content, tags) VALUES (${record.id}, ${record.content}, ${record.tags})`
      .execute(this.db);

    return record.id;
  }

  async searchKnowledge(query, limit = 10) {
    const results = await sql`
      SELECT k.*, ks.rank
      FROM knowledge k
      JOIN knowledge_search ks ON k.id = ks.id
      WHERE knowledge_search MATCH ${query}
      ORDER BY ks.rank
      LIMIT ${limit}
    `.execute(this.db);
    return results.rows;
  }

  async saveEdge(edge) {
    const record = {
      id: edge.id || `e_${Math.random().toString(36).substr(2, 9)}`,
      source_id: edge.source_id,
      target_id: edge.target_id,
      edge_type: edge.edge_type,
      weight: edge.weight ?? 1.0,
      created_at: edge.created_at || new Date().toISOString(),
    };

    await this.db.insertInto('graph_edges')
      .values(record)
      .onConflict(oc => oc.column('id').doNothing())
      .execute();

    return record.id;
  }

  async getEdges(nodeId) {
    const results = await this.db.selectFrom('graph_edges')
      .selectAll()
      .where((eb) => eb.or([
        eb('source_id', '=', nodeId),
        eb('target_id', '=', nodeId),
      ]))
      .execute();
    return results;
  }

  // ── v9 Pillar XXVII: Migration tracking ──────────────────────────────────

  async getAppliedMigrations() {
    const rows = await this.db.selectFrom('_migrations').selectAll().execute();
    return rows.map(r => r.name);
  }

  async recordMigration(name) {
    await this.db.insertInto('_migrations')
      .values({ name, applied_at: new Date().toISOString() })
      .execute();
  }
}

module.exports = new VectorHub();
module.exports.VectorHub = VectorHub;
