---
description: "Set up logging, tracing, and metrics stack. Usage: /mindforge:observability [service] [--stack otel|custom] [--alerts]"
---

<objective>
Design and implement a comprehensive observability stack covering structured logging, distributed tracing, and metrics collection with alert definitions for a service or system.
</objective>

<execution_context>
@.mindforge/skills/observability-stack/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (service name, optional --stack otel|custom, optional --alerts flag)
Knowledge: Current infrastructure, existing monitoring, SLO definitions, incident history.
</context>

<process>
1. **Identify golden signals**: For the target service, define:
   - Latency: request duration distribution (p50, p95, p99)
   - Traffic: requests per second, broken down by endpoint and method
   - Errors: error rate by type (4xx client, 5xx server, timeout, circuit-open)
   - Saturation: resource utilization (CPU, memory, connections, queue depth)
   - Map each signal to concrete measurement points in the code
   - Identify which signals are leading indicators vs lagging

2. **Implement structured logging**: Design the logging layer:
   - Format: JSON with consistent field names across all services
   - Required fields: timestamp, level, service, trace_id, span_id, message
   - Context fields: user_id, request_id, correlation_id, environment
   - Log levels: ERROR (actionable), WARN (degraded), INFO (state changes), DEBUG (development)
   - Correlation: inject trace_id and span_id into every log line
   - Sampling: log 100% of errors, sample INFO/DEBUG in production
   - Redaction: automatically mask PII fields (email, IP, tokens)

3. **Add tracing (OpenTelemetry spans)**: Instrument the request lifecycle:
   - Root span at service entry (HTTP handler or message consumer)
   - Child spans for: database queries, external API calls, cache operations, queue publish
   - Span attributes: operation name, status code, error message, duration
   - Propagation: W3C TraceContext headers for cross-service correlation
   - Sampling strategy: always-on for errors, probabilistic (10%) for success
   - Exporter configuration: OTLP to collector, batch with 5s flush interval

4. **Define metrics (RED for services, USE for resources)**:
   - RED (Request-focused): Rate, Errors, Duration per endpoint
   - USE (Resource-focused): Utilization, Saturation, Errors per resource
   - Histogram buckets for latency: [5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 5s]
   - Counter for requests by: method, path, status_code
   - Gauge for: active connections, queue depth, cache size
   - Summary for: batch job duration, background task completion time

5. **Design alerts (symptom-based)**: When --alerts flag is set:
   - SLO-based: alert on error budget burn rate (fast burn = 14.4x in 1h, slow burn = 6x in 6h)
   - Latency: p99 > 2x target for 5 minutes
   - Error rate: > 1% for 5 minutes (page), > 0.1% for 30 minutes (ticket)
   - Saturation: resource > 80% for 10 minutes (warn), > 95% for 5 minutes (page)
   - Absence: no data for 5 minutes (service may be down)
   - Alert routing: PagerDuty for page-severity, Slack for warn-severity
   - Runbook link in every alert annotation

6. **Build dashboard**: Design the observability dashboard hierarchy:
   - L0 (Overview): Service health grid, error budget remaining, top-level SLIs
   - L1 (Service): Golden signals for the specific service, recent deployments overlay
   - L2 (Request): Individual request trace waterfall, span breakdown
   - L3 (Resource): CPU, memory, disk, network for underlying infrastructure
   - Include: deployment markers, anomaly detection overlay, comparison (now vs last week)

7. **Output observability plan**: Deliver:
   - Architecture diagram (collector topology, data flow)
   - Instrumentation code snippets for the target stack
   - Alert definitions (Prometheus rules or equivalent)
   - Dashboard JSON (Grafana or equivalent)
   - Retention policy (hot: 7d full resolution, warm: 30d downsampled, cold: 90d aggregated)
   - Cost estimate for the observability stack
</process>
