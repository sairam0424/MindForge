---
description: "Parallel investigation across logs, metrics, traces, and code → mitigation → RCA → postmortem"
---
# /mindforge:wf-incident-response

Runs the **Incident Response** dynamic workflow.

## Usage
`/mindforge:wf-incident-response <incident description and symptoms>`

## What it does
- **Alert**: Characterizes severity (P0-P3), affected systems, and initial hypothesis
- **Investigate**: 4 parallel agents — logs, metrics, distributed traces, recent code changes
- **Mitigate**: Identifies immediate mitigation steps with risk level and rollback procedures
- **RCA**: Blameless postmortem with root cause, timeline, action items, lessons learned

## Running

Invoke via Claude Code's Workflow tool:

```
Workflow({
  scriptPath: ".mindforge/dynamic-workflows/scripts/incident-response.js",
  args: "<your input>"
})
```

Or discover via CLI:
```bash
node bin/mindforge-cli.js workflow info incident-response
```
