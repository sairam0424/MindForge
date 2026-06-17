---
name: load-testing
version: 1.0.0
min_mindforge_version: 10.0.8
status: stable
triggers: load testing, k6 script, locust test, artillery config, load profile, ramp up test, spike test, soak test, stress test, SLA validation, throughput test, concurrent users
compose: performance
---

# Load Testing

## When this skill activates

This skill activates when designing, writing, or analyzing performance tests that simulate user load against a system. It applies to any scenario involving throughput measurement, latency profiling under load, capacity planning, or SLA validation.

## Mandatory actions when this skill is active

### Before

1. Define the SLA targets (p95 latency < X ms, error rate < Y%, throughput > Z rps).
2. Identify the critical user journeys to simulate (login flow, checkout, search).
3. Determine the load profile type needed (load, stress, spike, or soak).
4. Confirm test environment is production-like (same infra, realistic data volume).
5. Establish baseline metrics from current production (if available).
6. Ensure monitoring is active during tests (APM, infra metrics, logs).

### During

**Test Types and When to Use:**
- **Load test**: Expected traffic. Validates system meets SLA under normal conditions.
- **Stress test**: Beyond capacity. Finds the breaking point and degradation behavior.
- **Spike test**: Sudden burst (0 to max instantly). Tests auto-scaling and recovery.
- **Soak test**: Sustained load for hours. Detects memory leaks, connection pool exhaustion, log disk fill.

**Load Profile Design:**
- **Ramp**: Gradually increase (0 → target over 5 minutes). Standard for load tests.
- **Spike**: Instant jump to peak. Use for flash sale / viral event scenarios.
- **Step**: Increase in discrete steps (50 → 100 → 150). Good for finding thresholds.
- **Soak**: Steady state for 2-8 hours. Target = expected average load.

**Tool Selection:**
- **k6** (Go-based): Developer-friendly, JS scripting, excellent CI integration, checks/thresholds built-in.
- **Locust** (Python): Python scripting, distributed mode, real-time web UI, event-driven.
- **Artillery** (Node): YAML config, scenario-based, good for quick setups, plugin ecosystem.

**Metrics to Capture:**
- **Latency**: p50, p95, p99 (p95 is your SLA target, p99 catches tail latency).
- **Throughput**: Requests per second (rps) sustained at target.
- **Error rate**: Percentage of non-2xx responses under load.
- **Saturation**: CPU, memory, connection pool usage, thread count.
- **Apdex**: Application Performance Index score.

**Environment Considerations:**
- NEVER run load tests against production without explicit approval and safeguards.
- Use dedicated load-test environment with production-equivalent resources.
- Populate with realistic data volume (empty DB gives false confidence).
- Disable rate limiters and WAF rules that would mask real limits (or test with them separately).
- Coordinate with infrastructure team to avoid impacting shared services.

**Result Analysis:**
- Compare against SLA targets: PASS if all thresholds met under target load.
- Identify the saturation point (where latency inflects upward).
- Check for error rate correlation with load increase.
- Look for resource bottlenecks (CPU-bound vs IO-bound vs network-bound).
- Document capacity ceiling: "System handles X concurrent users before degradation."

### After

1. Record results with full context (date, environment, data volume, test config).
2. Compare against previous runs to detect regressions.
3. File tickets for any SLA violations with root cause analysis.
4. Update capacity planning docs with new findings.
5. Archive test scripts and results in version control.

## Self-check before task completion

- [ ] SLA targets are explicitly defined and measurable.
- [ ] Load profile matches a realistic usage pattern (not arbitrary numbers).
- [ ] Test runs long enough to surface time-dependent issues (minimum 5 minutes for load, 2+ hours for soak).
- [ ] Results include p50, p95, p99 latency plus error rate and throughput.
- [ ] Test environment is documented (instance types, replicas, data volume).
- [ ] Bottleneck identified and categorized (CPU / memory / IO / network / external dependency).
- [ ] Results compared against baseline or SLA with clear PASS/FAIL verdict.
- [ ] No tests were accidentally run against production without safeguards.
