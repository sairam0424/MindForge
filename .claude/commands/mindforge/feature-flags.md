---
description: Design feature flag strategy with lifecycle management. Usage - /mindforge:feature-flags [feature] [--type release|experiment|operational] [--rollout 5%]
---

<objective>
Design a feature flag strategy with full lifecycle management — from creation
through gradual rollout to cleanup. Covers flag typing, targeting rules,
kill switches, success metrics, and mandatory flag removal deadlines.
</objective>

<execution_context>
@.mindforge/skills/feature-flag-management/SKILL.md
</execution_context>

<context>
$ARGUMENTS
</context>

<process>
1. Classify the flag type based on --type flag: release (temporary, gates incomplete feature, remove after launch), experiment (A/B test with metrics, remove after decision), or operational (long-lived, controls system behavior like rate limits or circuit breakers).
2. Define targeting rules: percentage rollout (--rollout flag), user segment targeting (beta users, internal, enterprise), geographic targeting, or device/platform targeting. Use consistent hashing on user ID for sticky assignment.
3. Set the rollout percentage and define the rollout plan: 5% (canary) -> 25% (early adopters) -> 50% (half) -> 100% (GA). Define success criteria for each stage gate (error rate, latency, business metrics).
4. Configure kill switch: every flag must have an emergency off switch that immediately disables the feature for all users. Kill switch activation should not require a deploy — remote config only.
5. Define success metrics that determine whether the flag should be fully enabled or rolled back: conversion rate, error rate delta, latency impact, user engagement, and business KPIs specific to the feature.
6. Set cleanup deadline: release flags must be removed within 90 days of 100% rollout. Experiment flags within 30 days of decision. Create a tracking ticket for flag removal at flag creation time.
7. Implement flag evaluation in code: use SDK with local caching (no network call per evaluation), provide sensible defaults for SDK initialization failure, and log flag evaluations for debugging.
8. Plan flag removal process: remove flag check from code, remove flag from configuration, verify no references remain (grep), and deploy. Ensure removal is atomic (single PR, not split across deploys).
9. Set up flag hygiene tooling: dashboard showing all active flags with age, lint rules that warn on flags past deadline, automated Slack notifications for stale flags, and quarterly flag audit.
10. Log feature-flags invocation in AUDIT with: feature name, flag type, initial rollout percentage, cleanup deadline, targeting rules.
</process>
