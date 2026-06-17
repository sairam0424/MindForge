---
description: "Create or update a milestone definition in .planning/milestones/ and track the"
---

Create or update a milestone definition in `.planning/milestones/` and track the
 health of grouped phases. Usage: `/mindforge:milestone <name> [phase list]`

## Outputs
- milestone document with included phases
- health summary (on track, at risk, blocked)
- linked approvals, blockers, and verification status

## Health rules
- any blocked phase makes the milestone at risk
- missing verification keeps milestone status yellow
- completed verified phases count toward release readiness
