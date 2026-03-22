/**
 * MindForge v2 SDK — Memory API
 * TypeScript interface to the MindForge knowledge graph.
 */

import * as path from 'path';
import * as os   from 'os';

// Import JS implementations
// @ts-expect-error - JS modules lack declaration files
import * as Store  from '../../bin/memory/knowledge-store';
// @ts-expect-error - JS modules lack declaration files
import * as Loader from '../../bin/memory/session-memory-loader';

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

/**
 * MindForge Knowledge Graph client.
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

  /**
   * Add a new knowledge entry.
   */
  public async remember(entry: Partial<KnowledgeEntry>): Promise<string> {
    return Store.add(entry);
  }

  /**
   * Query the knowledge base.
   */
  public async query(params: QueryParams = {}): Promise<KnowledgeEntry[]> {
    return Store.query(params);
  }

  /**
   * Reinforce an entry (increase confidence).
   */
  public async reinforce(id: string): Promise<void> {
    Store.reinforce(id);
  }

  /**
   * Deprecate an entry.
   */
  public async deprecate(id: string, reason: string, supersededBy?: string): Promise<void> {
    Store.deprecate(id, reason, supersededBy);
  }

  /**
   * Get memory statistics.
   */
  public async getStats(): Promise<MemoryStats> {
    return Store.stats();
  }

  /**
   * Load context for a session.
   */
  public async loadContext(opts: { techStack?: string[], phase?: string, topic?: string }): Promise<SessionContext> {
    const result = Loader.loadForSession(opts);
    return result;
  }
}
