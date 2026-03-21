# MindForge CI/CD Integration

## Overview
MindForge supports non-interactive CI mode for GitHub Actions, GitLab CI, and Jenkins.
CI mode activates when `CI=true` or `MINDFORGE_CI=true`.

## GitHub Actions
Use `.github/workflows/mindforge-ci.yml` for:
- Health checks
- Security scanning
- Quality gates
- AI PR review (if `ANTHROPIC_API_KEY` is set)

## GitLab CI
Use `.gitlab-ci-mindforge.yml` as a template. Ensure CI variables include:
- `ANTHROPIC_API_KEY`
- `GITHUB_TOKEN` (optional)
- `SLACK_BOT_TOKEN` (optional)

## Jenkins
Use `.mindforge/ci/jenkins-adapter.md` for a Jenkinsfile template.

## Governance in CI
- Tier 1 auto-approves.
- Tier 2 auto-approves only if `CI_AUTO_APPROVE_TIER2=true`.
- Tier 3 always blocks CI and requires human approval.

## Timeouts
Timeouts are soft stops (exit code 0). MindForge saves state to `HANDOFF.json` and
prints a summary in the CI step output.
