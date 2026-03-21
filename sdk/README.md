# @mindforge/sdk

TypeScript SDK for embedding MindForge in tools, dashboards, and CI pipelines.

## Installation

```bash
npm install @mindforge/sdk
```

## Quick start

```typescript
import { MindForgeClient } from '@mindforge/sdk';

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

```typescript
import { MindForgeEventStream } from '@mindforge/sdk';

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

## TypeScript support

Full type definitions included. No `@types/` package needed.
