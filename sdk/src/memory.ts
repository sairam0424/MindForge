/**
 * MindForge v2.4.0 SDK — Memory API (RAG 2.0)
 * TypeScript interface to the MindForge Knowledge Graph.
 */

import * as path from 'path';
import * as os   from 'os';

// Import JS implementations
// @ts-expect-error - JS modules lack declaration files
import * as Store  from '../../bin/memory/knowledge-store';
// @ts-expect-error - JS modules lack declaration files
import * as Loader from '../../bin/memory/session-memory-loader';
// @ts-expect-error - JS modules lack declaration files
import * as Graph  from '../../bin/memory/knowledge-graph';
// @ts-expect-error - JS modules lack declaration files
import * as Shadow from '../../bin/memory/auto-shadow';
// @ts-expect-error - JS modules lack declaration files
import * as Embedder from '../../bin/memory/embedding-engine';

export type KnowledgeType =
  | 'architectural_decision'
  | 'code_pattern'
  | 'bug_pattern'
  | 'team_preference'
  | 'domain_knowledge';

export interface KnowledgeEntry {
  id:               string;
  timestamp:        string;
  type:             KnowledgeType;
  topic:            string;
  content:          string;
  source:           string;
  project:          string;
  confidence:       number;
  tags:             string[];
  linked_adrs:      string[];
  times_referenced: number;
  last_referenced:  string | null;
  deprecated:       boolean;
  deprecated_by:    string | null;
  // Type-specific optional fields
  decision?:        string;
  rationale?:       string;
  root_cause?:      string;
  fix?:             string;
  preference?:      string;
  strength?:        'strong' | 'moderate' | 'weak';
  bug_category?:    string;
  domain?:          string;
  tech_stack?:      string[];
  global?:          boolean;
  promoted_at?:     string;
}

export interface QueryParams {
  tags?:           string[];
  topic?:          string;
  type?:           KnowledgeType;
  minConfidence?:  number;
  limit?:          number;
  includeGlobal?:  boolean;
  includeDeprecated?: boolean;
  project?:        string;
}

export interface MemoryStats {
  total_entries:      number;
  active_entries:     number;
  deprecated_entries: number;
  by_type:            Record<string, number>;
  avg_confidence:     number;
}

export interface SessionContext {
  preferences:  KnowledgeEntry[];
  decisions:    KnowledgeEntry[];
  bugPatterns:  KnowledgeEntry[];
  codePatterns: KnowledgeEntry[];
  domain:       KnowledgeEntry[];
  count:        number;
  formatted:    string;
}

export type EdgeType =
  | 'RELATED_TO'
  | 'CAUSED_BY'
  | 'SUPERSEDES'
  | 'DEPENDS_ON'
  | 'INFORMS'
  | 'CONTRADICTS';

export interface GraphEdge {
  id:              string;
  sourceId:        string;
  targetId:        string;
  type:            EdgeType;
  weight:          number;
  reason:          string;
  metadata:        Record<string, unknown>;
  created_at:      string;
  last_traversed:  string | null;
  traversal_count: number;
  deprecated:      boolean;
  checksum:        string;
}

export interface ShadowContext {
  formatted:  string;
  items:      ShadowItem[];
  count:      number;
  budgetUsed: number;
}

export interface ShadowItem {
  id:         string;
  type:       KnowledgeType;
  topic:      string;
  content:    string;
  confidence: number;
  score:      number;
  source:     string;
  tags:       string[];
  edges?:     string;
}

export interface GraphStats {
  total_nodes:     number;
  total_edges:     number;
  edges_by_type:   Record<string, number>;
  orphan_nodes:    number;
  avg_weight:      number;
  connected_ratio: number;
}

export interface TraversalResult {
  id:    string;
  depth: number;
  path:  string[];
}

/**
 * MindForge Knowledge Graph client (RAG 2.0).
 */
export class MindForgeMemory {
  private readonly memoryDir: string;
  private readonly kbPath:    string;
  private readonly globalPath: string;

  constructor(private readonly projectRoot: string = process.cwd()) {
    this.memoryDir  = path.join(projectRoot, '.mindforge', 'memory');
    this.kbPath     = path.join(this.memoryDir, 'knowledge-base.jsonl');
    this.globalPath = path.join(os.homedir(), '.mindforge', 'global-knowledge-base.jsonl');
  }

  // ── Knowledge Store Operations ───────────────────────────────────────────

  /** Add a new knowledge entry. */
  public async remember(entry: Partial<KnowledgeEntry>): Promise<string> {
    return Store.add(entry);
  }

  /** Query the knowledge base. */
  public async query(params: QueryParams = {}): Promise<KnowledgeEntry[]> {
    return Store.query(params);
  }

  /** Reinforce an entry (increase confidence). */
  public async reinforce(id: string): Promise<void> {
    Store.reinforce(id);
  }

  /** Deprecate an entry. */
  public async deprecate(id: string, reason: string, supersededBy?: string): Promise<void> {
    Store.deprecate(id, reason, supersededBy);
  }

  /** Get memory statistics. */
  public async getStats(): Promise<MemoryStats> {
    return Store.stats();
  }

  /** Load context for a session. */
  public async loadContext(opts: { techStack?: string[], phase?: string, topic?: string }): Promise<SessionContext> {
    const result = Loader.loadForSession(opts);
    return result;
  }

  // ── Knowledge Graph Operations (RAG 2.0) ──────────────────────────────

  /** Add a typed edge between two knowledge nodes. */
  public async addEdge(edge: {
    sourceId: string;
    targetId: string;
    type: EdgeType;
    weight?: number;
    reason?: string;
  }): Promise<string> {
    return Graph.addEdge(edge);
  }

  /** Get all edges for a specific node. */
  public async getEdges(nodeId: string, opts?: {
    direction?: 'outgoing' | 'incoming' | 'both';
    edgeTypes?: EdgeType[];
  }): Promise<GraphEdge[]> {
    return Graph.getNodeEdges(nodeId, opts);
  }

  /** BFS traversal from a starting node. */
  public async traverse(startId: string, maxDepth?: number, opts?: {
    edgeTypes?: EdgeType[];
    minWeight?: number;
  }): Promise<TraversalResult[]> {
    return Graph.traverse(startId, maxDepth, opts);
  }

  /** Find related knowledge via hybrid embedding + graph query. */
  public async findRelated(queryText: string, opts?: {
    maxHops?: number;
    topK?: number;
  }): Promise<Array<{ id: string; score: number; source: string }>> {
    const allEntries = Store.readAll(true);
    const { vectors, df, N } = Embedder.buildEmbeddings(allEntries);
    return Graph.findRelated(queryText, vectors, df, N, opts);
  }

  /** Generate auto-shadow context for a task. */
  public async autoShadow(opts: {
    taskDescription: string;
    excludeIds?: string[];
    techStack?: string[];
  }): Promise<ShadowContext> {
    return Shadow.generateShadowContext(opts);
  }

  /** Get graph statistics. */
  public async getGraphStats(): Promise<GraphStats> {
    return Graph.graphStats();
  }

  /** Apply weight decay to stale edges. */
  public async decayEdges(): Promise<{ decayed: number; pruned: number }> {
    return Graph.applyDecay();
  }

  /** Detect cycles in directed edge types. */
  public async detectCycles(): Promise<string[][]> {
    return Graph.detectCycles();
  }

  /** Verify SHA-256 integrity of all edges. */
  public async verifyIntegrity(): Promise<{ valid: number; corrupted: string[] }> {
    return Graph.verifyEdgeIntegrity();
  }
}
