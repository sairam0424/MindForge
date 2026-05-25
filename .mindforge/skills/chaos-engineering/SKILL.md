---
name: chaos-engineering
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: chaos engineering, controlled failure injection, steady state hypothesis, blast radius containment, game day exercise, resilience verification, circuit breaker testing, chaos monkey experiment, fault tolerance validation, disaster recovery drill, failure mode analysis, controlled outage design
compose:
  - observability-stack
---

# Chaos Engineering

## When this skill activates

This skill activates when the user is designing, implementing, or conducting chaos
engineering experiments. This includes defining steady-state hypotheses, designing
controlled failure injection experiments, containing blast radius, planning game day
exercises, verifying resilience patterns (circuit breakers, retries, bulkheads),
conducting disaster recovery drills, and analyzing failure modes in distributed systems.

## Mandatory actions

### Before

1. Confirm observability is in place — you cannot measure what you cannot see.
2. Define the steady-state hypothesis: what does "normal" look like in metrics?
3. Identify the blast radius boundary for the planned experiment.
4. Verify a rollback mechanism exists BEFORE injecting any failure.
5. Ensure stakeholder awareness (announce game days; never surprise production teams).
6. Check that the system under test has basic resilience patterns (retries, timeouts, circuit breakers).

### During

**Steady-State Hypothesis:**
- Define "normal" quantitatively before breaking things (p99 latency < 200ms, error rate < 0.1%, throughput > 1000 rps).
- The experiment succeeds if steady-state is maintained despite failure injection.
- The experiment reveals a weakness if steady-state degrades beyond acceptable thresholds.
- Always compare against the baseline, not against zero errors.

**Experiment Design:**
- Follow the scientific method: hypothesis, inject failure, observe, verify or refute.
- Document the expected outcome before running the experiment.
- Define success criteria AND abort criteria before starting.
- Time-box experiments (auto-revert after N minutes if not manually stopped).
- Run in progressively broader scope: staging first, then production with minimal blast radius.

**Blast Radius Containment:**
- Start small: 1 pod, then 1 node, then 1 availability zone. Never start with full chaos.
- Use feature flags or traffic percentages to limit affected users.
- Have circuit breakers around the experiment itself (meta-resilience).
- Production experiments target a single failure mode at a time.
- Never combine multiple failure injections in the first run.

**Failure Types:**
- **Network:** Latency injection (add 500ms), packet loss (5-20%), network partition (isolate a service), DNS failure.
- **Resource:** CPU exhaustion (stress-ng), memory pressure (fill to 90%), disk full, file descriptor exhaustion.
- **Dependency:** Kill downstream service, return errors from dependency, slow dependency (timeout scenarios).
- **State:** Corrupt cache entries, stale data injection, clock skew, split-brain simulation.
- **Infrastructure:** Node termination, AZ failure simulation, control plane unavailability.

**Game Days:**
- Scheduled, announced, and measured events.
- Assign roles: experiment lead, observer, incident commander (if things go wrong).
- Set clear start/end times and communication channels.
- Capture learnings in a structured report after each game day.
- Progressively increase difficulty across game days.

**Tooling:**
- Chaos Monkey / Simian Army (random instance termination).
- Litmus Chaos / Chaos Mesh (Kubernetes-native experiments).
- Gremlin (managed chaos platform).
- Toxiproxy / tc (network fault injection).
- Custom scripts with automatic rollback timers.

**Rollback:**
- ALWAYS have a rollback plan documented and tested before injection.
- Automated rollback on abort criteria breach (metric threshold exceeded).
- Manual kill switch accessible to experiment lead.
- Post-rollback verification: confirm steady-state returns to normal.

### After

1. Compare observed metrics against steady-state hypothesis.
2. Document findings: hypothesis confirmed or refuted, with evidence.
3. If weakness found: create an action item to improve resilience.
4. Share results broadly — chaos experiments are learning opportunities.
5. Update runbooks based on observed failure behavior.
6. Plan the next experiment (broader scope or different failure mode).

## Self-check before task completion

- [ ] Steady-state hypothesis is defined with quantitative metrics.
- [ ] Blast radius is contained and progressively expanded.
- [ ] Rollback mechanism is in place and tested before injection.
- [ ] Observability confirms the ability to detect impact.
- [ ] Experiment follows the scientific method (hypothesis, injection, observation, conclusion).
- [ ] Stakeholders are informed (no surprise chaos in production).
- [ ] Findings are documented with actionable improvements.
- [ ] Game day schedule includes progressive difficulty increases.
