# MindForge — GitHub Integration

## Purpose
Strengthen shipping with PR templates, reviewer assignment guidance, branch
 protection awareness, and release metadata checks.

## API policy
Use GitHub REST API v3 for all required operations. GraphQL is optional for
 advanced queries only and is not required for Day 4.

## Pre-flight checks

1. Verify the branch has at least one commit ahead of base:
   `git log origin/${GITHUB_DEFAULT_BRANCH}..HEAD --oneline | wc -l`
2. Query branch protection:
   `GET /repos/{owner}/{repo}/branches/{branch}/protection`
3. Treat HTTP 404 from the protection endpoint as `no branch protection
   configured`, not as a connection failure.

If there are zero commits ahead of base, do not attempt PR creation.

## PR creation guidance
Use `.github/pull_request_template.md` when present, assign default reviewers
 from config, and ensure the PR body links verification artifacts and the
 relevant phase or milestone documents.
