---
name: ci-cd-pipeline
version: 1.0.0
min_mindforge_version: 10.0.7
status: stable
triggers: ci cd pipeline, pipeline architecture, build stage design, deployment gate, artifact management, environment promotion, parallel jobs optimization, ci caching strategy, secrets in ci, ci rollback automation, github actions pipeline, pipeline stage design
---

# CI/CD Pipeline

## When this skill activates

This skill activates when designing, implementing, or optimizing continuous integration and continuous deployment pipelines. It covers pipeline architecture, stage design, quality gates, artifact management, caching, parallelism, secrets handling, environment promotion, and rollback strategies. Use this skill whenever build/test/deploy automation is being created or modified.

## Mandatory actions when this skill is active

### Before

1. **Map the current workflow** — Document the existing build, test, and deploy steps (even if manual). Understand what exists before automating.
2. **Identify bottlenecks** — Measure current CI duration. Identify the slowest stages. Optimization targets the bottleneck, not random stages.
3. **Define deployment targets** — List all environments (dev, staging, production) and their promotion requirements.
4. **Assess risk tolerance** — How much downtime is acceptable? Zero-downtime deployments require different strategies than maintenance-window deployments.

### During

#### Pipeline Stages (Lint → Build → Unit Test → Integration Test → Security Scan → Package → Deploy)

**Stage 1: Lint** — Linters + type-check first (<60s). Fail fast on errors.
**Stage 2: Build** — Compile, bundle. Environment-agnostic artifact. Target <3min with cache.
**Stage 3: Unit Tests** — Coverage reporting. Fail below 80% threshold. Target <5min.
**Stage 4: Integration Tests** — Real dependencies (testcontainers). Target <10min.
**Stage 5: Security Scan** — Dependency audit (Snyk/Trivy) + SAST + secret detection. Fail on critical/high.
**Stage 6: Package** — Create artifact (Docker image/binary). Tag with SHA + semver. Sign and push to registry.
**Stage 7: Deploy** — Dev → staging → production. Approval gate required for production.

#### Quality Gates (Between Stages)

- **Gate definition** — A gate is a pass/fail checkpoint that blocks pipeline progression.
- **Automated gates** — Test coverage threshold, zero critical vulnerabilities, all tests passing, build succeeds.
- **Manual gates** — Production approval, security review sign-off, change management ticket.
- **Gate principle** — Every gate must have a clear owner and clear criteria. Ambiguous gates become rubber stamps.
- **Implementation** — Use CI environment protection rules (GitHub Actions `environment` key with required reviewers).

#### Artifact Management

- **Immutability** — Once built, an artifact never changes. The same artifact deployed to staging is promoted to production. Never rebuild for production.
- **Versioning** — Tag every artifact with: git commit SHA (exact), semantic version (human-readable), build timestamp.
- **Retention** — Keep the last N production artifacts (minimum 5) for rollback. Auto-expire older artifacts.
- **Signing** — Sign artifacts with a known key. Verify signatures before deployment. Prevents tampered artifacts from reaching production.
- **Registry hygiene** — Clean untagged/unused images regularly. Container registries grow unbounded without garbage collection.

#### Caching Strategy

**Dependency cache:**
- Cache dependencies keyed on lockfile hash. Invalidate only when dependencies change.
- Use fallback keys for partial cache hits (restore previous deps, update delta only).

**Build cache:**
- Cache compilation outputs (TypeScript tsbuildinfo, Go build cache, Docker layer cache).
- For Docker: order Dockerfile instructions from least-changing (base image) to most-changing (source code).
- Cache test results for unchanged code paths (only re-run tests for changed files in PR pipelines).

**Cache invalidation:**
- Key on content hashes, not timestamps. Content-addressed caching prevents stale cache bugs.
- Set TTL: dependency caches (7 days), build caches (1 day), test caches (1 day).
- Monitor cache hit rates. Below 60% means the cache key strategy needs adjustment.

#### Parallelism and Optimization

- **Independent jobs run simultaneously** — Lint, unit tests, and security scan can all run in parallel if they don't depend on each other.
- **Matrix builds** — Test across multiple versions/platforms simultaneously (node 18/20/22, ubuntu/macos).
- **Test splitting** — Distribute test files across N parallel runners based on historical timing data.
- **Fail-fast** — Cancel remaining matrix jobs when one fails (unless full compatibility reporting needed).
- **Resource optimization** — Smaller runners for lint/test, larger for build/package.

#### Secrets Management in CI

- **Never in code** — Secrets never appear in source code, Dockerfiles, or CI configuration files.
- **CI secret stores** — Use platform-native secret management (GitHub Secrets, GitLab CI Variables, AWS Secrets Manager).
- **Least privilege** — Each job gets only the secrets it needs. Never share production secrets with lint.
- **Rotation and audit** — Rotate quarterly minimum. Log all secret access. Verify masking in logs (`***`).

#### Environment Promotion (Dev → Staging → Production)

- **Same artifact** — The exact same build artifact moves through environments. Only configuration (env vars, feature flags) changes.
- **Progressive rollout** — Production deploys should use: canary (1% traffic) → partial (10%) → full (100%).
- **Smoke tests** — After each deployment, run a minimal health check. Automatic rollback if smoke tests fail.
- **Feature flags** — Decouple deployment from release. Deploy code to production with flags off. Enable gradually.
- **Environment parity** — Staging must mirror production as closely as possible: same infrastructure, same data shape (anonymized), same configuration.

#### Rollback Strategy

- **Keep N previous artifacts** — Retain last 5 production artifacts for instant rollback.
- **One-click revert** — Single action (button/CLI), not a multi-step process.
- **Rollback testing** — Test quarterly. Untested rollbacks fail when needed most.
- **Database compatibility** — Expand/contract pattern: (1) add new column, (2) deploy new code, (3) remove old column after rollback window.
- **Auto-rollback triggers** — Error rate >5%, latency p99 >2x baseline, or 3 consecutive health check failures.

### After

1. **Measure pipeline duration** — Track total time from commit to production. Target: <15 minutes for simple services, <30 minutes for complex ones.
2. **Monitor reliability** — Track pipeline success rate. Target: >95%. Flaky pipelines erode developer trust.
3. **Review cost** — Audit CI compute costs monthly. Identify waste: unnecessary matrix builds, oversized runners, uncached builds.
4. **Test the rollback** — Perform a planned rollback quarterly to verify the procedure works.

## Self-check before task completion

- [ ] Pipeline stages follow the standard flow: Lint → Build → Test → Scan → Package → Deploy
- [ ] Quality gates exist between stages with clear pass/fail criteria
- [ ] Artifacts are immutable, versioned (commit SHA + semver), and signed
- [ ] Caching is configured for dependencies, builds, and Docker layers with content-based keys
- [ ] Independent jobs run in parallel (lint, unit tests, security scan)
- [ ] Secrets are stored in CI secret store with least-privilege access per job
- [ ] Same artifact promotes through environments (never rebuild for production)
- [ ] Rollback procedure is documented, automated, and tested
- [ ] Database migrations are backward-compatible (expand/contract pattern)
- [ ] Pipeline duration is measured and within acceptable bounds
- [ ] Pipeline success rate is tracked (target >95%)
