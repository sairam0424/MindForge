---
name: observability-stack
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: observability stack, structured logging, distributed tracing, OpenTelemetry setup, RED method metrics, USE method metrics, alerting threshold design, dashboard design, correlation ID, metrics collection strategy, log aggregation, trace context propagation
---

# Observability Stack

## When this skill activates

This skill activates when designing, implementing, or reviewing observability infrastructure for production systems. It covers the three pillars (logs, traces, metrics), alerting strategy, dashboard design, and correlation techniques. Use this skill whenever you need to ensure a system can be understood, debugged, and monitored in production.

## Mandatory actions when this skill is active

### Before

1. **Identify observability goals** — What questions must you answer? "Why is this request slow?" (traces), "What's the error rate?" (metrics), "What happened at 3:42am?" (logs).
2. **Assess current state** — What instrumentation exists? What gaps cause blind spots? Never add observability without understanding what's already there.
3. **Define SLIs/SLOs** — Service Level Indicators (what to measure) and Service Level Objectives (acceptable thresholds) must exist before alerting makes sense.
4. **Choose the stack** — Select instrumentation (OpenTelemetry), storage (Prometheus/Loki/Tempo, Datadog, Grafana Cloud), and visualization (Grafana, Datadog) based on team expertise and budget.

### During

#### Pillar 1: Structured Logging

**Format** — Always structured JSON with fields: timestamp, level, message, service, trace_id, span_id, correlation_id, error_code, duration_ms, metadata.

**Severity levels:**
- `DEBUG` — Development-only detail. Never enable in production by default.
- `INFO` — Normal operations: request received, task completed, state transitions.
- `WARN` — Degraded but functional: retry succeeded, fallback activated, approaching limit.
- `ERROR` — Operation failed: request could not be fulfilled, exception caught.
- `FATAL` — System cannot continue: startup failure, unrecoverable state, crash.

**Correlation IDs:**
- Generate at the edge (API gateway). Propagate via `X-Correlation-ID` header through all services.
- Include in every log line. Distinct from trace_id but can be linked.

**Logging rules:**
- Log at service boundaries (incoming requests, outgoing calls).
- Log state transitions (order created, payment confirmed, email sent).
- Log errors with full context (what was attempted, what failed, what the input was).
- NEVER log secrets, tokens, passwords, or full credit card numbers.
- NEVER log PII without a documented legal basis and redaction strategy.

#### Pillar 2: Distributed Tracing

**Span design:**
- Create spans for: HTTP requests (in/out), database queries, cache operations, external API calls, queue publish/consume, significant business logic.
- DO NOT span: trivial operations, tight loops, in-memory calculations.
- Name spans with: `verb.noun` format: `process.payment`, `query.users`, `send.email`.

**Context propagation:**
- Use W3C Trace Context standard (`traceparent` header) for cross-service propagation.
- Ensure all HTTP clients and message queues propagate context automatically.
- Test propagation: a trace should span from the edge to the deepest downstream call.

**Sampling strategy:**
- 100% sampling in development and staging.
- Production: tail-based sampling (keep all errors + slow requests + 1-10% of normal traffic).
- Never sample at 100% in high-traffic production. Storage costs scale linearly.
- Always keep traces for errors regardless of sampling rate.

#### Pillar 3: Metrics

**RED Method (for services/endpoints):**
- **Rate** — Requests per second. Indicates load.
- **Errors** — Failed requests per second (and error rate as %). Indicates reliability.
- **Duration** — Latency distribution (p50, p95, p99). Indicates performance.

**USE Method (for resources: CPU, memory, disk, network):**
- **Utilization** — Percentage of resource capacity in use.
- **Saturation** — Work queued waiting for the resource.
- **Errors** — Resource-level errors (disk I/O errors, network drops).

**Metric types:**
- **Counter** — Monotonically increasing value. Use for: total requests, errors, bytes transferred.
- **Gauge** — Point-in-time value that can go up/down. Use for: active connections, queue depth, temperature.
- **Histogram** — Distribution of values. Use for: request latency, payload sizes.

**Naming convention:** `<service>_<component>_<metric>_<unit>` (e.g., `payment_api_request_duration_seconds`).

**Cardinality discipline:**
- Never use unbounded values as label/tag keys (user IDs, request IDs, timestamps).
- Maximum 10-20 unique values per label. High cardinality kills metric storage.
- Safe labels: HTTP method, status code, endpoint path (grouped), environment, region.

#### Alerting Design

**Principles:**
- Alert on symptoms (user impact), not causes (CPU spike). Users don't care about CPU; they care about latency.
- Every alert must be actionable. If no one can do anything about it at 3am, it should not page.
- Use SLO-based alerting: alert when the error budget burn rate exceeds safe levels.

**Threshold design:**
- Static thresholds: set at baseline + 2 standard deviations (for stable metrics).
- Anomaly detection: use ML-based for metrics with seasonal patterns (traffic).
- Burn rate: alert when 1-hour burn rate > 14x (consumes 24hr budget in 1hr).

**Alert severity:**
- **Critical (page)** — User-facing impact right now. Revenue loss. Data loss.
- **Warning (ticket)** — Degraded performance. Will become critical if unaddressed. Handle next business day.
- **Info (log)** — Notable but not impactful. For awareness only.

**Anti-patterns:**
- Alert fatigue: >5 alerts/day/team = too many. Tune or eliminate.
- Flapping alerts: add hysteresis (alert fires at threshold, clears at threshold - 10%).
- Duplicate alerts: one incident should fire one alert, not one per symptom.

#### Dashboard Design

**Layout:** Row 1: Traffic, Error rate, Latency (p50/p95/p99). Row 2: Saturation (CPU, memory, connections), Active alerts. Row 3: Deployment markers, SLO burn-down.

**Principles:** Top = current health (red/yellow/green). Middle = golden signal time-series. Bottom = drill-down investigation panels. NO vanity metrics. Consistent time ranges, default 1 hour.

### After

1. **Verify correlation** — Generate a test request and verify it can be traced from edge to database across all services via correlation ID and trace ID.
2. **Validate alerting** — Trigger each alert condition deliberately. Verify it fires, routes correctly, and auto-resolves.
3. **Load test observability** — Ensure the observability stack itself handles production load without becoming a bottleneck.
4. **Document runbooks** — Every alert needs a runbook: what it means, how to diagnose, how to mitigate.

## Self-check before task completion

- [ ] All logs are structured JSON with correlation IDs, timestamps, and severity levels
- [ ] Distributed traces span from edge to deepest downstream call with proper context propagation
- [ ] RED metrics (Rate, Errors, Duration) are collected for every service endpoint
- [ ] USE metrics (Utilization, Saturation, Errors) are collected for critical resources
- [ ] Metric label cardinality is bounded (no unbounded labels like user IDs)
- [ ] Alerts are symptom-based, actionable, and severity-appropriate
- [ ] Dashboard shows golden signals with drill-down capability
- [ ] No secrets or unbounded PII appear in logs
- [ ] Sampling strategy is defined for production tracing
- [ ] Runbooks exist for every critical alert
