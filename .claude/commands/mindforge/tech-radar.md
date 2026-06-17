---
description: "Assess technology for adoption, trial, hold, or retirement. Usage: /mindforge:tech-radar [technology] [--action adopt|trial|assess|hold|retire]"
---

<objective>
Evaluate a technology for placement on the project's technology radar, determining whether it should be adopted, trialed, held, assessed, or retired based on ecosystem maturity, team readiness, and strategic fit.
</objective>

<execution_context>
@.mindforge/skills/technology-radar/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (technology name, optional --action to force a ring)
Knowledge: Current tech stack, team skills inventory, existing radar entries, industry benchmarks.
</context>

<process>
1. **Identify Technology**: Clarify the technology, its category (language, framework, tool, platform, technique), and the specific use case being evaluated.
2. **Evaluate Ecosystem Maturity**: Assess release stability, backward compatibility track record, documentation quality, and production usage at scale by known companies.
3. **Assess Community and Hiring Pool**: Check GitHub stars/activity, Stack Overflow questions, conference presence, and availability of engineers with this skill in the hiring market.
4. **Check Breaking Change Frequency**: Review the last 12 months of releases for breaking changes, deprecation policy clarity, and migration tooling availability.
5. **Benchmark Performance**: Compare against current solution on relevant metrics (throughput, latency, bundle size, memory usage). Use published benchmarks and validate with a spike if high-stakes.
6. **Evaluate Team Skill Gap**: Assess current team proficiency, estimated ramp-up time, training resources available, and whether champions exist internally.
7. **Determine Ring Placement**: Based on evidence, place in one of: Adopt (proven, use by default), Trial (worth pursuing in a low-risk project), Assess (explore with research), Hold (do not start new usage), Retire (actively migrate away).
8. **Document Rationale**: Write a radar blip entry with the ring, rationale, evidence links, and date. Include dissenting opinions if any.
9. **Define Migration Path If Retiring**: If the recommendation is Hold or Retire, document the migration path, estimated effort, and timeline for moving to the replacement.
</process>
