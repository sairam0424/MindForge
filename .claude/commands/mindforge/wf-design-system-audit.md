---
description: "5 parallel dimension auditors (spacing/color/typography/icons/a11y) → consistency score"
---
# /mindforge:wf-design-system-audit

Runs the **Design System Audit** dynamic workflow.

## Usage
`/mindforge:wf-design-system-audit <frontend codebase or design system path>`

## What it does
- **Inventory**: Discover design tokens, component files, and styling approach
- **Audit**: 5 parallel dimension auditors: spacing, color, typography, icons, accessibility
- **Score**: Aggregate consistency scores per dimension and overall
- **Report**: Design system health report with specific violation fixes

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/design-system-audit.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info design-system-audit
```
