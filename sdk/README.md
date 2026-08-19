# mindforge-sdk

TypeScript SDK for embedding MindForge in tools, dashboards, and CI pipelines.

## Installation

```bash
npm install mindforge-sdk
```

## Quick start

```typescript
import { MindForgeClient } from 'mindforge-sdk';

const client = new MindForgeClient({
  projectRoot: '/path/to/project',
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Health check
const health = await client.health();
console.log(health.overallStatus); // 'healthy' | 'warning' | 'error'

// Read audit log
const findings = client.readAuditLog({ event: 'security_finding' });
console.log(findings);

// Read metrics
const metrics = client.readSessionMetrics(5);
console.log(metrics);
```

## Real-time event streaming

`MindForgeEventStream` is the supported path and it is self-contained: it starts its own SSE server,
tails `.planning/AUDIT.jsonl`, and broadcasts each new entry as an `audit_entry` event. Verified end to
end — `GET /events` returns `text/event-stream`, and appending to the audit log produces a broadcast.
Note the `watchAuditLog()` call below is required: `start()` serves the stream but does not begin
tailing on its own.

`WebSocketEventStream` is also exported, and it comes with two constraints worth knowing before you
reach for it:

- **It needs a global `WebSocket` that this package does not provide.** `engines.node` is `>=18.0.0`
  and `dependencies` is empty, so on Node 18 or 20 you must install `ws` yourself and assign it to
  `globalThis.WebSocket`. On Node 22+ the global exists. Calling `connect()` without one throws an
  error saying so, rather than a bare `ReferenceError`.
- **MindForge ships no WebSocket server.** The default URL is `ws://127.0.0.1:7337/ws`, but the
  dashboard exposes no `/ws` upgrade path — so this client is for connecting to a server *you* run,
  not to MindForge itself. Use `MindForgeEventStream` if you want events from MindForge.

Reconnection is automatic (5 attempts, linear backoff). A reconnect that fails is delivered to an
`'error'` listener registered with `on('error', handler)`; once the attempts are exhausted a `'close'`
event fires with the reason, so a dead stream is observable rather than silent.

```typescript
import { MindForgeEventStream } from 'mindforge-sdk';

const stream = new MindForgeEventStream();
await stream.start(7337);
stream.watchAuditLog('/path/to/project');

// Subscribe from browser or tool:
const es = new EventSource('http://localhost:7337/events');
es.addEventListener('audit_entry', (e) => {
  const entry = JSON.parse(e.data);
  if (entry.event === 'task_completed') {
    console.log('Task done:', entry.task_name);
  }
});
```

## Config validation

```typescript
const { valid, errors } = client.validateConfig();
if (!valid) console.error(errors);
```

## Security notes

- `HANDOFF.json` may contain sensitive project state. Do not expose it to untrusted clients
  or log its contents in external systems.
- The SDK operates on local files and provides no network authentication. Do not expose SDK
  endpoints to the public internet.

## New in v11.9.2

### Additional exports

```typescript
import {
  MindForgeClient,
  MindForgeEventStream,
  WebSocketEventStream,
  VERSION,              // '11.9.2'
} from 'mindforge-sdk';

import type {
  WaveExecutionResult,
  MigrationResult,
  StreamChunk,
  StreamingExecutionResult,
  BatchExecutionRequest,
  BatchExecutionResult,
} from 'mindforge-sdk';
```

### Streaming execution

```typescript
import { MindForgeClient } from 'mindforge-sdk';

const client = new MindForgeClient({ projectRoot: '.' });
const { stream } = await client.streamExecution(1);

for await (const chunk of stream) {
  if (chunk.type === 'content') process.stdout.write(chunk.content!);
  if (chunk.type === 'done') break;
}
```

### Batch execution

Runs commands concurrently (semaphore-bounded by `maxConcurrency`, default 3). Each
task's `command` is the executable and `options.args` is a **string array** — it is NOT a
shell string. Commands run with `shell: false`, so arguments are passed directly to the
process and are safe from shell injection.

```typescript
const batch = await client.batchExecute({
  tasks: [
    { id: 'task-a', command: 'node', options: { args: ['--version'] } },
    { id: 'task-b', command: 'git',  options: { args: ['rev-parse', 'HEAD'] } },
  ],
  maxConcurrency: 4,
});

for (const entry of batch.results) {
  if (entry.status === 'fulfilled') {
    // entry.result is { stdout, stderr, exitCode }
    const { stdout, stderr, exitCode } = entry.result as {
      stdout: string; stderr: string; exitCode: number;
    };
    console.log(`${entry.taskId} exited ${exitCode}: ${stdout.trim()}`);
  } else {
    // entry.status === 'rejected'
    console.error(`${entry.taskId} failed: ${entry.error}`);
  }
}

console.log(`batch finished in ${batch.totalDurationMs}ms`);
```

### Runtime config validation

```typescript
const { valid, errors } = client.validateRuntimeConfig();
if (!valid) console.error(errors);
```

### New `MindForgeClient` methods

```typescript
const client = new MindForgeClient({ projectRoot: '/path/to/project' });

// Read the current auto-state from auto-state.json
const state = client.readAutoState();
console.log(state.status); // 'idle' | 'running' | 'awaiting_regeneration'

// Check whether the local MindForge database has been initialized
const ready = client.isDatabaseInitialized();
if (!ready) {
  console.warn('Run mindforge:init-project first');
}
```

## TypeScript support

Full type definitions included. No `@types/` package needed.
