---
description: "Asset inventory → STRIDE threat enumeration → parallel mitigations → CVSS-style score matrix"
---
# /mindforge:wf-security-threat-model

Runs the **Security Threat Model** dynamic workflow.

## Usage
`/mindforge:wf-security-threat-model <system or codebase to threat model>`

## What it does
- **Assets**: Inventory system assets, data flows, and trust boundaries
- **STRIDE**: 6 parallel STRIDE threat agents — one per threat category
- **Mitigate**: Parallel mitigation agent per identified threat
- **Score**: CVSS-style risk score matrix with remediation priority

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/security-threat-model.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info security-threat-model
```
