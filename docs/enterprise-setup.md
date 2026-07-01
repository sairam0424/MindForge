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

## Supported outputs
- Jira epics and stories for phases/plans
- Confluence architecture and ADR publishing
- Slack notifications and thread tracking
- milestone health and completion workflow

## Mesh Node Identity
Set `mesh.node_id` in `.mindforge/config.json` to a unique string per deployment node. The default value `"auto"` is used if not customized, but multi-node deployments must assign explicit unique IDs to avoid identity collisions. Example: `"node_id": "prod-us-east-1-node-01"`

## v11.8.3 Enterprise Notes

### Mesh Node Identity
Set `mesh.node_id` in `.mindforge/config.json` to a unique string per deployment node.
The default `"auto"` derives from hostname — suitable for single-node deployments.
Multi-node deployments **must** set explicit unique IDs to avoid routing collisions:
```json
{
  "mesh": {
    "node_id": "prod-us-east-1-node-01",
    "peers": ["prod-us-east-1-node-02", "prod-eu-west-1-node-01"]
  }
}
```

### SRE Simulation Gate
`simulateShadowWave()` requires `MINDFORGE_SRE_SIMULATE=true` env flag in v11.8.3.
For production metric collection, implement real SLI collection from `/api/v1/system` endpoint.
```bash
MINDFORGE_SRE_SIMULATE=true node bin/mindforge-cli.js headless  # enable simulation
```

### Tier-3 Trust Posture
Tier-3 ZTAI trust uses in-process key simulation in v11.8.3 (`SECURITY_TIER_3_SIMULATED = true`).
Hardware TPM/HSM provider is planned for v12.x.
Set `experimental.pqc_demo = false` (default) for standard enterprise deployments.

### Skill Routing (v11.8.3)
All 232 engine-tier skills now have unique trigger strings — no routing ambiguity.
12 duplicate trigger strings were resolved in v11.8.3.
Verify skill routing determinism: `node tests/skills-platform.test.js` (1652/1652 assertions).

### Version Verification
```bash
node bin/mindforge-cli.js --version    # 11.8.3
node bin/mindforge-cli.js health       # all green
npm audit --audit-level=high           # 0 vulnerabilities
npm test                               # 95/97 passing, 0 failures
```
