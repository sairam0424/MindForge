---
description: "Design CI/CD pipeline architecture. Usage: /mindforge:pipeline [--platform github|gitlab|jenkins] [--stages N]"
---

<objective>
Design a comprehensive CI/CD pipeline architecture with quality gates, caching, secret management, parallelism, environment promotion, and rollback mechanisms.
</objective>

<execution_context>
@.mindforge/skills/ci-cd-pipeline/SKILL.md
</execution_context>

<context>
Arguments: $ARGUMENTS (optional --platform github|gitlab|jenkins, optional --stages N for stage count)
Knowledge: Current repository structure, existing CI configuration, deployment targets, test suite characteristics.
</context>

<process>
1. **Define stages**: Design the pipeline stages in order:
   - **Lint**: Static analysis, formatting check, type-check (parallel)
   - **Build**: Compile, bundle, generate artifacts
   - **Test**: Unit tests, integration tests, contract tests (parallel by suite)
   - **Scan**: Security scan (SAST, dependency audit, secret detection)
   - **Package**: Container build, artifact versioning, manifest generation
   - **Deploy**: Environment promotion (dev → staging → production)
   - Each stage has clear entry/exit criteria (quality gates)

2. **Add quality gates**: Define pass/fail criteria per stage:
   - Lint: zero errors (warnings allowed with suppression comments)
   - Build: successful compilation, artifact size within budget
   - Test: 100% pass rate, coverage >= threshold (80% default)
   - Scan: zero critical/high vulnerabilities, no leaked secrets
   - Package: image builds successfully, passes container scan
   - Deploy: health check passes within 60s, no error spike in 5min
   - Gate failure blocks pipeline progression (no manual override without approval)

3. **Configure caching**: Optimize pipeline speed:
   - Dependencies: cache node_modules/pip/cargo by lockfile hash
   - Build artifacts: cache intermediate compilation outputs
   - Docker layers: cache base layers, invalidate on Dockerfile change
   - Test results: cache unchanged test file results (incremental testing)
   - Cache key strategy: OS + lockfile hash + branch (with fallback to main)
   - Cache TTL: 7 days for dependencies, 1 day for build artifacts

4. **Manage secrets**: Secure credential handling:
   - Environment-specific secrets (dev, staging, prod) in vault/secrets manager
   - Short-lived tokens for deployment (OIDC where possible)
   - No secrets in pipeline YAML (reference by name only)
   - Secret rotation: automated rotation with zero-downtime
   - Audit log: track which pipeline accessed which secret
   - Least privilege: each stage only accesses secrets it needs

5. **Enable parallelism**: Maximize pipeline throughput:
   - Independent stages run in parallel (lint + type-check + unit-test)
   - Test suite splitting by file/timing data across N runners
   - Matrix builds for multi-platform/multi-version testing
   - Fan-out/fan-in for independent service deployments
   - Resource constraints: limit concurrent deployments to prevent thundering herd
   - Estimated total pipeline time: < 10 minutes for PR, < 20 minutes for deploy

6. **Set up environment promotion**: Define the deployment ladder:
   - Dev: auto-deploy on push to feature branch (ephemeral environments)
   - Staging: auto-deploy on merge to main (persistent, production-mirror)
   - Production: manual approval gate or automated canary with auto-promote
   - Promotion criteria: all tests pass + no new alerts + stakeholder approval
   - Environment parity: same container, same config structure, different values
   - Feature flags: decouple deploy from release (dark launches)

7. **Add rollback mechanism**: Design recovery paths:
   - Automated rollback: revert to last-known-good on health check failure
   - Manual rollback: one-click revert in CI UI with confirmation
   - Database rollback: backward-compatible migrations only (expand-contract)
   - Canary rollback: automatic if error rate exceeds baseline by 2x
   - Rollback verification: post-rollback health check confirms recovery
   - Incident tracking: auto-create incident ticket on rollback trigger

8. **Output pipeline specification**: Deliver:
   - Pipeline YAML/configuration for the target platform
   - Stage dependency graph (DAG visualization)
   - Timing estimates per stage
   - Secret inventory and access matrix
   - Rollback runbook
   - Cost estimate (runner minutes per PR and per deploy)
</process>
