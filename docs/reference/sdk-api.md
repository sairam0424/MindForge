# MindForge SDK API — Reference (v1.0.0)

## Package
`@mindforge/sdk`

## Exports
From `sdk/src/index.ts`:
- `MindForgeClient`
- `MindForgeEventStream`
- `commands`
- Types: `MindForgeConfig`, `PhaseResult`, `TaskResult`, `SecurityFinding`,
  `GateResult`, `HealthReport`, `HealthIssue`, `MindForgeEvent`, `CommandOptions`
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
