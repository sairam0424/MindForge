# MindForge SDK API — Reference (v11.9.8)

## Package

`mindforge-sdk`

## Exports

From `sdk/src/index.ts`:

- `MindForgeClient`
- `MindForgeEventStream` — SSE-based event stream (see below)
- `WebSocketEventStream` — WebSocket-based alternative; requires a global `WebSocket` (Node 22+,
  a browser, or the optional `ws` package assigned to `globalThis.WebSocket` — the SDK declares
  no runtime dependencies, so nothing is installed for you)
- `commands` — slash-command string builders
- `batch(commands: string[])` — joins an array of command strings with `&&`
- `MindForgeMemory`
- Types: `MindForgeConfig`, `PhaseResult`, `TaskResult`, `SecurityFinding`,
  `GateResult`, `HealthReport`, `HealthIssue`, `MindForgeEvent`, `CommandOptions`,
  `AuditLogEntry`, `WaveExecutionResult`, `MigrationResult`, `StreamChunk`,
  `StreamingExecutionResult`, `BatchExecutionRequest`, `BatchExecutionResult`
- `VERSION`

## MindForgeClient

High-level API for reading local project state.

Methods:
- `isInitialised(): boolean`
- `readState(): object | null`
- `readHandoff(): object | null`
- `health(): Promise<HealthReport>`
- `readAuditLog(filter?): unknown[]`
- `readSessionMetrics(limit?): unknown[]`
- `validateConfig(): { valid: boolean, errors: string[], warnings: string[] }`

## MindForgeEventStream
Localhost-only SSE server for streaming audit events.

Methods:
- `start(port = 7337)`
- `watchAuditLog(projectRoot)`
- `broadcast(eventType, data)`
- `stop()`

## Command builders
`commands` provides helpers to build slash-command strings:
- `health(opts)`
- `planPhase(phase, opts)`
- `executePhase(phase, opts)`
- `securityScan(path?, opts)`
- `audit(filter)`
- `prReview(opts)`

## Security notes
- The SDK reads local files that may contain sensitive data.
- Event stream binds to `127.0.0.1` only and rejects non-local connections.
- Do not expose the SSE port on public interfaces.
