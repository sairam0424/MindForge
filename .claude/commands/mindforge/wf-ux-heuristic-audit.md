---
description: "10 Nielsen heuristics parallel audit → severity ranking → fix brief"
---
# /mindforge:wf-ux-heuristic-audit

Runs the **UX Heuristic Audit** dynamic workflow.

## Usage
`/mindforge:wf-ux-heuristic-audit <UI codebase or app description>`

## What it does
- **Scope**: Define target UI and identify key user flows to audit
- **Audit**: 10 parallel heuristic evaluators — one per Nielsen heuristic
- **Rank**: Severity ranking of all violations by impact on user experience
- **Brief**: Prioritized fix brief with specific design recommendations

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/ux-heuristic-audit.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info ux-heuristic-audit
```
