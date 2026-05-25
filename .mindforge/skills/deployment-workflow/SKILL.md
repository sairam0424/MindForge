---
name: deployment-workflow
version: 1.0.0
min_mindforge_version: 10.0.5
status: stable
triggers: deploy, deployment, staged rollout, canary, feature flag, rollback plan, production release, release pipeline, ship to production, go live, launch pipeline, release workflow
---

# Skill — Deployment Workflow (Staged Production Release Pipeline)

## When this skill activates

When deploying code to staging or production, planning a release, setting up
feature flags, or managing rollback strategies. Use for any transition from
"code is ready" to "code is live and monitored." Covers the full lifecycle from
pre-deploy verification through post-deploy health confirmation.

Core principle: **Never deploy blind** — every release has a rollback plan,
success thresholds, and monitoring before it is considered complete.

## Mandatory actions when this skill is active

### Before deployment begins

1. **Select depth level based on risk:**

   | Level | Time | When to use | Scope |
   |-------|------|-------------|-------|
   | Quick | 5-10 min | Hotfix, docs, config | Git clean + tests only |
   | Standard | 15-30 min | Feature, refactor | Full pipeline |
   | Deep | 30-60 min | Breaking change, infra | Backup + load test + canary |

2. **Pre-deploy checklist (all levels):**
   - [ ] Working directory is clean (`git status` shows no uncommitted changes)
   - [ ] All tests pass (`npm test` / `pytest` / equivalent)
   - [ ] No lint errors or type errors
   - [ ] CHANGELOG updated with version and summary
   - [ ] Branch is rebased on latest main
   - [ ] PR approved (if applicable)

3. **Risk assessment:**
   - Does this touch auth, payments, or PII? (triggers security review)
   - Does this require a database migration? (adds rollback complexity)
   - Does this change public API contracts? (requires versioning)
   - What is the blast radius if this fails? (single user vs all users)

### During deployment

**Phase 1 — Build & Bundle:**
- Compile/transpile all source
- Run type checker (zero errors required)
- Bundle analysis: warn if any chunk exceeds 250KB
- Generate source maps for production debugging
- Tag commit with version: `git tag v[X.Y.Z]`

**Phase 2 — Staging:**
- Deploy to staging environment
- Run health check endpoint (HTTP 200 within 30s)
- Execute smoke test suite (critical paths only)
- Verify environment variables are set correctly
- Check database connectivity and migration status

**Phase 3 — Production (select strategy):**

| Strategy | Use when | Process |
|----------|----------|---------|
| Quick | Low risk, fast rollback | Deploy all at once, monitor 5 min |
| Rolling | Medium risk | Replace instances 25% at a time, 2 min between |
| Canary | High risk, new feature | 5% → 25% → 50% → 100%, monitor at each step |

**Phase 4 — Monitoring (mandatory for all strategies):**
- Watch error rates for 15 minutes post-deploy
- Compare P95 latency to pre-deploy baseline
- Check business metrics (conversion, signup, core actions)
- Verify no new error types in exception tracker

**Decision thresholds:**
```
GREEN (proceed):  Error rate < 10% above baseline
YELLOW (investigate): Error rate 10-100% above baseline
RED (rollback):   Error rate > 2x baseline OR P95 > 3x baseline
```

**Feature flag lifecycle (when applicable):**
```
DEPLOY (flag OFF) → ENABLE (team only) → CANARY (5% users) →
GRADUAL (25% → 50% → 75%) → FULL (100%) → CLEANUP (remove flag)
```

- Each stage requires minimum 1 hour soak time (24 hours for GRADUAL steps)
- Monitor flag-specific metrics at each stage
- Rollback = disable flag (instant, < 1 minute)

### After deployment

1. **Health verification:**
   - [ ] All health endpoints return 200
   - [ ] Error rate < 1% (absolute, not relative)
   - [ ] No new exception types in monitoring
   - [ ] P95 latency within acceptable range
   - [ ] Business metrics stable (no cliff)

2. **Rollback procedures (know these BEFORE deploying):**

   | Method | Time | When to use |
   |--------|------|-------------|
   | Feature flag disable | ~1 min | Flag-guarded changes |
   | Git revert + redeploy | ~5 min | Code-only changes |
   | Database rollback | ~15 min | Migration-dependent changes |

3. **Post-deploy documentation:**
   - Update DEPLOYMENT.md with:
     - Phase timestamps (start, staging, production, verified)
     - Commit hash deployed
     - Strategy used
     - Any issues encountered and resolution
     - Final status: SUCCESS / ROLLED_BACK / PARTIAL

4. **Metrics baseline:**
   - Record current performance metrics as new baseline
   - Archive previous baseline for comparison
   - Update alerting thresholds if performance improved

## Self-check before task completion

Before marking a deployment task done:

- [ ] Did I verify all pre-deploy checks pass (tests, lint, types)?
- [ ] Did I document the rollback plan BEFORE deploying?
- [ ] Did I set up monitoring and define success thresholds?
- [ ] Did I wait the minimum soak time before declaring success?
- [ ] Did I record the deployment in DEPLOYMENT.md with timestamps?
- [ ] Is the error rate below 1% post-deploy?
- [ ] Did I update the metrics baseline?
- [ ] If using feature flags: is the cleanup step scheduled?
