---
description: "WCAG 2.2 parallel per-criterion audit → 3-vote adversarial verify failures → remediation spec"
---
# /mindforge:wf-accessibility-audit

Runs the **Accessibility Audit** dynamic workflow.

## Usage
`/mindforge:wf-accessibility-audit <UI codebase path or component>`

## What it does
- **Scope**: Define target UI and map components/pages to audit
- **Audit**: 6 parallel WCAG principle auditors (Perceivable/Operable/Understandable/Robust + ARIA + Keyboard)
- **Verify**: 3-vote adversarial verification of all Level A and AA failures
- **Spec**: Remediation spec with exact ARIA attributes, HTML fixes, and WCAG references

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/accessibility-audit.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info accessibility-audit
```
