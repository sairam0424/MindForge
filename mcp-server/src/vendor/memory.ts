/* eslint-disable */
// @generated — VENDORED from sdk/src by scripts/vendor-sdk-into-mcp.js. DO NOT EDIT.
// Edit the canonical file under sdk/src and re-run the vendoring script.

/**
 * MindForge v2.4.0 SDK — Memory API (RAG 2.0)
 * Self-contained TypeScript interface to the MindForge Knowledge Graph.
 *
 * This module is fully standalone — it reads/writes JSONL files directly
 * without depending on bin/ internal modules.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

// ── Type Definitions ──────────────────────────────────────────────────────────

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

// ── Internal Helpers ──────────────────────────────────────────────────────────

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function readJsonlFile<T extends { id: string }>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];

  const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
  const byId = new Map<string, T>();

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as T;
      byId.set(entry.id, entry); // Last write wins (append-only pattern)
    } catch {
      // Skip malformed lines — never crash on corrupt JSONL
    }
  }

  return [...byId.values()];
}

function appendJsonl(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, JSON.stringify(data) + '\n');
}

function generateId(): string {
  return crypto.randomUUID();
}

function computeChecksum(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data, Object.keys(data).sort());
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function scoreRelevance(
  entry: KnowledgeEntry,
  tags: string[],
  topic: string
): number {
  let score = entry.confidence;

  // Tag overlap
  const entryTags = entry.tags || [];
  const tagOverlap = tags.filter(t =>
    entryTags.some(et => et.toLowerCase() === t.toLowerCase())
  ).length;
  score += tagOverlap * 0.2;

  // Topic text match
  if (topic) {
    const topicWords = topic.toLowerCase().split(/\s+/);
    const entryText = `${entry.topic} ${entry.content}`.toLowerCase();
    const wordMatches = topicWords.filter(
      w => w.length > 3 && entryText.includes(w)
    ).length;
    score += (wordMatches / Math.max(topicWords.length, 1)) * 0.3;
  }

  // Recency boost
  if (entry.last_referenced) {
    const daysSince =
      (Date.now() - new Date(entry.last_referenced).getTime()) / 86_400_000;
    if (daysSince < 30) score += 0.1 * (1 - daysSince / 30);
  }

  // Penalty for zero references
  if (entry.times_referenced === 0) score *= 0.9;

  return score;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_SHADOW_CHARS = 8000;
const MAX_SHADOW_ITEMS = 5;
const MIN_SHADOW_SCORE = 0.35;
const DECAY_RATE = 0.10;
const DECAY_THRESHOLD_DAYS = 30;

// ── Main Class ────────────────────────────────────────────────────────────────

/**
 * MindForge Knowledge Graph client (RAG 2.0).
 */
export class MindForgeMemory {
  private readonly memoryDir: string;
  private readonly kbPath: string;
  private readonly globalPath: string;
  private readonly edgesPath: string;

  constructor(private readonly projectRoot: string = process.cwd()) {
    this.memoryDir = path.join(projectRoot, '.mindforge', 'memory');
    this.kbPath = path.join(this.memoryDir, 'knowledge-base.jsonl');
    this.globalPath = path.join(
      os.homedir(),
      '.mindforge',
      'global-knowledge-base.jsonl'
    );
    this.edgesPath = path.join(this.memoryDir, 'graph-edges.jsonl');
  }

  // ── Knowledge Store Operations ───────────────────────────────────────────

  /** Add a new knowledge entry. */
  public async remember(entry: Partial<KnowledgeEntry>): Promise<string> {
    if (!entry.type) throw new Error('Knowledge entry requires a "type" field');
    if (!entry.topic) throw new Error('Knowledge entry requires a "topic" field');
    if (!entry.content) throw new Error('Knowledge entry requires a "content" field');

    const id = entry.id || generateId();
    const now = new Date().toISOString();

    const full: KnowledgeEntry = {
      id,
      timestamp: now,
      type: entry.type,
      topic: (entry.topic || '').slice(0, 80),
      content: entry.content,
      source: entry.source || 'sdk',
      project: entry.project || path.basename(this.projectRoot),
      confidence: Math.min(1.0, Math.max(0.0, entry.confidence ?? 0.7)),
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      linked_adrs: Array.isArray(entry.linked_adrs) ? entry.linked_adrs : [],
      times_referenced: entry.times_referenced || 0,
      last_referenced: entry.last_referenced || null,
      deprecated: false,
      deprecated_by: null,
      ...(entry.decision && { decision: entry.decision }),
      ...(entry.rationale && { rationale: entry.rationale }),
      ...(entry.root_cause && { root_cause: entry.root_cause }),
      ...(entry.fix && { fix: entry.fix }),
      ...(entry.preference && { preference: entry.preference }),
      ...(entry.strength && { strength: entry.strength }),
      ...(entry.bug_category && { bug_category: entry.bug_category }),
      ...(entry.domain && { domain: entry.domain }),
      ...(entry.tech_stack && { tech_stack: entry.tech_stack }),
    };

    appendJsonl(this.kbPath, full);
    return id;
  }

  /** Query the knowledge base. */
  public async query(params: QueryParams = {}): Promise<KnowledgeEntry[]> {
    const {
      tags = [],
      topic = '',
      type,
      minConfidence = 0.3,
      limit = 20,
      includeGlobal = false,
      includeDeprecated = false,
      project,
    } = params;

    let entries = this.readAllEntries(includeGlobal);

    if (!includeDeprecated) entries = entries.filter(e => !e.deprecated);
    if (type) entries = entries.filter(e => e.type === type);
    if (project) entries = entries.filter(e => !e.project || e.project === project);
    entries = entries.filter(e => e.confidence >= minConfidence);

    const scored = entries.map(e => ({
      entry: e,
      score: scoreRelevance(e, tags, topic),
    }));

    return scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.entry);
  }

  /** Reinforce an entry (increase confidence). */
  public async reinforce(id: string): Promise<void> {
    const entries = this.readAllEntries(false);
    const entry = entries.find(e => e.id === id && !e.deprecated);
    if (!entry) return;

    const reinforced: KnowledgeEntry = {
      ...entry,
      confidence: Math.min(1.0, entry.confidence + 0.05),
      times_referenced: entry.times_referenced + 1,
      last_referenced: new Date().toISOString(),
    };

    appendJsonl(this.kbPath, reinforced);
  }

  /** Deprecate an entry. */
  public async deprecate(
    id: string,
    reason: string,
    supersededBy?: string
  ): Promise<void> {
    const entries = this.readAllEntries(false);
    const entry = entries.find(e => e.id === id);
    if (!entry) throw new Error(`Knowledge entry not found: ${id}`);

    const deprecated: KnowledgeEntry = {
      ...entry,
      deprecated: true,
      deprecated_by: supersededBy || null,
    };

    appendJsonl(this.kbPath, deprecated);
  }

  /** Get memory statistics. */
  public async getStats(): Promise<MemoryStats> {
    const all = this.readAllEntries(false);
    const active = all.filter(e => !e.deprecated);
    const byType: Record<string, number> = {};
    for (const e of active) {
      byType[e.type] = (byType[e.type] || 0) + 1;
    }
    return {
      total_entries: all.length,
      active_entries: active.length,
      deprecated_entries: all.length - active.length,
      by_type: byType,
      avg_confidence: active.length
        ? active.reduce((s, e) => s + e.confidence, 0) / active.length
        : 0,
    };
  }

  /** Load context for a session. */
  public async loadContext(opts: {
    techStack?: string[];
    phase?: string;
    topic?: string;
  }): Promise<SessionContext> {
    const { techStack = [], phase = '', topic = '' } = opts;
    const entries = this.readAllEntries(true).filter(
      e => !e.deprecated && e.confidence >= 0.3
    );

    const preferences = entries.filter(e => e.type === 'team_preference');
    const decisions = entries.filter(e => e.type === 'architectural_decision');
    const bugPatterns = entries.filter(e => e.type === 'bug_pattern');
    const codePatterns = entries.filter(e => e.type === 'code_pattern');
    const domain = entries.filter(e => e.type === 'domain_knowledge');

    // Apply relevance filtering if topic or techStack given
    const filterByRelevance = (list: KnowledgeEntry[]): KnowledgeEntry[] => {
      if (!topic && techStack.length === 0) return list.slice(0, 5);
      return list
        .map(e => ({ entry: e, score: scoreRelevance(e, techStack, topic || phase) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map(s => s.entry);
    };

    const result = {
      preferences: filterByRelevance(preferences),
      decisions: filterByRelevance(decisions),
      bugPatterns: filterByRelevance(bugPatterns),
      codePatterns: filterByRelevance(codePatterns),
      domain: filterByRelevance(domain),
    };

    const allLoaded = [
      ...result.preferences,
      ...result.decisions,
      ...result.bugPatterns,
      ...result.codePatterns,
      ...result.domain,
    ];

    const formatted = this.formatSessionContext(result);

    return {
      ...result,
      count: allLoaded.length,
      formatted,
    };
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
    const id = generateId();
    const now = new Date().toISOString();

    const edgeData: Omit<GraphEdge, 'checksum'> & { checksum?: string } = {
      id,
      sourceId: edge.sourceId,
      targetId: edge.targetId,
      type: edge.type,
      weight: edge.weight ?? 1.0,
      reason: edge.reason || '',
      metadata: {},
      created_at: now,
      last_traversed: null,
      traversal_count: 0,
      deprecated: false,
    };

    const checksum = computeChecksum(edgeData as Record<string, unknown>);
    const fullEdge: GraphEdge = { ...edgeData, checksum } as GraphEdge;

    appendJsonl(this.edgesPath, fullEdge);
    return id;
  }

  /** Get all edges for a specific node. */
  public async getEdges(
    nodeId: string,
    opts?: {
      direction?: 'outgoing' | 'incoming' | 'both';
      edgeTypes?: EdgeType[];
    }
  ): Promise<GraphEdge[]> {
    const edges = this.readAllEdges();
    const direction = opts?.direction || 'both';
    const edgeTypes = opts?.edgeTypes;

    let filtered = edges.filter(e => !e.deprecated);

    if (direction === 'outgoing') {
      filtered = filtered.filter(e => e.sourceId === nodeId);
    } else if (direction === 'incoming') {
      filtered = filtered.filter(e => e.targetId === nodeId);
    } else {
      filtered = filtered.filter(
        e => e.sourceId === nodeId || e.targetId === nodeId
      );
    }

    if (edgeTypes && edgeTypes.length > 0) {
      filtered = filtered.filter(e => edgeTypes.includes(e.type));
    }

    return filtered;
  }

  /** BFS traversal from a starting node. */
  public async traverse(
    startId: string,
    maxDepth?: number,
    opts?: {
      edgeTypes?: EdgeType[];
      minWeight?: number;
    }
  ): Promise<TraversalResult[]> {
    const edges = this.readAllEdges().filter(e => !e.deprecated);
    const depth = maxDepth ?? 3;
    const edgeTypes = opts?.edgeTypes;
    const minWeight = opts?.minWeight ?? 0;

    // Build adjacency map
    const adjacency = new Map<string, Array<{ target: string; edge: GraphEdge }>>();
    for (const edge of edges) {
      if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
      if (edge.weight < minWeight) continue;

      if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
      adjacency.get(edge.sourceId)!.push({ target: edge.targetId, edge });

      // For undirected traversal of RELATED_TO edges
      if (edge.type === 'RELATED_TO') {
        if (!adjacency.has(edge.targetId)) adjacency.set(edge.targetId, []);
        adjacency.get(edge.targetId)!.push({ target: edge.sourceId, edge });
      }
    }

    // BFS
    const results: TraversalResult[] = [];
    const visited = new Set<string>([startId]);
    const queue: Array<{ id: string; depth: number; path: string[] }> = [
      { id: startId, depth: 0, path: [startId] },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth > 0) {
        results.push({
          id: current.id,
          depth: current.depth,
          path: current.path,
        });
      }

      if (current.depth >= depth) continue;

      const neighbors = adjacency.get(current.id) || [];
      for (const { target } of neighbors) {
        if (!visited.has(target)) {
          visited.add(target);
          queue.push({
            id: target,
            depth: current.depth + 1,
            path: [...current.path, target],
          });
        }
      }
    }

    return results;
  }

  /** Find related knowledge via keyword-based scoring + graph traversal. */
  public async findRelated(
    queryText: string,
    opts?: {
      maxHops?: number;
      topK?: number;
    }
  ): Promise<Array<{ id: string; score: number; source: string }>> {
    const maxHops = opts?.maxHops ?? 2;
    const topK = opts?.topK ?? 10;

    const entries = this.readAllEntries(true).filter(
      e => !e.deprecated && e.confidence >= 0.3
    );

    // Keyword-based scoring (TF-IDF approximation)
    const queryWords = queryText
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);

    const scored = entries.map(entry => {
      const text = `${entry.topic} ${entry.content} ${(entry.tags || []).join(' ')}`.toLowerCase();
      const matches = queryWords.filter(w => text.includes(w)).length;
      const score = matches / Math.max(queryWords.length, 1);
      return { id: entry.id, score, source: entry.source };
    });

    // Get top seed results
    const seeds = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Expand via graph traversal
    const expanded = new Map<string, { score: number; source: string }>();
    for (const seed of seeds) {
      expanded.set(seed.id, { score: seed.score, source: seed.source });
    }

    if (maxHops > 0 && seeds.length > 0) {
      for (const seed of seeds) {
        const traversed = await this.traverse(seed.id, maxHops);
        for (const node of traversed) {
          const existing = expanded.get(node.id);
          const decayedScore = seed.score * Math.pow(0.5, node.depth);
          if (!existing || existing.score < decayedScore) {
            const entry = entries.find(e => e.id === node.id);
            expanded.set(node.id, {
              score: decayedScore,
              source: entry?.source || 'graph',
            });
          }
        }
      }
    }

    return [...expanded.entries()]
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  /** Generate auto-shadow context for a task. */
  public async autoShadow(opts: {
    taskDescription: string;
    excludeIds?: string[];
    techStack?: string[];
  }): Promise<ShadowContext> {
    const { taskDescription, excludeIds = [], techStack = [] } = opts;

    if (!taskDescription || taskDescription.length < 10) {
      return { formatted: '', items: [], count: 0, budgetUsed: 0 };
    }

    const entries = this.readAllEntries(true).filter(
      e => !e.deprecated && e.confidence >= 0.3 && !excludeIds.includes(e.id)
    );

    // Score entries against task description
    const queryWords = taskDescription
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 3);

    const scored: ShadowItem[] = entries
      .map(entry => {
        const text = `${entry.topic} ${entry.content} ${(entry.tags || []).join(' ')}`.toLowerCase();
        let score = 0;

        // Keyword matching
        const matches = queryWords.filter(w => text.includes(w)).length;
        score += (matches / Math.max(queryWords.length, 1)) * 0.6;

        // Tech stack boost
        if (techStack.length > 0 && entry.tech_stack) {
          const stackOverlap = techStack.filter(t =>
            entry.tech_stack!.some(
              et => et.toLowerCase() === t.toLowerCase()
            )
          ).length;
          score += (stackOverlap / techStack.length) * 0.2;
        }

        // Confidence factor
        score += entry.confidence * 0.2;

        return {
          id: entry.id,
          type: entry.type,
          topic: entry.topic,
          content: entry.content,
          confidence: entry.confidence,
          score,
          source: entry.source,
          tags: entry.tags,
        };
      })
      .filter(item => item.score >= MIN_SHADOW_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SHADOW_ITEMS);

    // Format within budget
    let budgetUsed = 0;
    const items: ShadowItem[] = [];
    const lines: string[] = ['### Auto-Shadow Context'];

    for (const item of scored) {
      const line = `- [${item.type}] ${item.topic}: ${item.content.slice(0, 150)}`;
      if (budgetUsed + line.length > MAX_SHADOW_CHARS) break;
      lines.push(line);
      items.push(item);
      budgetUsed += line.length;
    }

    return {
      formatted: items.length > 0 ? lines.join('\n') : '',
      items,
      count: items.length,
      budgetUsed,
    };
  }

  /** Get graph statistics. */
  public async getGraphStats(): Promise<GraphStats> {
    const edges = this.readAllEdges().filter(e => !e.deprecated);
    const entries = this.readAllEntries(false);

    const nodeIds = new Set(entries.map(e => e.id));
    const connectedNodes = new Set<string>();
    const edgesByType: Record<string, number> = {};

    let totalWeight = 0;
    for (const edge of edges) {
      connectedNodes.add(edge.sourceId);
      connectedNodes.add(edge.targetId);
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
      totalWeight += edge.weight;
    }

    return {
      total_nodes: nodeIds.size,
      total_edges: edges.length,
      edges_by_type: edgesByType,
      orphan_nodes: nodeIds.size - connectedNodes.size,
      avg_weight: edges.length > 0 ? totalWeight / edges.length : 0,
      connected_ratio:
        nodeIds.size > 0 ? connectedNodes.size / nodeIds.size : 0,
    };
  }

  /** Apply weight decay to stale edges. */
  public async decayEdges(): Promise<{ decayed: number; pruned: number }> {
    const edges = this.readAllEdges();
    const now = Date.now();
    let decayed = 0;
    let pruned = 0;

    for (const edge of edges) {
      if (edge.deprecated) continue;

      const lastActivity = edge.last_traversed || edge.created_at;
      const daysSince =
        (now - new Date(lastActivity).getTime()) / 86_400_000;

      if (daysSince > DECAY_THRESHOLD_DAYS) {
        const newWeight = edge.weight * (1 - DECAY_RATE);
        if (newWeight < 0.1) {
          // Prune by deprecating
          const prunedEdge: GraphEdge = { ...edge, deprecated: true };
          appendJsonl(this.edgesPath, prunedEdge);
          pruned++;
        } else {
          const decayedEdge: GraphEdge = { ...edge, weight: newWeight };
          appendJsonl(this.edgesPath, decayedEdge);
          decayed++;
        }
      }
    }

    return { decayed, pruned };
  }

  /** Detect cycles in directed edge types. */
  public async detectCycles(): Promise<string[][]> {
    const edges = this.readAllEdges().filter(
      e => !e.deprecated && e.type !== 'RELATED_TO'
    );

    // Build directed adjacency
    const adjacency = new Map<string, string[]>();
    const allNodes = new Set<string>();

    for (const edge of edges) {
      allNodes.add(edge.sourceId);
      allNodes.add(edge.targetId);
      if (!adjacency.has(edge.sourceId)) adjacency.set(edge.sourceId, []);
      adjacency.get(edge.sourceId)!.push(edge.targetId);
    }

    // DFS-based cycle detection
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (node: string, pathArr: string[]): void => {
      visited.add(node);
      inStack.add(node);

      const neighbors = adjacency.get(node) || [];
      for (const neighbor of neighbors) {
        if (inStack.has(neighbor)) {
          // Found a cycle
          const cycleStart = pathArr.indexOf(neighbor);
          if (cycleStart >= 0) {
            cycles.push([...pathArr.slice(cycleStart), neighbor]);
          }
        } else if (!visited.has(neighbor)) {
          dfs(neighbor, [...pathArr, neighbor]);
        }
      }

      inStack.delete(node);
    };

    for (const node of allNodes) {
      if (!visited.has(node)) {
        dfs(node, [node]);
      }
    }

    return cycles;
  }

  /** Verify SHA-256 integrity of all edges. */
  public async verifyIntegrity(): Promise<{
    valid: number;
    corrupted: string[];
  }> {
    const edges = this.readAllEdges();
    let valid = 0;
    const corrupted: string[] = [];

    for (const edge of edges) {
      const { checksum, ...rest } = edge;
      const expected = computeChecksum(rest as unknown as Record<string, unknown>);
      if (expected === checksum) {
        valid++;
      } else {
        corrupted.push(edge.id);
      }
    }

    return { valid, corrupted };
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private readAllEntries(includeGlobal: boolean): KnowledgeEntry[] {
    let entries = readJsonlFile<KnowledgeEntry>(this.kbPath);
    if (includeGlobal && fs.existsSync(this.globalPath)) {
      const globalEntries = readJsonlFile<KnowledgeEntry>(this.globalPath).map(
        e => ({ ...e, global: true })
      );
      entries = [...entries, ...globalEntries];
    }
    return entries;
  }

  private readAllEdges(): GraphEdge[] {
    return readJsonlFile<GraphEdge>(this.edgesPath);
  }

  private formatSessionContext(ctx: {
    preferences: KnowledgeEntry[];
    decisions: KnowledgeEntry[];
    bugPatterns: KnowledgeEntry[];
    codePatterns: KnowledgeEntry[];
    domain: KnowledgeEntry[];
  }): string {
    const sections: string[] = [];

    if (ctx.preferences.length > 0) {
      sections.push('### Team Preferences');
      for (const e of ctx.preferences) {
        sections.push(
          `- [${(e.confidence * 100).toFixed(0)}% confidence] ${e.topic}: ${e.content.slice(0, 200)}`
        );
      }
    }

    if (ctx.decisions.length > 0) {
      sections.push('\n### Architectural Decisions');
      for (const e of ctx.decisions) {
        sections.push(`- ${e.topic}: ${e.content.slice(0, 200)}`);
      }
    }

    if (ctx.bugPatterns.length > 0) {
      sections.push('\n### Known Bug Patterns');
      for (const e of ctx.bugPatterns) {
        sections.push(`- ${e.topic}: ${e.content.slice(0, 200)}`);
      }
    }

    if (ctx.codePatterns.length > 0) {
      sections.push('\n### Code Patterns');
      for (const e of ctx.codePatterns) {
        sections.push(`- ${e.topic}: ${e.content.slice(0, 200)}`);
      }
    }

    if (ctx.domain.length > 0) {
      sections.push('\n### Domain Knowledge');
      for (const e of ctx.domain) {
        sections.push(`- ${e.topic}: ${e.content.slice(0, 200)}`);
      }
    }

    return sections.join('\n');
  }
}
