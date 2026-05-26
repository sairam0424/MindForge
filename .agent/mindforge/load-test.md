---
description: Design load test scenario with profiles. Usage - /mindforge:load-test [endpoint] [--profile ramp|spike|soak] [--target-rps N]
---

<objective>
Design and implement a load testing strategy with configurable profiles that
validates system behavior under stress. Identifies breaking points, latency
degradation curves, and resource exhaustion thresholds.
</objective>

<execution_context>
@.mindforge/skills/load-testing/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Define SLAs and performance objectives — target p50/p95/p99 latencies, maximum error rate, throughput requirements, and resource utilization ceilings.
2. Select test type based on --profile flag: ramp (gradual increase to find ceiling), spike (sudden burst to test elasticity), or soak (sustained load to find memory leaks and connection exhaustion).
3. Design the load profile with specific stages — VU ramp-up duration, hold duration, ramp-down. For spike: define burst magnitude and recovery window.
4. Write the test script using k6 or Locust. Include realistic user flows, proper think times, data parameterization, and correlation of dynamic values.
5. Configure thresholds that define pass/fail criteria — e.g., http_req_duration p95 < 500ms, http_req_failed < 1%, checks > 99%.
6. Run the load test against staging environment. Ensure staging mirrors production topology (same instance types, connection pool sizes, rate limits).
7. Analyze results: identify bottleneck (CPU, memory, DB connections, external dependency), find the inflection point where latency degrades non-linearly.
8. Document findings with charts: latency vs throughput curve, error rate vs load, resource utilization timeline. Include specific recommendations for capacity planning.
9. Create a repeatable test suite that can run in CI on a schedule (nightly) or before releases. Configure baseline comparison to detect regressions.
10. Log load-test invocation in AUDIT with: endpoint, profile, target RPS, peak RPS achieved, p95 latency at peak.
</process>
