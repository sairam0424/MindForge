---
description: "5-angle OWASP parallel scout → 3-vote adversarial verification → threat model + remediation roadmap"
---
# /mindforge:wf-security-hardening

Runs the **Security Hardening** dynamic workflow.

## Usage
`/mindforge:wf-security-hardening <target or question>`

## What it does
- **Scope**: Define attack surface and target context
- **Scout**: 5 parallel OWASP/CWE dimension scouts
- **Verify**: 3-vote adversarial verification per critical finding
- **ThreatModel**: STRIDE threat model from confirmed findings
- **Roadmap**: Prioritized remediation roadmap with severity/effort matrix

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/security-hardening.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info security-hardening
```
