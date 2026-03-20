# MindForge Enterprise Setup

## Goal
Configure Jira, Confluence, Slack, and SCM governance safely without storing
 credentials in the repository.

## Setup sequence
1. Fill non-sensitive values in
   `.mindforge/org/integrations/INTEGRATIONS-CONFIG.md`
2. Export credentials as environment variables
3. Validate connectivity through `connection-manager.md`
4. Run `/mindforge:sync-jira` and `/mindforge:sync-confluence`
5. Confirm Slack notification behaviour and undelivered-alert fallback

## Security rules
- never commit tokens
- never run credential-bearing calls with `set -x`
- never use `curl -v` with Authorization headers
- rotate credentials by updating the environment, not config files

## Supported Day 4 outputs
- Jira epics and stories for phases/plans
- Confluence architecture and ADR publishing
- Slack notifications and thread tracking
- milestone health and completion workflow
