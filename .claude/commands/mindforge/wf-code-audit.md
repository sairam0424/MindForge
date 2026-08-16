---
description: "Parallel security + quality + performance audit with adversarial finding verification"
---
# /mindforge:wf-code-audit

Runs the **Code Audit** dynamic workflow.

## Usage
`/mindforge:wf-code-audit [path or 'current git diff']`

## What it does
- **Scope**: Builds file list from git diff, specified path, or entire codebase
- **Audit**: 3 parallel auditors — OWASP security, code quality, performance patterns
- **Verify**: Adversarial 2-vote verification for all high/critical severity findings
- **Report**: Risk-ranked report with remediation steps for each confirmed finding

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/code-audit.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info code-audit
```
