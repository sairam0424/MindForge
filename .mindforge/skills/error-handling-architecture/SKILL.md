---
name: error-handling-architecture
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: error handling architecture, error hierarchy, error boundary, retry policy, dead letter queue, error reporting, sentry integration, error classification, graceful error, error propagation, error context, structured error
---

# Error Handling Architecture

## When this skill activates

This skill activates when designing error hierarchies, implementing error boundaries, configuring retry policies, setting up error reporting (Sentry/Datadog/Bugsnag), building dead letter queue processing, or establishing error handling patterns across a codebase. It applies to both frontend and backend error architecture.

## Mandatory actions when this skill is active

### Before

1. Map the system boundaries where errors cross layers (UI → API → service → DB → external).
2. Identify the error reporting tool in use or to be adopted (Sentry, Datadog, Bugsnag, custom).
3. Categorize existing errors: which are retryable, which are permanent, which are user-facing.
4. Determine SLA for error detection and alerting (time from error to notification).
5. Review current error handling for anti-patterns (swallowed errors, generic catches, leaked internals).

### During

**Error Hierarchy Design:**
```
BaseError (abstract)
├── ValidationError        — Invalid input (400). User can fix and retry.
├── NotFoundError          — Resource doesn't exist (404). Client should not retry.
├── AuthenticationError    — Identity unknown (401). Redirect to login.
├── AuthorizationError     — Identity known, permission denied (403). Contact admin.
├── ConflictError          — State conflict (409). Client should refresh and retry.
├── RateLimitError         — Too many requests (429). Client must back off.
├── ExternalServiceError   — Upstream dependency failed (502/503). Retry with backoff.
└── InternalError          — Unexpected failure (500). Alert engineers.
```
- Every error class carries: `code` (machine-readable), `message` (human-readable), `context` (debugging data), `retryable` (boolean).
- NEVER use generic `Error` or `Exception` for domain errors. Always use typed errors.
- Error codes follow a namespace: `AUTH_001`, `PAYMENT_002`, `INVENTORY_003`.

**Error Boundaries (Defense in Depth):**
- **React UI**: `ErrorBoundary` components at route level and critical widget level. Show user-friendly fallback, report to Sentry.
- **API Controllers**: Catch all errors at the handler level. Transform to appropriate HTTP status and structured response.
- **Service Layer**: Catch errors from dependencies, add context, re-throw as domain errors.
- **Infrastructure**: Global uncaught exception handler as last resort (log + alert + graceful shutdown).
- Each boundary: catch, enrich with context, decide (retry/propagate/absorb), report.

**Retry Policies:**
- **Exponential backoff**: `delay = baseDelay * 2^attempt` (e.g., 100ms, 200ms, 400ms, 800ms).
- **Jitter**: Add random variance to prevent thundering herd (`delay + random(0, delay * 0.1)`).
- **Max retries**: 3 for fast operations, 5 for critical operations, 0 for non-idempotent writes.
- **Idempotency keys**: Required for retrying write operations (prevent double-processing).
- **Circuit breaker**: After N consecutive failures, stop trying for a cooldown period. Prevents cascade.
- **Retry only retryable errors**: Network timeouts (yes), validation errors (no), 500s (maybe, with limit).

**Dead Letter Queues (Async Error Handling):**
- Messages that fail processing after max retries go to the DLQ.
- DLQ messages must retain: original message, error details, attempt count, timestamp of each failure.
- Alerting: notify when DLQ depth exceeds threshold (e.g., >10 messages in 5 minutes).
- Manual replay: tooling to inspect DLQ messages and replay them after fix is deployed.
- Poisoned messages: after replay still fails, move to permanent failure store with investigation ticket.
- Never silently drop messages. Every message must reach success or explicit human acknowledgment.

**Error Reporting (Sentry Integration Pattern):**
- **Breadcrumbs**: Log navigation, API calls, user actions leading up to the error.
- **Tags**: environment, service, user_id, transaction_id, feature_flag.
- **Context**: request body (sanitized), response status, database query (no PII).
- **Grouping**: Configure fingerprinting so related errors group together (not 1000 separate issues).
- **Alerting**: New issues → Slack. Regression (resolved issue re-opens) → PagerDuty.
- **Sampling**: 100% for errors, 10-20% for transactions/performance in production.
- **PII scrubbing**: Strip emails, tokens, passwords before sending to error reporting.

**Structured Error Responses (API):**
```json
{
  "error": {
    "code": "VALIDATION_001",
    "message": "Email address is invalid",
    "details": [
      { "field": "email", "constraint": "Must be a valid email format" }
    ],
    "retryable": false,
    "request_id": "req_abc123"
  }
}
```
- Always include `request_id` for correlation with server logs.
- Never expose stack traces, internal paths, or database details in API responses.
- Use `details` array for field-level validation errors.
- Include `retryable` flag so clients can implement automatic retry logic.

**Error Propagation Rules:**
- Errors propagate UP (from infrastructure to service to controller to client).
- At each layer: catch, add context specific to that layer, re-throw as appropriate type.
- NEVER swallow errors silently (`catch (e) {}`). At minimum: log and re-throw.
- Transform errors at boundaries (internal DB error becomes generic 500 to the client).
- Preserve the original error as `cause` for debugging (Error Cause chain / `cause` property).

### After

1. Error hierarchy covers all known failure modes in the system.
2. Every boundary has explicit error handling (no unhandled promise rejections, no bare throws).
3. Retry policies are configured with backoff, jitter, and max attempts.
4. Error reporting captures sufficient context for debugging without exposing PII.
5. Alerting is configured for new errors, regressions, and DLQ threshold breaches.

## Self-check before task completion

- [ ] All errors use typed error classes from the hierarchy (no generic `Error` throws).
- [ ] Error boundaries exist at every system layer (UI, API, service, infrastructure).
- [ ] Retry policies use exponential backoff with jitter and respect idempotency.
- [ ] Dead letter queues are configured for async processing with alerting and replay tooling.
- [ ] Error reporting includes breadcrumbs, tags, and context (without PII).
- [ ] API error responses are structured with code, message, retryable flag, and request_id.
- [ ] No errors are silently swallowed anywhere in the codebase.
- [ ] Error messages are actionable for the audience (user-friendly in UI, detailed in logs).
