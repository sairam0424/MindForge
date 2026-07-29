---
description: "Schema diff → risk analysis → migration scripts → rollback plan"
---
# /mindforge:wf-database-migration

Runs the **Database Migration** dynamic workflow.

## Usage
`/mindforge:wf-database-migration <migration files or schema diff path>`

## What it does
- **SchemaDiff**: Parse current and target schema, compute structural diff
- **RiskAnalysis**: Assess data loss risk, locking impact, and rollback complexity
- **Scripts**: Generate forward migration + rollback scripts
- **Runbook**: Step-by-step production runbook with verification checks

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/database-migration.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info database-migration
```
