# MindForge SDK Reference

## Overview

The `@mindforge/sdk` package provides a programmatic TypeScript API for integrating
MindForge into tools, dashboards, and CI pipelines. Import from `@mindforge/sdk`.

```typescript
import {
  MindForgeClient,
  MindForgeEventStream,
  MindForgeMemory,
  commands,
} from '@mindforge/sdk';
```

Current SDK version: `11.8.3`

---

## SDK Exports (v11.8.3)

```javascript
const {
  MindForgeClient,        // Main API client
  MindForgeEventStream,   // SSE event stream
  WebSocketEventStream,   // WebSocket stream  
  commands,               // Command registry
  batch,                  // Batch execution
  MindForgeMemory,        // Memory interface
  VERSION                 // '11.8.3'
} = require('mindforge-sdk');
// or: import { MindForgeClient, VERSION } from 'mindforge-sdk';
```

---

## `MindForgeClient`

Main client for reading project state, health checks, audit logs, and configuration.

### Constructor

```typescript
new MindForgeClient(config?: MindForgeConfig)
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `config.projectRoot` | `string` | `process.cwd()` | Path to the project root |
| `config.apiKey` | `string` | `ANTHROPIC_API_KEY` env var | Claude API key |
| `config.ciMode` | `boolean` | `CI === 'true'` | Disables interactive features |
| `config.outputFormat` | `'json' \| 'text' \| 'github-annotations'` | `'json'` | Output format for events |
| `config.taskTimeoutMs` | `number` | `600000` | Timeout per task in milliseconds |

### Methods

#### `isInitialised(): boolean`

Returns `true` if the project has a `.planning/PROJECT.md` file, indicating MindForge
has been initialized in this repository.

#### `readState(): Record<string, unknown> | null`

Reads `.planning/STATE.md` and returns its raw content. Returns `null` if the file
does not exist.

#### `readHandoff(): Record<string, unknown> | null`

Reads and parses `.planning/HANDOFF.json`. Returns the parsed object or `null` if
the file does not exist or cannot be parsed.

#### `health(): Promise<HealthReport>`

Runs a health check across required files (`STATE.md`, `HANDOFF.json`, `AUDIT.jsonl`,
`CONVENTIONS.md`), validates HANDOFF schema, and reports audit log size. Returns a
`HealthReport` with `overallStatus` of `'healthy'`, `'warning'`, or `'error'`.

#### `readAuditLog(filter?): AuditLogEntry[]`

Reads `.planning/AUDIT.jsonl` and returns parsed entries. Supports optional filtering:

| Filter | Type | Description |
|--------|------|-------------|
| `event` | `string` | Filter by event type |
| `phase` | `number` | Filter by phase number |
| `since` | `Date` | Only entries after this date |

#### `readSessionMetrics(limit?: number): unknown[]`

Reads the last `limit` entries (default: 10) from
`.mindforge/metrics/session-quality.jsonl`.

#### `validateConfig(): { valid: boolean; errors: string[]; warnings: string[] }`

Validates the project's `MINDFORGE.md` configuration file. Returns validation results
with any errors or warnings found.

#### `readAutoState(): Record<string, unknown> | null`

Reads `.planning/auto-state.json` — the persistent state file for the autonomous
wave execution engine (v9 Pillar XXIV). Returns `null` if the file does not exist.

#### `isDatabaseInitialized(): boolean`

Returns `true` if the unified SQLite knowledge database (`celestial.db`) exists at
`.mindforge/celestial.db` (v9 Pillar XXVI).

#### `getDbPath(): string`

Returns the absolute path to the project's `celestial.db` SQLite database file.

#### `importFromBrowser(sessionData: unknown): Promise<void>`

Imports a session snapshot captured from a browser environment into the local session store.

> **[NOT IMPLEMENTED — v11.x]** This method always throws. Planned for a future release. Use `saveSession`/`loadSession` instead. Check `capabilities.importFromBrowser === false` before calling.

#### `resolveRemoteNode(nodeId: string): Promise<unknown>`

Resolves context for a node residing on a remote EIS (Edge Intelligence Shard) instance.

> **[NOT IMPLEMENTED — v11.x]** This method always throws. Planned for a future release. Cross-node context resolution is local-only in v11.x. Planned for v12.x.

---

## `MindForgeMemory`

Client for the Knowledge Graph (RAG 2.0). Manages persistent knowledge entries,
typed graph edges, semantic search, and auto-shadowing.

### Constructor

```typescript
new MindForgeMemory(projectRoot?: string)
```

### Knowledge Store Methods

#### `remember(entry: Partial<KnowledgeEntry>): Promise<string>`

Adds a new knowledge entry to the store. Returns the generated entry ID.

#### `query(params?: QueryParams): Promise<KnowledgeEntry[]>`

Queries the knowledge base with optional filters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `tags` | `string[]` | Filter by tags |
| `topic` | `string` | Filter by topic |
| `type` | `KnowledgeType` | Filter by entry type |
| `minConfidence` | `number` | Minimum confidence threshold |
| `limit` | `number` | Max results |
| `includeGlobal` | `boolean` | Include global knowledge base |
| `includeDeprecated` | `boolean` | Include deprecated entries |
| `project` | `string` | Filter by project name |

#### `reinforce(id: string): Promise<void>`

Increases the confidence score of an existing entry.

#### `deprecate(id: string, reason: string, supersededBy?: string): Promise<void>`

Marks an entry as deprecated with a reason and optional replacement ID.

#### `getStats(): Promise<MemoryStats>`

Returns aggregate statistics: total entries, active/deprecated counts, breakdown by
type, and average confidence.

#### `loadContext(opts): Promise<SessionContext>`

Loads relevant knowledge for a session. Accepts `techStack`, `phase`, and `topic` as
filters. Returns categorized entries (preferences, decisions, bug patterns, code
patterns, domain knowledge) with a pre-formatted string.

### Knowledge Graph Methods

#### `addEdge(edge): Promise<string>`

Adds a typed, weighted edge between two knowledge nodes. Returns the edge ID.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sourceId` | `string` | Yes | Source node ID |
| `targetId` | `string` | Yes | Target node ID |
| `type` | `EdgeType` | Yes | One of: `RELATED_TO`, `CAUSED_BY`, `SUPERSEDES`, `DEPENDS_ON`, `INFORMS`, `CONTRADICTS` |
| `weight` | `number` | No | Edge weight (0-1) |
| `reason` | `string` | No | Why this relationship exists |

#### `getEdges(nodeId: string, opts?): Promise<GraphEdge[]>`

Gets all edges for a node. Options: `direction` (`'outgoing'`, `'incoming'`, `'both'`)
and `edgeTypes` filter array.

#### `traverse(startId: string, maxDepth?: number, opts?): Promise<TraversalResult[]>`

BFS traversal from a starting node. Options: `edgeTypes` and `minWeight` filters.

#### `findRelated(queryText: string, opts?): Promise<Array<{ id, score, source }>>`

Hybrid embedding + graph search. Returns ranked results by relevance score. Options:
`maxHops` and `topK`.

#### `autoShadow(opts): Promise<ShadowContext>`

Generates auto-shadow context for a task description. Retrieves the most relevant
knowledge entries based on semantic similarity and graph proximity.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `taskDescription` | `string` | Yes | What you are working on |
| `excludeIds` | `string[]` | No | Entry IDs to skip |
| `techStack` | `string[]` | No | Relevant technologies |

#### `getGraphStats(): Promise<GraphStats>`

Returns graph-level statistics: total nodes, total edges, edges by type, orphan count,
average weight, and connected ratio.

#### `decayEdges(): Promise<{ decayed: number; pruned: number }>`

Applies time-based weight decay to stale edges and prunes edges below threshold.

#### `detectCycles(): Promise<string[][]>`

Detects cycles in directed edge types. Returns arrays of node IDs forming each cycle.

#### `verifyIntegrity(): Promise<{ valid: number; corrupted: string[] }>`

Verifies SHA-256 checksums of all edges. Returns count of valid edges and IDs of any
corrupted edges.

---

## `MindForgeEventStream`

Localhost-only SSE (Server-Sent Events) server for real-time execution progress.

### Methods

#### `start(port?: number): Promise<void>`

Starts the SSE server bound to `127.0.0.1` on the given port (default: `7337`).
Clients connect at `http://localhost:<port>/events`. Rejects non-localhost connections
with HTTP 403.

#### `watchAuditLog(projectRoot: string): void`

Watches `.planning/AUDIT.jsonl` for new entries and broadcasts each as an
`audit_entry` SSE event to all connected clients.

#### `broadcast(eventType: string, data: unknown): void`

Manually broadcasts a named event to all connected SSE clients.

#### `stop(): void`

Shuts down the HTTP server, closes the audit file watcher, and disconnects all clients.

---

## `commands`

Builder utilities that produce command strings for programmatic use with Claude Code
or Antigravity APIs.

### Methods

#### `commands.health(opts?: CommandOptions): string`

Returns `/mindforge:health [flags]`.

#### `commands.planPhase(phase: number, opts?: CommandOptions): string`

Returns `/mindforge:plan-phase <phase> [flags]`.

#### `commands.executePhase(phase: number, opts?: CommandOptions): string`

Returns `/mindforge:execute-phase <phase> [flags]`.

#### `commands.securityScan(path?: string, opts?: CommandOptions): string`

Returns `/mindforge:security-scan [path] [flags]`.

#### `commands.audit(filter?): string`

Returns `/mindforge:audit [--phase N] [--event E] [--since S]`.

#### `commands.prReview(opts?: CommandOptions): string`

Returns `/mindforge:pr-review [flags]`.

---

## Exported Types

### `MindForgeConfig`

Configuration object for `MindForgeClient`. All fields are optional.

### `HealthReport`

```typescript
{
  overallStatus: 'healthy' | 'warning' | 'error';
  errors: HealthIssue[];
  warnings: HealthIssue[];
  informational: HealthIssue[];
  timestamp: string;
}
```

### `HealthIssue`

```typescript
{ category: string; message: string; autoRepairable: boolean; fixCommand?: string }
```

### `AuditLogEntry`

```typescript
{ timestamp: string; event: string; phase?: number; [key: string]: unknown }
```

### `PhaseResult`

Result of a complete phase execution, including task counts, commits, security findings,
gate results, and duration.

### `TaskResult`

Result of a single task execution with status, optional commit SHA, verify output,
and duration.

### `SecurityFinding`

```typescript
{
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  owaspCategory: string;
  file: string; line: number;
  description: string; remediation: string; remediated: boolean;
}
```

### `GateResult`

```typescript
{ gate: string; status: 'passed' | 'failed' | 'warning' | 'skipped'; detail?: string }
```

### `MindForgeEvent`

Discriminated union of all real-time events: `task_started`, `task_completed`,
`task_failed`, `wave_started`, `wave_completed`, `phase_completed`,
`security_finding`, `gate_result`, `log`.

### `WaveExecutionResult`

Result from a single wave execution cycle (v9 Pillar XXIV), including task counts,
failures list, duration, and status.

### `MigrationResult`

Result from a schema migration run (v9 Pillar XXVII), including migration status,
version range, migrations applied, and backup directory.

### `KnowledgeEntry`

Full knowledge store entry with metadata (type, topic, content, confidence, tags,
links, deprecation state) and type-specific fields.

### `KnowledgeType`

```typescript
'architectural_decision' | 'code_pattern' | 'bug_pattern' | 'team_preference' | 'domain_knowledge'
```

### `EdgeType`

```typescript
'RELATED_TO' | 'CAUSED_BY' | 'SUPERSEDES' | 'DEPENDS_ON' | 'INFORMS' | 'CONTRADICTS'
```

### `GraphEdge`

Full edge record with source/target IDs, type, weight, reason, metadata, traversal
count, deprecation state, and SHA-256 checksum.

### `CommandOptions`

```typescript
{ flags?: string[]; args?: string[] }
```

---

## Security Considerations

- The SDK reads local files that may contain sensitive data (audit logs, state).
- The event stream binds to `127.0.0.1` only and rejects remote connections with 403.
- CORS is restricted to localhost origins (exact match, no wildcards).
- Do not expose SDK endpoints or the SSE server to public networks.
- API keys passed via `MindForgeConfig` are held in memory only — never written to disk.

---

## TypeScript

The SDK includes full TypeScript type definitions. Build the SDK:
```bash
cd sdk && npm install && npm run build
```
`@types/node` is installed as a dev dependency. The SDK achieves **0 typecheck errors** in v11.8.3.

## Installation
```bash
npm install mindforge-sdk@11.8.3
# or: npx mindforge-cc@stable  # installs SDK as part of the framework
```
