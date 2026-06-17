---
name: architecture-tradeoff-analysis
version: 1.0.0
min_mindforge_version: 10.1.0
status: stable
triggers: architecture tradeoff, ATAM, quality attribute scenario, sensitivity point, tradeoff point, risk theme, architecture evaluation, quality attribute tradeoff, architecture decision quality, non-functional tradeoff, architecture risk, scenario-based evaluation
---

# Architecture Tradeoff Analysis Method (ATAM)

## When this skill activates

This skill activates when the team needs to evaluate architectural decisions against
competing quality attributes, identify sensitivity and tradeoff points, or assess
architectural risk. It implements the ATAM methodology for systematic architecture
evaluation using scenario-based analysis.

## Mandatory actions when this skill is active

### Before

1. **Present the architecture** — Document the current or proposed architecture with
   sufficient detail: components, connectors, deployment topology, key design decisions,
   and the rationale behind major choices.
2. **Identify stakeholders** — List all parties with quality attribute concerns
   (developers, ops, security, product, business).
3. **Elicit quality attributes** — Gather the quality attributes that matter most for
   this system from stakeholder interviews.

### During

4. **Define quality attributes under evaluation:**
   - **Performance** — Latency, throughput, resource utilization targets.
   - **Availability** — Uptime requirements, failover behavior, recovery time.
   - **Security** — Authentication, authorization, data protection, audit requirements.
   - **Modifiability** — Cost of change, deployment independence, backward compatibility.
   - **Testability** — Isolation capability, observability, deterministic behavior.
   - **Usability** — Learnability, efficiency, error recovery for operators and users.
   - **Scalability** — Growth handling, elasticity, degradation under load.

5. **Generate quality attribute scenarios** (for each relevant attribute):
   - **Source** — Who or what causes the stimulus?
   - **Stimulus** — What event or condition triggers the scenario?
   - **Artifact** — What part of the system is affected?
   - **Environment** — Under what conditions (normal, peak, degraded)?
   - **Response** — What should the system do?
   - **Response measure** — How do we know the response was acceptable?

6. **Analyze via architectural approaches:**
   - Map each scenario to the architectural decisions that address it.
   - Identify which architectural patterns, tactics, or styles are employed.
   - Assess whether the approach adequately satisfies the scenario's response measure.

7. **Identify sensitivity points:**
   - A sensitivity point is an architectural decision that critically affects ONE
     quality attribute.
   - Document: "If we change X, quality attribute Y is significantly affected."
   - These are single-attribute risks.

8. **Identify tradeoff points:**
   - A tradeoff point is an architectural decision that affects MULTIPLE quality
     attributes in opposing directions.
   - Document: "Decision X improves attribute Y but degrades attribute Z."
   - These are the hardest decisions and require explicit stakeholder prioritization.

9. **Generate risk themes:**
   - Cluster related sensitivity and tradeoff points into themes.
   - Name each theme descriptively (e.g., "Performance vs. Security tension in
     the authentication layer").
   - Prioritize risk themes by business impact and likelihood.

10. **Propose mitigations:**
    - For each high-priority risk theme, propose architectural alternatives or
      complementary tactics.
    - Assess whether mitigations introduce new tradeoffs.

### After

11. **Document findings** — Produce an ATAM report with: architecture overview, quality
    attribute tree, scenario table, sensitivity points, tradeoff points, risk themes,
    and recommended actions.
12. **Prioritize with stakeholders** — Present tradeoff points to stakeholders for
    explicit priority decisions. Record their choices.
13. **Feed into ADRs** — Convert key decisions into Architecture Decision Records with
    tradeoff rationale preserved.

## Self-check before task completion

- [ ] Architecture presented with sufficient detail for analysis
- [ ] Quality attributes identified and prioritized by stakeholders
- [ ] At least 3 quality attribute scenarios generated per relevant attribute
- [ ] Sensitivity points identified and documented
- [ ] Tradeoff points identified with opposing quality attributes named
- [ ] Risk themes generated from clustered findings
- [ ] Stakeholder priorities recorded for tradeoff resolution
- [ ] Mitigations proposed for high-priority risk themes
- [ ] ATAM findings documented in a shareable format
