# MindForge SDK Reference

## Overview
The `@mindforge/sdk` package provides a programmatic API for integrating MindForge
into tools, dashboards, and CI pipelines.

## API

### `MindForgeClient`
- `isInitialised(): boolean`
- `readState(): object | null`
- `readHandoff(): object | null`
- `health(): Promise<HealthReport>`
- `readAuditLog(filter?): unknown[]`
- `readSessionMetrics(limit?): unknown[]`
- `validateConfig(): { valid, errors, warnings }`

### `MindForgeEventStream`
- `start(port = 7337)` — starts localhost-only SSE server
- `watchAuditLog(projectRoot)` — streams new AUDIT.jsonl entries
- `broadcast(eventType, data)` — manual broadcast
- `stop()` — shutdown server and watchers

## Security considerations
- The SDK reads local files that may contain sensitive data.
- The event stream is bound to localhost only and rejects remote connections.
- Do not expose SDK endpoints to public networks.
