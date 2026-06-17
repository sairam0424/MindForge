/**
 * MindForge MCP Server (stdio).
 *
 * Exposes the MindForge engine — the knowledge graph (MindForgeMemory) and project
 * health/state/audit reads (MindForgeClient) — to Claude Code as MCP tools, so a
 * plugin user gets the framework's memory and governance reads without the npx
 * installer. Thin adapter: it WRAPS the SDK classes (zero reimplementation) and
 * scopes every operation to the user's project via ${CLAUDE_PROJECT_DIR}.
 *
 * Design (see docs/plugin-installation.md):
 *  - projectRoot = CLAUDE_PROJECT_DIR (the user's working dir, where .mindforge/ and
 *    .planning/ live), NOT the ephemeral plugin cache. The MCP server only needs
 *    ${CLAUDE_PLUGIN_DATA} for its own state, which it currently does not use.
 *  - Tool surface: 6 read-only tools + 1 guarded write (mindforge_memory_remember),
 *    annotated honestly (readOnlyHint/destructiveHint) for the third-party-plugin
 *    trust boundary.
 *  - Every tool degrades gracefully when MindForge is not initialized in the project
 *    (returns an actionable message rather than throwing), since a plugin user may
 *    not have run the npx installer or /mindforge:init-project.
 */
'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { MindForgeMemory, type KnowledgeType } from './vendor/memory.js';
import { MindForgeClient } from './vendor/client.js';

// The user's project root. Claude Code sets CLAUDE_PROJECT_DIR for plugin subprocesses;
// fall back to cwd for direct/MCP-Inspector runs.
const PROJECT_ROOT = process.env.CLAUDE_PROJECT_DIR || process.cwd();

const memory = () => new MindForgeMemory(PROJECT_ROOT);
const client = () => new MindForgeClient({ projectRoot: PROJECT_ROOT });

/** Wrap a tool body so any throw becomes an actionable MCP error result, never a crash. */
async function safe<T>(
  label: string,
  fn: () => Promise<T>
): Promise<{ content: Array<{ type: 'text'; text: string }>; structuredContent?: Record<string, unknown>; isError?: boolean }> {
  try {
    const data = await fn();
    return {
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      structuredContent: data as unknown as Record<string, unknown>,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{
        type: 'text',
        text: `MindForge ${label} failed: ${message}\n\nIf MindForge is not set up in this project, run \`npx mindforge-cc@latest --claude --local\` or \`/mindforge:init-project\` first.`,
      }],
      isError: true,
    };
  }
}

const server = new McpServer({ name: 'mindforge', version: '11.4.0' });

/**
 * Tool config + handler types. We register through a single helper whose `config.inputSchema`
 * is a plain ZodRawShape and whose handler receives already-validated args typed from that
 * shape. This funnels every registration through ONE boundary cast on the SDK method, instead
 * of letting registerTool's deeply-generic signature re-instantiate each schema inline (which
 * trips TS2589 "excessively deep" on the 5-6 field tools). Runtime validation is unchanged —
 * the SDK still parses inputSchema before invoking the handler.
 */
type ToolResult = {
  content: Array<{ type: 'text'; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};
type RawShape = Record<string, z.ZodTypeAny>;
interface ToolConfig {
  title: string;
  description: string;
  inputSchema: RawShape;
  annotations?: Record<string, boolean>;
}
function registerTool(
  name: string,
  config: ToolConfig,
  // Args are already validated by the SDK against config.inputSchema before the handler
  // runs, so `any` here is safe and intentional — it gives ergonomic field access without
  // re-triggering the generic inference. Each handler reads only its own declared fields.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<ToolResult>
): void {
  // Single, intentional boundary cast: the SDK's registerTool generic is the source of the
  // TS2589 depth blowup. Casting the method (not our data) sidesteps the inference while the
  // SDK still enforces inputSchema at runtime.
  (server.registerTool as unknown as (
    n: string, c: ToolConfig, h: (a: unknown) => Promise<ToolResult>
  ) => void)(name, config, handler);
}

// ── 1. Project health (read-only) ──────────────────────────────────────────────
registerTool(
  'mindforge_health',
  {
    title: 'MindForge project health',
    description:
      'Run a MindForge health check on the current project: verifies required ' +
      'planning/governance files exist, validates HANDOFF.json, and reports the ' +
      'audit-log size. Returns overallStatus (healthy|warning|error) with details.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async () => safe('health', async () => client().health())
);

// ── 2. Project status (read-only) ───────────────────────────────────────────────
registerTool(
  'mindforge_status',
  {
    title: 'MindForge project status',
    description:
      'Read the current MindForge project status: whether the project is initialized, ' +
      'the raw STATE.md, the HANDOFF.json contents, and the autonomous-run auto-state.json ' +
      'if present. Use to understand where a MindForge project currently stands.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async () => safe('status', async () => {
    const c = client();
    return {
      initialized: c.isInitialised(),
      databaseInitialized: c.isDatabaseInitialized(),
      state: c.readState(),
      handoff: c.readHandoff(),
      autoState: c.readAutoState(),
    };
  })
);

// ── 3. Memory query (read-only) ─────────────────────────────────────────────────
const KNOWLEDGE_TYPES = [
  'architectural_decision', 'code_pattern', 'bug_pattern',
  'team_preference', 'domain_knowledge',
] as const;

// Schemas are extracted to `const … satisfies ZodRawShape` so TypeScript resolves each
// shape's type ONCE here, instead of re-instantiating it inside the SDK's deeply-generic
// registerTool signature (which otherwise hits TS2589 "excessively deep" on the larger
// shapes). Runtime validation is unchanged — registerTool still validates against these.
const memoryQuerySchema = {
  topic: z.string().optional().describe('Free-text topic to match against entries'),
  tags: z.array(z.string()).optional().describe('Tags to match (boosts ranking)'),
  type: z.enum(KNOWLEDGE_TYPES).optional().describe('Restrict to one knowledge type'),
  minConfidence: z.number().min(0).max(1).optional().describe('Minimum confidence (0-1, default 0.3)'),
  limit: z.number().int().positive().max(100).optional().describe('Max results (default 20)'),
  includeGlobal: z.boolean().optional().describe('Include the cross-project global knowledge base'),
};

registerTool(
  'mindforge_memory_query',
  {
    title: 'Query MindForge knowledge base',
    description:
      'Search the MindForge knowledge graph (architectural decisions, code/bug patterns, ' +
      'team preferences, domain knowledge) by topic text, tags, and type. Results are ' +
      'relevance-ranked. Use to recall prior decisions and patterns for the current project.',
    inputSchema: memoryQuerySchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async (args) => safe('memory_query', async () => {
    const results = await memory().query({
      topic: args.topic,
      tags: args.tags,
      type: args.type as KnowledgeType | undefined,
      minConfidence: args.minConfidence,
      limit: args.limit,
      includeGlobal: args.includeGlobal,
    });
    return { count: results.length, entries: results };
  })
);

// ── 4. Memory + graph stats (read-only) ─────────────────────────────────────────
registerTool(
  'mindforge_memory_stats',
  {
    title: 'MindForge memory statistics',
    description:
      'Report statistics for the MindForge knowledge graph: total/active/deprecated ' +
      'entries, breakdown by type, average confidence, plus graph metrics (nodes, edges, ' +
      'edges by type, orphan ratio). Use to gauge how much project memory exists.',
    inputSchema: {},
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async () => safe('memory_stats', async () => {
    const m = memory();
    return { knowledge: await m.getStats(), graph: await m.getGraphStats() };
  })
);

// ── 5. Find related knowledge (read-only) ───────────────────────────────────────
registerTool(
  'mindforge_memory_find_related',
  {
    title: 'Find related MindForge knowledge',
    description:
      'Given a free-text query, find related knowledge entries via keyword scoring plus ' +
      'graph traversal (multi-hop). Returns ranked entry ids with relevance scores. Use to ' +
      'surface connected decisions/patterns for a task description.',
    inputSchema: {
      query: z.string().min(1).describe('The task or topic to find related knowledge for'),
      maxHops: z.number().int().min(0).max(5).optional().describe('Graph traversal depth (default 2)'),
      topK: z.number().int().positive().max(50).optional().describe('Max results (default 10)'),
    },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async (args) => safe('memory_find_related', async () => {
    const results = await memory().findRelated(args.query, { maxHops: args.maxHops, topK: args.topK });
    return { count: results.length, related: results };
  })
);

// ── 6. Audit log (read-only) ────────────────────────────────────────────────────
const auditLogSchema = {
  event: z.string().optional().describe('Filter by event type (e.g. task_completed, security_finding)'),
  phase: z.number().int().optional().describe('Filter by phase number'),
  limit: z.number().int().positive().max(500).optional().describe('Max entries to return (default 50, newest last)'),
};

registerTool(
  'mindforge_audit_log',
  {
    title: 'Read MindForge audit log',
    description:
      'Read entries from the MindForge audit log (.planning/AUDIT.jsonl), optionally ' +
      'filtered by event type or phase. Use to review what the framework has recorded ' +
      'for this project (task completions, security findings, decisions).',
    inputSchema: auditLogSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  },
  async (args) => safe('audit_log', async () => {
    const all = client().readAuditLog({ event: args.event, phase: args.phase });
    const limit = args.limit ?? 50;
    const entries = all.slice(-limit);
    return { total: all.length, returned: entries.length, entries };
  })
);

// ── 7. Remember (guarded write) ─────────────────────────────────────────────────
registerTool(
  'mindforge_memory_remember',
  {
    title: 'Store a MindForge knowledge entry',
    description:
      'Persist a new knowledge entry (decision, pattern, preference, or domain note) into ' +
      'the project knowledge graph so future sessions can recall it. Append-only and ' +
      'non-destructive — it never overwrites or deletes existing entries. Returns the new entry id.',
    inputSchema: {
      type: z.enum(KNOWLEDGE_TYPES).describe('The kind of knowledge being stored'),
      topic: z.string().min(1).describe('Short topic/title (truncated to 80 chars)'),
      content: z.string().min(1).describe('The knowledge content to remember'),
      confidence: z.number().min(0).max(1).optional().describe('Confidence 0-1 (default 0.7)'),
      tags: z.array(z.string()).optional().describe('Tags for later retrieval'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  },
  async (args) => safe('memory_remember', async () => {
    const id = await memory().remember({
      type: args.type as KnowledgeType,
      topic: args.topic,
      content: args.content,
      confidence: args.confidence,
      tags: args.tags,
      source: 'mcp',
    });
    return { id, stored: true };
  })
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr is safe for diagnostics (stdout is the MCP transport).
  process.stderr.write(`[mindforge-mcp] ready — projectRoot=${PROJECT_ROOT}\n`);
}

main().catch((err) => {
  process.stderr.write(`[mindforge-mcp] fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
